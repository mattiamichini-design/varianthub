# VariantHub local runner

The `varianthub` package is the local VariantHub workspace for HTML pages and URLs. It contains the prebuilt viewer, the CLI, the layout storage used by React hosts (`varianthub/server`) and the agent skills. It does not include the website, Next.js or a React compiler.

Install it by cloning and building [the repository](https://github.com/mattiamichini-design/varianthub) as described in the root README. It needs Node.js 22 or newer. HTML and URL projects need no React or Next configuration, cloud service or screenshot browser.

```sh
node /path/to/varianthub/packages/runner/src/cli.mjs init --root /path/to/project
# Edit the project's varianthub.config.json
node /path/to/varianthub/packages/runner/src/cli.mjs start --root /path/to/project
```

`--root` selects the project and `--port` the localhost port (4310 by default). `init` keeps an existing configuration. With `--examples`, `init` copies two responsive HTML journals (local CSS, JavaScript, navigation and a form) into `varianthub-examples/` and registers them together with a live three.js page from the internet. It never overwrites existing configuration or example files.

## Configuration

`projectId` scopes personal browser history. Register stable exploration keys and variant IDs:

```json
{
  "version": 1,
  "projectId": "my-project",
  "roots": ["pages"],
  "explorations": [{
    "key": "landing",
    "name": "Landing page",
    "path": "pages",
    "kind": "page",
    "sourcePaths": ["pages/index.html", "pages/style.css"],
    "variants": [{
      "id": "editorial",
      "name": "Editorial",
      "source": {"type": "html", "entry": "pages/index.html"}
    }]
  }]
}
```

Use `{"type":"url","url":"https://your-permitted-source.example/page"}` for a page that is already served. Its server must keep running and allow embedding. Cross-origin pages cannot support parent keyboard shortcuts, URL inspection or scroll restoration; use the visible controls and the direct-source action instead. The runner cannot bypass a page's Content Security Policy. Registered code is trusted, not sandboxed.

Optional `viewportPresets` changes the project defaults, for example `{"mobile":{"width":375,"height":812}}`. Omitted presets keep Mobile 390×844, Tablet 768×1024, Desktop 1440×900 and Wide 1920×1080. Resizing an artboard by hand selects Custom. Choosing a preset resizes and arranges the visible artboards without overlap, and Apply size to all does the same with the last custom dimensions.

Restart the runner after changing the JSON configuration. Source HTML, CSS and JavaScript are read on every request.

## Layouts and history

Shared settings are saved in `.varianthub/layouts/<exploration>.json`. Commit these files to share an arrangement. Favorites, visits and the canvas camera stay in the browser. If a layout file changes on disk while you have it open, the viewer shows a conflict; reload the repository layout before saving again. The local runner writes layouts only for its loopback session, and React hosts can disable writes with `createWorkspace({ allowWrites: false })`.

Source dates come only from the Git history of the declared `sourcePaths`. Without Git or history, and for remote-only sources, dates are unknown. Opening a page never creates source history. Dotfiles and paths outside the configured roots, including symlinks that point outside them, are not served.

## Agent skills

`skills/varianthub/SKILL.md` covers authoring variants and `skills/varianthub-builder/SKILL.md` covers setting up the integration. Copy the folder you need from `packages/runner/skills/` into your agent's project skill directory, for example `.claude/skills/` for Claude Code or `.agents/skills/` for Codex. Review an existing copy before replacing it; pulling the checkout does not update copied skills. `init` creates the workspace configuration only, not agent configuration.

## Maintainers

`npm pack --workspace varianthub` builds the viewer through `prepack`. Run `npm run verify:packages` at the repository root to install both package archives in separate temporary projects and test them in a browser. The HTML project installs only the runner; the React project compiles real components without Next. These commands do not publish anything.
