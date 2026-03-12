import type { Annotation } from '@/types/pdf';

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
