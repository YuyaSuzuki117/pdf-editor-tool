import { describe, expect, it } from 'vitest';
import {
  getPageNumberAfterReorder,
  rebaseAnnotationsAfterDelete,
  rebaseAnnotationsAfterDuplicate,
  rebaseAnnotationsAfterInsertBlank,
  rebaseAnnotationsAfterReorder,
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
});
