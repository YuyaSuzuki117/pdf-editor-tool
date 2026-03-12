import type { Annotation } from '@/types/pdf';

export interface PageMetrics {
  height: number;
  width: number;
}

function cloneAnnotation(annotation: Annotation, page: number, index: number): Annotation {
  return {
    ...annotation,
    id: crypto.randomUUID(),
    page,
    createdAt: Date.now() + index,
  };
}

export function getPageNumberAfterReorder(page: number, newOrder: number[]): number {
  const oldIndex = page - 1;
  const newIndex = newOrder.findIndex((candidate) => candidate === oldIndex);
  return newIndex >= 0 ? newIndex + 1 : page;
}

export function rebaseAnnotationsAfterDelete(annotations: Annotation[], deletedPage: number): Annotation[] {
  return annotations
    .filter((annotation) => annotation.page !== deletedPage)
    .map((annotation) =>
      annotation.page > deletedPage
        ? { ...annotation, page: annotation.page - 1 }
        : annotation
    );
}

function normalizePageNumbers(pageNumbers: number[], totalPages?: number): number[] {
  return [...new Set(pageNumbers)]
    .filter((pageNumber) => Number.isInteger(pageNumber))
    .filter((pageNumber) => pageNumber >= 1)
    .filter((pageNumber) => totalPages === undefined || pageNumber <= totalPages)
    .sort((left, right) => left - right);
}

export function rebaseAnnotationsAfterDeleteMany(annotations: Annotation[], deletedPages: number[]): Annotation[] {
  return normalizePageNumbers(deletedPages)
    .sort((left, right) => right - left)
    .reduce(
      (currentAnnotations, deletedPage) => rebaseAnnotationsAfterDelete(currentAnnotations, deletedPage),
      annotations,
    );
}

export function getCurrentPageAfterDeleteMany(currentPage: number, totalPages: number, deletedPages: number[]): number {
  const normalizedDeletedPages = normalizePageNumbers(deletedPages, totalPages);
  if (normalizedDeletedPages.length === 0) return currentPage;

  const deletedSet = new Set(normalizedDeletedPages);
  const remainingPages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((pageNumber) => !deletedSet.has(pageNumber));

  if (remainingPages.length === 0) return 1;

  const fallbackOriginalPage =
    remainingPages.find((pageNumber) => pageNumber >= currentPage)
    ?? remainingPages[remainingPages.length - 1];

  return remainingPages.indexOf(fallbackOriginalPage) + 1;
}

export function rebaseAnnotationsAfterInsertBlank(annotations: Annotation[], insertedPage: number): Annotation[] {
  return annotations.map((annotation) =>
    annotation.page >= insertedPage
      ? { ...annotation, page: annotation.page + 1 }
      : annotation
  );
}

export function rebaseAnnotationsAfterDuplicate(annotations: Annotation[], duplicatedPage: number): Annotation[] {
  const duplicated = annotations
    .filter((annotation) => annotation.page === duplicatedPage)
    .map((annotation, index) => cloneAnnotation(annotation, duplicatedPage + 1, index));

  const shifted = annotations.map((annotation) =>
    annotation.page > duplicatedPage
      ? { ...annotation, page: annotation.page + 1 }
      : annotation
  );

  return [...shifted, ...duplicated];
}

export function rebaseAnnotationsAfterReorder(annotations: Annotation[], newOrder: number[]): Annotation[] {
  return annotations.map((annotation) => ({
    ...annotation,
    page: getPageNumberAfterReorder(annotation.page, newOrder),
  }));
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function rotatePointClockwise(point: { x: number; y: number }, pageMetrics: PageMetrics): { x: number; y: number } {
  return {
    x: roundCoordinate(pageMetrics.height - point.y),
    y: roundCoordinate(point.x),
  };
}

function rotateBoxClockwise(
  position: { x: number; y: number },
  size: { width: number; height: number },
  pageMetrics: PageMetrics,
): { position: { x: number; y: number }; size: { width: number; height: number } } {
  const corners = [
    { x: position.x, y: position.y },
    { x: position.x + size.width, y: position.y },
    { x: position.x, y: position.y + size.height },
    { x: position.x + size.width, y: position.y + size.height },
  ].map((point) => rotatePointClockwise(point, pageMetrics));

  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    position: { x: minX, y: minY },
    size: { width: roundCoordinate(maxX - minX), height: roundCoordinate(maxY - minY) },
  };
}

