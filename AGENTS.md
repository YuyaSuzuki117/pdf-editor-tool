# pdf-editor-tool

## Scope

This repository is a Next.js 16 / React 19 PDF editor with a Dragon Quest themed UI. Keep the current visual direction and interaction tone; do not flatten it into generic SaaS styling.

## Skills

Use these when they match the task:

- `pdf-editor-tool-workflow` for work in this repository after Codex is restarted.
- `frontend-design` and `baseline-ui` for visible UI changes.
- `fixing-accessibility`, `fixing-metadata`, and `fixing-motion-performance` for those targeted fixes.
- `pdf`, `playwright`, `screenshot`, `doc`, and `vercel-deploy` are installed globally and should be preferred after Codex is restarted.

## Working Agreement

- Start from `src/app/page.tsx`, `src/contexts/pdf-context.tsx`, and the nearest `src/lib/*` or `src/components/*` file before editing.
- Keep `src/lib/pdf-engine.ts`, `src/contexts/pdf-context.tsx`, and `src/lib/pdf-editor.ts` consistent when changing viewer, annotation, or save behavior.
- Use `npm run lint` and `npm run build` as the baseline checks.
- Keep `npm run lint`, `npm run typecheck`, and `npm run build` green after changes.
- Use Playwright MCP for UI or interaction changes and validate with `test.pdf` or `test-e2e.pdf`.
- Preserve PWA behavior across `src/app/layout.tsx`, `src/app/manifest.ts`, `public/sw.js`, and `next.config.ts`.
- Vercel MCP is configured globally but still needs login before deployment or project-context tasks.

## Agent Teaming

For broad tasks, split work into parallel tracks:

- UI/UX track: layout, styling, panels, and viewer presentation.
- PDF engine track: pdf.js loading, pdf-lib mutations, annotations, and page operations.
- Verification track: lint/build status, Playwright flows, screenshots, and regression notes.
