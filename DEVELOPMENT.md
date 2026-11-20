# Kalki Simulator

Offline, CPU-friendly camera-movement simulator for Indian filmmakers, YouTubers and film students.
Ships as ONE self-contained HTML file (no install, no network).

## Build
```
npm install
node build.mjs            # -> dist/Kalki.html (obfuscated)
DEBUG=1 node build.mjs    # unobfuscated build for debugging
```
Optional asset rebuild (needs the source FBX/TGA files, not included):
`node optimize.mjs`, `node texfix.mjs <dir-with-conv-and-tex>`.

## Layout
- `src/index.html` – UI shell, CSS, onboarding, strict CSP (no network: connect-src blob: data: only)
- `src/app.js` – everything else: cinema grammar (18 moves, lenses, f-stops, shot sizes), pose solver,
  3D chai-stall set, real lighting + sun shafts, post-processing (DOF, bloom, motion blur, grade, grain),
  looks (golden / teal / night / noir / neutral), timeline, inspector, code (JSON) mode, exports
  (CSV shot list, PNG frame, WebM preview), undo/redo, auto Light mode for slow CPUs
- `build.mjs` – bundles three.js + addons (vendor), obfuscates app.js, inlines actor assets as base64
- `assets_src/` – actor GLBs (meera, arjun), idle/walk animation GLBs, `tex.json` (textures as data URIs)

## Key decisions
- Textures are data URIs applied at runtime (blob URLs failed in some browsers → white actors).
  Keep `prune({ keepAttributes: true })` or UVs are stripped.
- Actors: Microsoft Rocketbox Female_Adult_11 + Male_Adult_17, MIT license. Credit kept in Help + THIRD-PARTY-NOTICES.
- three.js MIT credited. No personal data anywhere in the app.
- `#hq` URL hash disables auto Light mode (used for testing).

## Next ideas
Actor picker (more Rocketbox avatars), actions (sit, sip chai, talk),
Indian costumes, Tamil UI, Windows .exe via Tauri, optional local LLM text-to-shot.

## Tools
- `tools/convert-anim.mjs <fbx-dir>`: rebuilds `assets_src/actions.json` from Rocketbox animation FBX files (MIT).
- `tools/screenshot.mjs <out.png> [script.js] [w] [h]`: screenshots the built app in headless Edge/Chrome, optionally after running a script (used for README images).
- `npm test`: PDF writer tests plus an in-page self-test run in headless Edge/Chrome (`#selftest`).
- `tests/analyze.test.mjs`: the analysis engine on synthetic footage with known camera moves. `tests/video-e2e.mjs`: records a real WebM in headless Edge/Chrome and runs it through the importer. The in-page self-test also renders Kalki's own moves and checks the analyser recognises them (this is how the direction signs and thresholds were calibrated).
- `tools/make-test-clip.mjs <out.webm>`: builds the deterministic test clip (WebCodecs plus a small WebM writer, see `tools/clip-gen.mjs`); `tests/video-e2e.mjs` uses the committed copy.
- `tools/convert-avatar.mjs <avatar-dir> <id> <f|m> <name>`: converts a Rocketbox adult avatar (FBX plus TGA textures, MIT) to a quantised GLB and small textures in `assets_src/avatars/`. `tools/make-thumbs.mjs <preview-dir>` builds the picker thumbnails.
- `src/i18n.js`: Tamil and Hindi translations (rows of English, Tamil, Hindi, plus patterns for text with numbers or names). The app translates the DOM from it and keeps the English original on every node. `tests/i18n.test.mjs` checks every string in `tests/ui-strings.json` (harvested from the running app) is translated.
