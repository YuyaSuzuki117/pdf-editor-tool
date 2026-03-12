# PDF Editor Tool

Dragon Quest themed PDF editor built with Next.js, `pdfjs-dist`, and `pdf-lib`.

## Requirements

- Node.js `>=20.9.0`
- npm

Current local baseline on this machine: Node `v22.17.0`.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run verify
```

`npm run verify` runs lint, typecheck, and build in sequence.

## Project Map

- `src/app/page.tsx`: app shell, keyboard shortcuts, clipboard paste, panel wiring
- `src/components/pdf-viewer.tsx`: PDF rendering, tap events, overlay annotations
- `src/components/save-panel.tsx`: export flow and viewport-to-PDF coordinate conversion
- `src/components/page-manager.tsx`: rotate, delete, reorder, duplicate, merge, split
- `src/contexts/pdf-context.tsx`: shared state plus undo/redo
- `src/lib/pdf-editor.ts`: low-level PDF writes with `pdf-lib`
- `src/lib/pdf-engine.ts`: document loading and raster rendering with `pdfjs-dist`
- `src/types/pdf.ts`: source of truth for tool and annotation contracts

## Working Rules

- UI page numbers are 1-based. Convert to 0-based only when calling low-level PDF APIs.
- Annotation positions are stored in rendered viewport space. Preserve `renderScale` and divide by it before exporting back into the PDF.
- Route annotation edits through reducer actions so undo/redo stays coherent.
- After mutating PDF bytes, dispatch `UPDATE_PDF_DATA` and re-check page count and current page behavior.

## Smoke Check

Use `test.pdf` or `test-e2e.pdf`.

1. Open a PDF.
2. Add text, drawing, highlight, and image or stamp annotations.
3. Use undo and redo.
4. Save as PDF.
5. If page operations changed, also rotate, duplicate, delete, or reorder a page.

## Codex Setup

This repo now includes:

- repo instructions in `AGENTS.md`
- project skill `pdf-editor-nextjs`
- shared skills for PDF work, Playwright verification, and security review
- configured MCP entries for Playwright, Vercel, and repo filesystem access

Restart Codex after skill changes so new skills appear in-session.
