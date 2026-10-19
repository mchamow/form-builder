# 🧩 Form Builder

[![Test and deploy](https://github.com/mchamow/form-builder/actions/workflows/deploy.yml/badge.svg)](https://github.com/mchamow/form-builder/actions/workflows/deploy.yml)

**Day 28 of [100 Days of React](https://github.com/mchamow?tab=repositories)**: Drag fields into a form, tweak each one, try it out and export it as JSON.

**Live demo:** https://mchamow.github.io/form-builder/

## Features

- **Eight field types**: short and long text, email, number, date, dropdown, multiple choice and checkbox. Click one to add it below the selected field, or drag it to any spot in the form
- **Drag to reorder**: with a mouse grab a field anywhere; on a touch screen use its handle, so swiping still scrolls. A line shows where it will land, <kbd>Esc</kbd> cancels
- **Keyboard**: <kbd>↑</kbd>/<kbd>↓</kbd> step through fields, <kbd>Alt</kbd> + <kbd>↑</kbd>/<kbd>↓</kbd> move the focused one, <kbd>Del</kbd> deletes it and <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>D</kbd> duplicates it. Changes are announced to screen readers
- **Field settings**: type, label, help text, placeholder, required, length limits for text, a range for numbers, and options you can add, rename, reorder and remove (<kbd>Enter</kbd> on the last one adds another). The inspector sits beside the form on wide screens and opens under the selected field on phones
- **Preview mode** runs the real form: errors appear on submit and update as you fix them, focus jumps to the first problem, and a valid submit shows the answers as JSON keyed by label (`Full name` → `fullName`)
- **Export** the form as JSON to copy or download, and **import** it again by pasting or opening a file. Bad input is explained rather than ignored
- The form is saved in `localStorage` as you go; a first visit opens a sample sign-up form, and **New form** starts blank
- Light and dark themes that follow the system, and a phone layout

## How it works

- [`src/schema.ts`](src/schema.ts): field types, the sample form, answer keys, export, and a forgiving parser for imports and saved drafts
- [`src/reducer.ts`](src/reducer.ts): every builder action (add at a position, move, duplicate, edit options…) and the selection
- [`src/validate.ts`](src/validate.ts): per-field rules and the submitted answers
- [`src/useFieldDrag.ts`](src/useFieldDrag.ts) + [`src/drop.ts`](src/drop.ts): pointer-event drag and drop with no library: a press becomes a drag after 5px, the drop spot comes from the cards' midpoints, and the page scrolls near the edges
- [`src/storage.ts`](src/storage.ts): guarded `localStorage` load that falls back to the sample

## Tech

React 19 · TypeScript · Vite · Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (Base UI) · lucide icons · Vitest + Testing Library · deployed to GitHub Pages with GitHub Actions.

## Run locally

```bash
pnpm install
pnpm dev
pnpm test   # 52 unit and component tests (Vitest)
```
