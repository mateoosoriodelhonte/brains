# Contributing to Brains

Brains is a CS 2450 course project by Mateo Osorio Delhonte and Priscilla Gyllenskog. Keep changes small enough that both students can review and explain them.

## Make one focused change

1. Update your checkout with `git pull --ff-only` while your working tree is clean.
2. Create a branch, for example `git switch -c improve-note-feedback`.
3. Implement one useful change. Preserve the six component names and dependency directions in [architecture](docs/architecture.md).
4. Run `npm test` and `npm run build`. Run `npm run test:browser` when changing user flows or rendering. Performance results describe only the machine where the measurement ran.
5. Review `git diff`, stage the relevant files, and inspect `git diff --cached` before committing.
6. Commit with a descriptive message, push the branch, and open a pull request for review. Include the resulting behavior and the checks actually run.

GitHub's **Project checks** workflow runs the unit/architecture/storage/timer tests and production build for pushes to `main` and pull requests. It does not replace browser testing or the designated-laptop performance check, and it does not deploy the app.

## Keep local files private

The root `.gitignore` excludes dependencies, generated output, local environment files, credential/key files, and backups. It allows sanitized example environment files. Never force-add secrets or real learner notes/tasks. Ignore rules do not remove files already committed. If a credential is exposed, revoke it with its provider rather than relying on a later deletion commit.

Keep `package-lock.json` committed and use `npm ci` for reproducible installation. App fixtures belong in tests; do not seed the normal workspace with personal or fake data.

## Commit attribution

Each teammate should commit using their own GitHub-linked email or their GitHub-provided noreply address. Check `git config user.name` and `git config user.email`; use `git config --local` when a setting should apply only to this repository. Copy your own noreply address from GitHub Settings → Emails.

Useful, focused commits preserve a reviewable history. Record AI assistance honestly in [docs/ai-usage.md](docs/ai-usage.md); do not claim the team reviewed work until that has happened.
