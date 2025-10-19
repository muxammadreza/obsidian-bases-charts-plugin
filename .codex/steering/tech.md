## Stack

- Treat the project as a TypeScript + Svelte plugin that targets Obsidian’s Bases API; the runtime code lives under `packages/obsidian/src` and depends on Obsidian types plus SveltePlot (`packages/obsidian/src/charts/*.svelte`).
- Respect the Vite bundler configuration in `vite.config.ts`, which emits a CommonJS `main.js` for Obsidian and copies `manifest.json`; keep new entry points inside `packages` so the existing alias resolution continues to work.
- Use Bun as the package runner: lockfile and scripts assume `bun` (`bun.lock`, `package.json` scripts), so avoid mixing in npm/yarn commands unless you also update the tooling story.
- Follow the project’s linting and formatting stack: ESLint config in `eslint.config.mjs`, Prettier with the Svelte plugin (`.prettierrc.json`), and `svelte-check` for component diagnostics.

## Commands

- Run `bun install` to sync dependencies.
- Run `bun run dev` for the watch build that writes into the local dev vault path configured in `vite.config.ts`.
- Run `bun run build` to create the production bundle under `dist/` with minified assets.
- Run `bun run check` before releasing; it chains format check, TypeScript (`tsc`), `svelte-check`, ESLint, and Bun tests.
- Run `bun run test` (or `bun run test:log`) to execute the Bun-based test suite that lives in `tests/`.
- Invoke `bun run automation/release.ts` for the scripted release flow and `bun run automation/stats.ts` to regenerate telemetry shown in release notes.
