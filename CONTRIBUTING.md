# Contributing

Bug reports and fixes are welcome. For a larger change, open an issue first so we can agree on the approach before you write the code.

## Setup

You need Node.js 22 or newer (`.nvmrc` pins the major version) and Git.

```sh
git clone https://github.com/mattiamichini-design/varianthub.git
cd varianthub
npm ci
npm run dev
```

`npm run dev` builds `packages/core` and starts the Next site on http://localhost:3000. Besides the landing page and `/playground`, development mode serves the maintainer workspace at `/workspace`. It renders the demo catalog in `src/components/variant-hub-catalog.tsx` and saves layouts in `.varianthub/layouts/`, which Git ignores.

The repository has three parts:

- `packages/core`: the React viewer (`varianthub-core`) and its CSS theme.
- `packages/runner`: the local runner (`varianthub`), its CLI and the agent skills.
- `src`: the Next website, the public playground and the maintainer workspace.

Read `CONTEXT.md` for the domain vocabulary and `docs/adr/` for the decisions behind the current structure.

## Checks

Run these before opening a pull request:

```sh
npm run lint
npm run typecheck
npm run test:core
npm run test:runner
npm run build
npm run test:e2e
```

`test:e2e` starts a development server on port 3100 and runs the Playwright suite. Install a browser once with `npx playwright install chromium`, or use an installed Chrome with `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`.

If you change `packages/core` or `packages/runner`, also run `npm run verify:packages`. It packs both packages, installs them into temporary HTML and React projects outside the workspace and tests those projects in a browser. Nothing is published.

## Pull requests

- Keep each pull request to one change, and add or update tests for the behavior you touch.
- Open the pull request as a draft while you are still pushing changes. CI skips drafts; it runs when you mark the pull request ready for review and on each push after that.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages, for example `fix(runner): reject paths outside the configured roots`.
- Update the README or the package READMEs when you change commands, configuration or behavior they describe.
- Do not add publishing steps or package-registry install instructions. GitHub is the only distribution channel, and every package keeps `"private": true`.

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
