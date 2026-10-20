# Kalki Simulator — Camera Studio

**See your shot before you shoot it.**

Kalki is an offline camera-movement simulator for Indian filmmakers, YouTubers and film students. Block out camera moves on a 3D set, tune the lens and lighting, and export a shot list or preview video, all from a single HTML file. No install, no account, no network.

**Latest release: v0.3.1** — [`Kalki-versions/Kalki-v0.3.1.html`](Kalki-versions/Kalki-v0.3.1.html) (or the zipped package, [`Kalki-v0.3.1.zip`](Kalki-versions/Kalki-v0.3.1.zip), which includes the README and licence notices).

## Quick start

1. Download `Kalki-v0.3.1.html`.
2. Double-click it. It opens in your browser (Chrome or Edge recommended) and runs fully offline.

## Features

- **18 camera moves** — push in, orbit, dolly zoom, crane and more — on a timeline
- **Shot controls** — lens, shot size, subject, height, angle, speed and easing
- **Live views** — camera frame plus a top-right set view that updates as you edit
- **No-code and Code modes** — edit the scene visually or as structured JSON
- **Cinematic looks** — Golden hour, Teal & orange, Night, Noir, Neutral
- **Real lens behaviour** — aperture f/1.4–f/11 drives depth of field; plus bloom, motion blur and film grain
- **Lighting** — window light with sun shafts on a 3D chai-stall set
- **Realistic actors** — animated idle and walk cycles (Microsoft Rocketbox avatars)
- **Frame for any format** — cinema 2.39:1, YouTube 16:9, Reels/Shorts 9:16, square
- **Export** — shot list (`.csv`), frame (`.png`), preview video (`.webm`); save and open projects (`.kalki.json`)
- **Undo / redo**, and **automatic Light mode** on slow CPUs (also toggled by the lightning button)

## Version history

| Version | Highlights |
|---------|------------|
| v0.1 | First prototype: 18 camera moves, timeline, no-code and code modes, onboarding, exports |
| v0.2 | Cinematic look: window light and sun shafts, depth of field, bloom, motion blur, grain, 5 looks |
| v0.3 | Realistic animated actors (some browsers failed to load textures) |
| **v0.3.1** | **Latest.** Actor textures fixed for all browsers, brighter wide shots |

All builds are in [`Kalki-versions/`](Kalki-versions/). See [`VERSIONS.txt`](Kalki-versions/VERSIONS.txt).

## Roadmap

Kalki Simulator is built in small, shippable steps, each a single offline file. Full detail, effort estimates and rationale are in [`docs/ROADMAP.md`](docs/ROADMAP.md).

| Phase | Release | Focus | Key features |
|-------|---------|-------|--------------|
| 1 | v0.4 | Hand-off and credibility | Shot-list PDF, lens and sensor presets, versioned project files; then storyboard sheet, shot notes, frame guides |
| 2 | v0.5 | Performers and actions | Actor picker, actions (sit, talk, sip chai), action timeline, blocking diagram |
| 3 | v0.6 | Indian content and language | Tamil and Hindi UI, costume, set and prop packs, time-of-day lighting |
| 4 | v0.7 | Reach | Phone and touch layout, PWA, Windows installer (Tauri) |
| 5 | v0.8 | Teaching and polish | Lesson scenes, instructor kit, shot templates, camera-rig props |
| 6 | v0.9+ | Optional intelligence | Local text-to-shot, reference export for generative tools, script import |

## Market and benchmark

- [`docs/MARKET_ANALYSIS.md`](docs/MARKET_ANALYSIS.md): target users in India, trends, pain points, pricing and positioning.
- [`docs/BENCHMARK.md`](docs/BENCHMARK.md): feature comparison with other previs, shot-list and storyboard tools.

In short: professional previs tools are priced in USD and out of reach for most Indian creators and students, and the realistic alternative is no previs at all. Kalki aims to be free to run, offline, Indic-language and quick to learn.

## Building from source

Requires Node.js.

```bash
npm install
node build.mjs            # -> dist/Kalki.html (obfuscated)
DEBUG=1 node build.mjs    # unobfuscated build for debugging
```

`optimize.mjs` and `texfix.mjs` rebuild the actor assets; they need the original FBX/TGA files, which are not included.

```
src/index.html    UI shell, CSS, onboarding, strict CSP (no network)
src/app.js        cinema grammar, pose solver, 3D set, lighting, post-processing, timeline, exports
build.mjs         bundles three.js, obfuscates app.js, inlines actor assets as base64
assets_src/       actor GLBs, animation GLBs, tex.json (textures as data URIs)
```

Design notes are in [`DEVELOPMENT.md`](DEVELOPMENT.md).

## Privacy

Kalki never connects to the internet and collects no data. Files are saved only where you choose to download them.

## Credits and licences

- [three.js](https://threejs.org) — MIT
- [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) avatars and animations (Female_Adult_11, Male_Adult_17) — MIT

Full notices: [`THIRD-PARTY-NOTICES.txt`](THIRD-PARTY-NOTICES.txt). See [`LICENSE`](LICENSE) for this project's licence.
