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
