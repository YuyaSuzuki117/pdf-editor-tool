import { getPageInfo, loadDocumentFromBytes } from '@/lib/pdf-engine';
import { rotatePage } from '@/lib/pdf-editor';
import { rebaseAnnotationsAfterRotate } from '@/lib/annotation-page-ops';
import type { Annotation } from '@/types/pdf';

export async function rotatePageWithAnnotations(
  pdfData: ArrayBuffer,
  pageIndex: number,
  annotations: Annotation[],
): Promise<{ annotations: Annotation[]; pdfData: ArrayBuffer }> {
  const doc = await loadDocumentFromBytes(pdfData);

  try {
    const pageMetrics = await getPageInfo(doc, pageIndex + 1);
    const rotatedBytes = await rotatePage(pdfData, pageIndex);

    return {
      pdfData: rotatedBytes.buffer as ArrayBuffer,
      annotations: rebaseAnnotationsAfterRotate(annotations, pageIndex + 1, pageMetrics),
    };
  } finally {
    doc.destroy();
  }
}
