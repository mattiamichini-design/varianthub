# Security policy

## Reporting a vulnerability

Report vulnerabilities privately through GitHub: open the repository's Security tab and choose "Report a vulnerability", or go to [the advisory form](https://github.com/mattiamichini-design/varianthub/security/advisories/new). Do not open a public issue.

Include the commit you tested, the steps to reproduce and the impact you observed. You will get an answer in the advisory thread, and a fix is published once it is ready.

## Supported versions

Fixes land on the `main` branch. Update your checkout with `git pull` and rebuild with `npm ci && npm run build:packages` to get them.

## Scope

The local runner listens on 127.0.0.1 only. It rejects requests whose `Host` or `Origin` header does not match the server, and it serves files only from the roots listed in `varianthub.config.json`. It does not follow symlinks that leave those roots, and it does not serve dotfiles.

Registered variants are trusted project code. They run in same-origin iframes that separate layout and navigation; the iframes are not a sandbox for untrusted code. A report that depends on registering a malicious variant in your own project is out of scope.
