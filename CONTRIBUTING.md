# Contributing

Thanks for your interest. This plugin has a deliberately narrow scope (see [Scope](README.md#scope)) — please read that before opening a feature PR.

## Reporting issues

Bug reports and questions go in [GitHub Issues](https://github.com/dacrystal/obsidian-mermaid-next-plugin/issues). Include:

- Obsidian version and OS.
- Plugin version (`Settings → Community plugins → Mermaid Next`).
- A minimal `mermaid-next` block that reproduces the problem.
- Whether the same diagram renders with the official Obsidian Mermaid (` ```mermaid``` ` block) — this helps separate upstream Mermaid bugs from plugin bugs.

## Pull requests

- **Bug fixes**: welcome. Open a PR against `main`.
- **Features**: open an issue first to discuss. Anything beyond rendering `mermaid-next` blocks (and the existing opt-in global swap) is unlikely to be merged.
- **Docs / typo fixes**: send directly.

No CLA, no sign-off required.

## Dev setup

Requires [Bun](https://bun.sh) (the project's package manager — not npm).

```sh
bun install
bun run dev     # watch build → main.js
bun run build   # production build + tsc typecheck
bun run lint    # eslint
```

To test in a real vault, point Obsidian at `demo/mermaid-next-vault/` (or symlink `main.js`, `manifest.json`, `styles.css` into your own vault's `.obsidian/plugins/mermaid-next/`).

## Code conventions

- **TypeScript strict mode** — see `tsconfig.json`. No `any` (the lint config rewrites to `unknown`).
- **Tabs**, width 4 — see `.editorconfig`.
- **ESLint** uses `eslint-plugin-obsidianmd` recommended rules, including a sentence-case check on UI strings. Disable inline with a reason comment if you need an exception (see existing uses for "ELK", "Mermaid").
- Keep code blocks short; the codebase prefers small, named helpers over comments. Don't add comments that just restate what the code does.

## Commit messages

Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `ci:`. Subject in imperative mood, ≤ 72 chars. Body optional; use it for the *why*, not the *what*.

## Before opening a PR

- `bun run build` passes (typecheck + production build).
- `bun run lint` is clean.
- The change works end-to-end in a real Obsidian client — render at least one `mermaid-next` block; if the change touches the global swap, also render a plain ` ```mermaid``` ` block with the toggle on and off.