function rotateDrawPathClockwise(content: string, pageMetrics: PageMetrics): string {
  const segments = Array.from(content.matchAll(/([ML])([\d.]+),([\d.]+)/g));
  if (segments.length === 0) return content;

  return segments
    .map(([, command, x, y]) => {
      const rotated = rotatePointClockwise({ x: parseFloat(x), y: parseFloat(y) }, pageMetrics);
      return `${command}${rotated.x},${rotated.y}`;
    })
    .join('');
}

function rotateShapeContentClockwise(content: string, pageMetrics: PageMetrics): string {
  try {
    const shapeData = JSON.parse(content) as {
      fillColor?: string;
      filled?: boolean;
      shapeType: string;
      x1: number;
      x2: number;
      y1: number;
      y2: number;
    };
    const start = rotatePointClockwise({ x: shapeData.x1, y: shapeData.y1 }, pageMetrics);
    const end = rotatePointClockwise({ x: shapeData.x2, y: shapeData.y2 }, pageMetrics);

    return JSON.stringify({
      ...shapeData,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
    });
  } catch {
    return content;
  }
}

function scalePageMetrics(pageMetrics: PageMetrics, renderScale: number): PageMetrics {
  return {
    width: pageMetrics.width * renderScale,
    height: pageMetrics.height * renderScale,
  };
}

export function rebaseAnnotationsAfterRotate(
  annotations: Annotation[],
  rotatedPage: number,
  pageMetrics: PageMetrics,
): Annotation[] {
  return annotations.map((annotation) => {
    if (annotation.page !== rotatedPage) return annotation;

    const scaledPageMetrics = scalePageMetrics(pageMetrics, annotation.renderScale || 1);

    switch (annotation.type) {
      case 'draw':
        return {
          ...annotation,
          content: rotateDrawPathClockwise(annotation.content, scaledPageMetrics),
        };
      case 'highlight': {
        const style = annotation.style as Record<string, string | number | boolean | undefined>;
        const rotated = rotateBoxClockwise(
          annotation.position,
          {
            width: Number(style.width || 0),
            height: Number(style.height || 0),
          },
          scaledPageMetrics,
        );

        return {
          ...annotation,
          position: rotated.position,
          style: {
            ...style,
            width: rotated.size.width,
            height: rotated.size.height,
          },
        };
      }
      case 'image': {
        const style = annotation.style as Record<string, string | number | boolean | undefined>;
        const rotated = rotateBoxClockwise(
          annotation.position,
          {
            width: Number(style.width || 150),
            height: Number(style.height || 150),
          },
          scaledPageMetrics,
        );

        return {
          ...annotation,
          position: rotated.position,
          style: {
            ...style,
            width: rotated.size.width,
            height: rotated.size.height,
          },
        };
      }
      case 'shape': {
        const rotatedContent = rotateShapeContentClockwise(annotation.content, scaledPageMetrics);
        try {
          const shapeData = JSON.parse(rotatedContent) as { x1: number; x2: number; y1: number; y2: number };
          return {
            ...annotation,
            position: {
              x: Math.min(shapeData.x1, shapeData.x2),
              y: Math.min(shapeData.y1, shapeData.y2),
            },
            content: rotatedContent,
          };
        } catch {
          return {
            ...annotation,
            content: rotatedContent,
          };
        }
      }
      case 'text':
      case 'note':
      default:
        return {
          ...annotation,
          position: rotatePointClockwise(annotation.position, scaledPageMetrics),
        };
    }
  });
}
