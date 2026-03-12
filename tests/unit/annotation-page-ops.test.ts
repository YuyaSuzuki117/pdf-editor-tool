import { describe, expect, it } from 'vitest';
import {
  getPageNumberAfterReorder,
  rebaseAnnotationsAfterDelete,
  rebaseAnnotationsAfterDuplicate,
  rebaseAnnotationsAfterInsertBlank,
  rebaseAnnotationsAfterReorder,
  rebaseAnnotationsAfterRotate,
} from '@/lib/annotation-page-ops';
import type { Annotation } from '@/types/pdf';

function makeAnnotation(id: string, page: number, content = id): Annotation {
  return {
    id,
    type: 'text',
    page,
    position: { x: page * 10, y: page * 20 },
    content,
    style: { fontSize: 16, color: '#000000' },
    createdAt: page,
  };
}

describe('annotation page operations', () => {
  it('shifts later annotations down after delete', () => {
    const annotations = [makeAnnotation('a', 1), makeAnnotation('b', 2), makeAnnotation('c', 4)];

    expect(rebaseAnnotationsAfterDelete(annotations, 2)).toEqual([
      makeAnnotation('a', 1),
      { ...makeAnnotation('c', 4), page: 3 },
    ]);
  });

  it('shifts later annotations up after blank page insertion', () => {
    const annotations = [makeAnnotation('a', 1), makeAnnotation('b', 2), makeAnnotation('c', 4)];

    expect(rebaseAnnotationsAfterInsertBlank(annotations, 3).map((annotation) => annotation.page)).toEqual([1, 2, 5]);
  });

  it('duplicates annotations onto the duplicated page and shifts later pages', () => {
    const annotations = [makeAnnotation('a', 1), makeAnnotation('b', 2), makeAnnotation('c', 3)];

    const result = rebaseAnnotationsAfterDuplicate(annotations, 2);

    expect(result.map((annotation) => annotation.page).sort((left, right) => left - right)).toEqual([1, 2, 3, 4]);
    expect(result.find((annotation) => annotation.page === 3 && annotation.content === 'b')).toBeTruthy();
    expect(result.find((annotation) => annotation.page === 3 && annotation.content === 'b')?.id).not.toBe('b');
    expect(result.find((annotation) => annotation.id === 'c')?.page).toBe(4);
  });

  it('maps current page and annotations to the new order', () => {
    const newOrder = [0, 2, 1, 3];
    const annotations = [makeAnnotation('a', 1), makeAnnotation('b', 2), makeAnnotation('c', 3)];

    expect(getPageNumberAfterReorder(2, newOrder)).toBe(3);
    expect(rebaseAnnotationsAfterReorder(annotations, newOrder).map((annotation) => annotation.page)).toEqual([1, 3, 2]);
  });

  it('rotates text and highlight annotations with the page size', () => {
    const annotations: Annotation[] = [
      makeAnnotation('text', 2),
      {
        id: 'highlight',
        type: 'highlight',
        page: 2,
        position: { x: 10, y: 20 },
        content: '',
        style: { color: '#ffff00', opacity: 0.4, width: 30, height: 40 },
        createdAt: 2,
      },
    ];

    const rotated = rebaseAnnotationsAfterRotate(annotations, 2, { width: 100, height: 200 });

    expect(rotated[0]?.position).toEqual({ x: 160, y: 20 });
    expect(rotated[1]?.position).toEqual({ x: 140, y: 10 });
    expect(rotated[1]?.style).toMatchObject({ width: 40, height: 30 });
  });

  it('rotates draw paths and shape endpoints', () => {
    const annotations: Annotation[] = [
      {
        id: 'draw',
        type: 'draw',
        page: 1,
        position: { x: 0, y: 0 },
        content: 'M10,20L30,40',
        style: { strokeColor: '#000000', strokeWidth: 2 },
        createdAt: 1,
      },
      {
        id: 'shape',
        type: 'shape',
        page: 1,
        position: { x: 10, y: 20 },
        content: JSON.stringify({ shapeType: 'line', x1: 10, y1: 20, x2: 30, y2: 40 }),
        style: { shapeType: 'line', strokeColor: '#000000', strokeWidth: 2 },
        createdAt: 2,
      },
    ];

    const rotated = rebaseAnnotationsAfterRotate(annotations, 1, { width: 100, height: 200 });

    expect(rotated[0]?.content).toBe('M180,10L160,30');
    expect(rotated[1]?.content).toBe(JSON.stringify({ shapeType: 'line', x1: 180, y1: 10, x2: 160, y2: 30 }));
    expect(rotated[1]?.position).toEqual({ x: 160, y: 10 });
  });

  it('respects each annotation render scale when rotating', () => {
    const scaledAnnotation: Annotation = {
      ...makeAnnotation('scaled', 1),
      renderScale: 2,
      position: { x: 20, y: 40 },
    };

    const [rotated] = rebaseAnnotationsAfterRotate([scaledAnnotation], 1, { width: 100, height: 200 });

    expect(rotated?.position).toEqual({ x: 360, y: 20 });
  });
});
