# SMM Course 2.0 — deployment reference (internal; never published)

This file holds the reference copy of the Cloudflare Pages build command
(plan Revision 1.7, Build configuration). `tests/publish/build.test.js` runs the
command exactly as written below, so the tests and Cloudflare cannot drift apart
unnoticed. Whenever the command is applied or changed in Cloudflare, the owner
confirms the dashboard text matches this block word for word.

- Production branch: `main` (unchanged). Development: `dev/v2.0` (preview deployments).
- Framework preset: None · Build output directory: `dist` · Root directory: blank

## Cloudflare build command

```sh
set -e; rm -rf dist; L=$(find index.html 404.html _headers shared lesson-[0-9]* final-project portfolio certificate progress -type l 2>/dev/null || true); if [ -n "$L" ]; then echo "Build stopped: symlinks in source:"; echo "$L"; exit 1; fi; mkdir dist; for p in index.html 404.html _headers shared lesson-[0-9]* final-project portfolio certificate progress; do if [ -e "$p" ]; then cp -R "$p" dist/; fi; done; test -f dist/index.html; cd dist; N=$(find . -mindepth 1 ! -type d ! -type f || true); F=$(find . -mindepth 1 -type f | sed 's#^\./##' | grep -Ev '^(index\.html|404\.html|_headers|lesson-([1-9]|1[0-3])/index\.html|(final-project|portfolio|progress)/index\.html|certificate/(index\.html|certificate\.js)|shared/(styles\.css|progress-smm\.js|pva-core/progress-core\.js|smm/(manifest|validators|quiz|hub|backup|platform-refs)\.js|smm/quizzes/lesson-([1-9]|1[0-3])\.js))$' || true); D=$(find . -mindepth 1 -type d | sed 's#^\./##' | grep -Ev '^(shared|shared/pva-core|shared/smm|shared/smm/quizzes|lesson-([1-9]|1[0-3])|final-project|portfolio|certificate|progress)$' || true); if [ -n "$N$F$D" ]; then echo "Build stopped: unexpected paths in output:"; echo "$N"; echo "$F"; echo "$D"; exit 1; fi; echo "Publish check passed"

```

## Adding a learner-facing file

The command publishes only the exact paths it lists. A new published file needs the
command, this block and the plan's "Permitted contents" table updated together, then a
passing preview build. Lesson-specific code lives inline in `lesson-N/index.html`.
