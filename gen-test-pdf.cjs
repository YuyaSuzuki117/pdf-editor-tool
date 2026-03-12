/* eslint-disable @typescript-eslint/no-require-imports */
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
(async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Test PDF Document', { x: 50, y: 750, size: 24, font, color: rgb(0,0,0) });
  page.drawText('This is a test page for the PDF editor.', { x: 50, y: 700, size: 14, font, color: rgb(0.3,0.3,0.3) });
  page.drawRectangle({ x: 50, y: 400, width: 200, height: 100, color: rgb(0.9, 0.9, 1) });
  const bytes = await doc.save();
  require('fs').writeFileSync('test.pdf', bytes);
  console.log('Created test.pdf');
})();
