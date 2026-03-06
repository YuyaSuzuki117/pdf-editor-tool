import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

export async function addTextToPdf(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  text: string,
  position: { x: number; y: number },
  fontSize: number = 16,
  color: string = '#000000'
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPages()[pageIndex];
  const { height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  page.drawText(text, {
    x: position.x,
    y: height - position.y - fontSize,
    size: fontSize,
    font,
    color: hexToRgb(color),
  });

  return doc.save();
}

export async function addImageToPdf(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  imageBytes: Uint8Array,
  position: { x: number; y: number },
  size: { width: number; height: number }
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPages()[pageIndex];
  const { height } = page.getSize();

  let image;
  try {
    image = await doc.embedPng(imageBytes);
  } catch {
    image = await doc.embedJpg(imageBytes);
  }

  page.drawImage(image, {
    x: position.x,
    y: height - position.y - size.height,
    width: size.width,
    height: size.height,
  });

  return doc.save();
}

export async function rotatePage(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  rotation: number = 90
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPages()[pageIndex];
  const current = page.getRotation().angle;
  page.setRotation(degrees(current + rotation));
  return doc.save();
}

export async function deletePage(
  pdfBytes: ArrayBuffer,
  pageIndex: number
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  if (doc.getPageCount() <= 1) {
    throw new Error('最後のページは削除できません');
  }
  doc.removePage(pageIndex);
  return doc.save();
}

export async function mergePdfs(
  pdfBytesArray: ArrayBuffer[]
): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const bytes of pdfBytesArray) {
    const donor = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(donor, donor.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return merged.save();
}

export async function addDrawingToPdf(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  svgPath: string,
  color: string = '#000000',
  strokeWidth: number = 2
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPages()[pageIndex];
  const { height } = page.getSize();

  const points = svgPath.split(/[ML]/).filter(Boolean).map((p) => {
    const [x, y] = p.trim().split(',').map(Number);
    return { x, y: height - y };
  });

  for (let i = 1; i < points.length; i++) {
    page.drawLine({
      start: points[i - 1],
      end: points[i],
      thickness: strokeWidth,
      color: hexToRgb(color),
    });
  }

  return doc.save();
}

export async function addHighlightToPdf(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  position: { x: number; y: number },
  size: { width: number; height: number },
  color: string = '#ffff00',
  opacity: number = 0.35
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPages()[pageIndex];
  const { height } = page.getSize();

  page.drawRectangle({
    x: position.x,
    y: height - position.y - size.height,
    width: size.width,
    height: size.height,
    color: hexToRgb(color),
    opacity,
  });

  return doc.save();
}

export function savePdfAsBlob(pdfBytes: Uint8Array): Blob {
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
