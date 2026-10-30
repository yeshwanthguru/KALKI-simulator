# Kalki · Roadmap (v0.4 onward)

*Derived from [BENCHMARK.md](BENCHMARK.md) and [MARKET_ANALYSIS.md](MARKET_ANALYSIS.md). Effort is a rough **estimate**: **S** ≈ days, **M** ≈ 1-2 weeks, **L** ≈ 3+ weeks of focused work for one developer. Priorities: **P0** must-have, **P1** should-have, **P2** nice-to-have. Version numbers are suggestions; each release should be a small, shippable single-file build as before.*

## Guiding principles

1. **Stay a single offline file** until the installer is justified; keep a size budget per release (set the baseline from v0.3.1 and do not grow more than ~25% without compressing assets) **[Est.]**.
2. **Close the hand-off gap first** (the biggest competitive gap), then content, then reach (language, platform), then automation.
3. **Keep the JSON scene format stable and versioned**; every new feature extends it so older `.kalki.json` (and legacy `.kalai.json`) files still open.
4. **Licence discipline**: only MIT/CC0/self-made assets; maintain a register in THIRD-PARTY-NOTICES.txt.
5. **No telemetry.** Learn through interviews, GitHub issues and download counts.

## Phase 0 — Validate (runs alongside v0.4, effort S)

- 10-15 interviews (creators, indie DOPs, film instructors) per MARKET_ANALYSIS §8.
- Publish a short feedback link (no in-app tracking).
- Apply the Kalki Simulator rename (formerly Kalai) across UI, file names (consider keeping `.kalai.json` openable), README and release notes in v0.4.
- Decide monetisation direction (free core + optional packs/institution licence).

## Phase 1 — Hand-off and credibility (v0.4 / v0.4.x)

**Goal:** a director can finish a scene in Kalki and give the DOP something printable.

| # | Feature | Effort | Priority | Rationale |
|---|---|---|---|---|
| 1.1 | ✅ **Shot-list PDF** (done in v0.4) (shot no., move, lens, size, height, angle, duration, notes, thumbnail) | M | P0 | Standard paid feature in Shot Designer Pro, StudioBinder, Previs Pro; CSV alone is insufficient |
| 1.2 | ✅ **Storyboard sheet export** (done in v0.4.1) (PNG/PDF grid: N frames per page with caption and lens) | M | P0 | Boords/StudioBinder core function; reuses existing PNG capture |
| 1.3 | ✅ **Lens + sensor presets** (done in v0.4 except phone presets and anamorphic squeeze, still open) (Super 35, Full-frame, Micro 4/3, phone main/tele, Alexa/RED/BMPCC-style film-back names as generic sizes; crop factor, equivalent focal length, anamorphic squeeze) | S-M | P0 | Realism gap vs FrameForge/Blender; cheap; useful for creators with phones/mirrorless |
| 1.4 | ✅ **Frame guides** (done in v0.4.2) (rule of thirds, safe areas, Reels/Shorts UI overlay zones) | S | P1 | Vertical-first positioning |
| 1.5 | ✅ **Shot notes + reference field** (notes done in v0.4.1; reference images still open) (free-text per shot, included in PDF/CSV) | S | P1 | Needed for any hand-off |
| 1.6 | ✅ **Project file versioning/migration** (done in v0.4) (`schemaVersion` in `.kalki.json`) | S | P0 | Prevents breaking files in later phases |
| 1.7 | ✅ **Regression checklist + small smoke-test page** (done in v0.4.2: `npm test`, 16 in-page checks) | S | P1 | Reduces risk as features accumulate |

**Release plan:** v0.4 = 1.1 + 1.3 + 1.6 (released); v0.4.1 = 1.2 + 1.5 (released); v0.4.2 = 1.4 + 1.7 (released). **Phase 1 is complete except reference images (part of 1.5), phone sensor presets and anamorphic squeeze (part of 1.3).**

**Done when:** a 5-shot scene exports a PDF a non-user can read and act on; old projects still open.

## Phase 2 — Performers and actions (v0.5)

**Goal:** show *what happens* in the shot, not just where the camera is.

| # | Feature | Effort | Priority | Rationale |
|---|---|---|---|---|
| 2.1 | ✅ **Actor picker** (done in v0.5.4: seven Rocketbox avatars, size, skin and height variants still open) (more avatars from existing MIT Rocketbox set; choose per shot/subject; size/skin/height) | M | P0 | Content gap; low legal risk (same source and licence) |
| 2.2 | ✅ **Actions library v1** (done in v0.5): stand, walk, sit, sit-and-think, talk, listen, nod, sip chai, wave, look around, shrug, invite to sit; hand-over/handshake still open | L | P0 | Highest content value; matches the original idea list; competitors' animatics show actions |
| 2.3 | ✅ **Action timeline lane** (done in v0.5.2: timed changes per actor inside a shot, 0.5 s steps, 0.25 s blend) (per-actor clips with start/duration) | M | P0 | Needed to sequence actions with camera moves |
| 2.4 | ◐ **Actor placement and path** (click-to-place and facing done in v0.5.1; multi-point waypoints still open) (click-to-place, simple waypoints) | M | P1 | Basic blocking; narrows gap with Shot Designer |
| 2.5 | ✅ **Top-down blocking diagram export** (done in v0.5.1) (overhead view with camera/actor paths, printable) | M | P1 | Shot Designer's signature feature; reuses set view |
| 2.6 | ◐ **Performance guard** (animation data adds about 0.9 MB; poly/texture budget still open) (poly/texture budget, auto Light mode thresholds retuned) | S | P0 | Prevents regressions on low-end laptops |

**Dependency:** 2.3 requires 2.2; 2.4 and 2.5 depend on 2.1.
**Done when:** a two-person chai-stall conversation (sit, talk, sip) with a push-in plays and exports in <60 s authoring time for a new user.

## Phase 3 — Indian content and language (v0.6)

**Goal:** become the obvious Indian-context tool.

| # | Feature | Effort | Priority | Rationale |
|---|---|---|---|---|
| 3.1 | ✅ **UI localisation framework** (done in v0.6.0: the page is translated from `src/i18n.js`, English kept as the source; fonts come from the system rather than being embedded) (string table, language switch, font loading for Tamil/Devanagari embedded as subsets) | M | P0 | Prerequisite; nobody benchmarked serves Indic languages; 98% of Indian internet users use Indic content ([Kantar-IAMAI via Business Today](https://www.businesstoday.in/amp/technology/news/story/indias-internet-revolution-key-insights-from-kantar-and-iamai-report-461043-2025-01-16)) |
| 3.2 | ✅ **Tamil + Hindi UI** (done in v0.6.0, awaiting native-speaker review; other languages can be added as rows in `src/i18n.js`) (then Telugu/Malayalam/Kannada/Bengali/Marathi via community contributions) | M | P0 | Table stakes for stated audience; community-translatable |
| 3.3 | 🟡 *Partly done in v0.6.1 (topi, turban, glasses, school bag, garland, dupatta, umbrella; texture swaps still open)* **Costume packs v1** (kurta, saree, dhoti/lungi, school uniform, formal shirt; as texture/mesh swaps on existing rigs) | L | P1 | India fit; keep assets self-made/CC0 |
| 3.4 | 🟡 *Partly done in v0.6.1 (village street and terrace added; living room, temple, office, classroom still open)* **Set packs v1**: tea stall (existing), village street, tiled living room, auto-rickshaw stand, temple courtyard, small office, school classroom | L | P1 | Content depth; ship as optional packs (separate files) to protect size budget |
| 3.5 | 🟡 *Partly done in v0.6.1 (auto-rickshaw, lamp posts, water tank, clothesline, rope cot; scooter still open)* **Props**: chai glass/cup, plastic chair, scooter, auto, lamp | M | P1 | Needed by actions and sets |
| 3.6 | ✅ **Time-of-day lighting presets** (done in v0.6.0: dawn, noon, dusk) (dawn, noon, golden hour, dusk, night with street lights) | S-M | P1 | Cheap, high visual payoff, extends existing looks |

**Release plan:** v0.6 = 3.1 + 3.2 (+ 3.6); v0.6.1 = first costumes/props; v0.6.2 = first extra set pack.
**Done when:** the full UI and onboarding work in Tamil and Hindi without layout breaks.

## Phase 4 — Reach: mobile and Windows (v0.7)

**Goal:** run where the audience actually is.

| # | Feature | Effort | Priority | Rationale |
|---|---|---|---|---|
| 4.1 | ◐ **Touch/phone layout** (done in v0.7.0: tabs, scrolling toolbar, touch-sized controls below 820 px; tested only in a headless browser, not on a real phone; the main view has no gestures because the camera is simulated) (responsive panels, gesture orbit/pinch, larger controls) | L | P0 | Android ~92% of Indian mobile ([StatCounter](https://gs.statcounter.com/os-market-share/mobile-/india)); Apple-only incumbent Previs Pro |
| 4.2 | **PWA install (offline cache)** | S-M | P1 | Android installation without an app store; check CSP/offline constraints |
| 4.3 | ✅ **Windows installer via Tauri 2** (first version done in v0.4.1: NSIS, per-user, native Save as; offline WebView2 bundling and signing still open) (WebView2; choose bootstrapper vs offline installer for no-network labs) | M | P0 | Windows ~78% of desktop ([StatCounter](https://gs.statcounter.com/os-market-share/desktop-operating-systems/india)); typical Tauri installers are far smaller than Electron (e.g. ~12 MB vs ~201 MB in one comparison, [HackerNoon](https://hackernoon.com/six-months-with-tauri-the-benefits-and-the-bill)); offline lab deployment possible per [Tauri docs](https://v2.tauri.app/distribute/windows-installer/) |
| 4.4 | ◐ **Native file save/open (save done) and folder asset packs in the exe** | M | P1 | Smoother than browser downloads; enables optional large packs |
| 4.5 | **Signed-installer plan** (SmartScreen reputation; cost is a recurring expense **[Est.]**) | S | P1 | Unsigned exes trigger warnings that reduce trust |

**Done when:** a lab PC without internet can install and run Kalki; a mid-range Android phone runs a 3-shot scene in Light mode.

## Phase 5 — Teaching and professional polish (v0.8)

| # | Feature | Effort | Priority | Rationale |
|---|---|---|---|---|
| 5.1 | ✅ **Lesson scenes/templates** (done in v0.7.0: tour of all 18 moves, shot sizes, lenses, depth of field, push vs zoom, dialogue coverage, camera rigs; 180° rule is covered inside dialogue coverage; Tamil/Hindi titles only, bodies English) ("Learn 18 moves", "Shot sizes", "180° rule", "Lens comparison") | M | P0 | Film-school niche; low production cost; strong marketing |
| 5.2 | **Instructor kit**: assignment file + checklist, side-by-side before/after compare | M | P1 | Institution licence story |
| 5.3 | ✅ **Shot templates and presets library** (done in v0.7.0: dialogue pair, walk and talk, tension build, scene opener, Reels hook) (dialogue OTS, walk-and-talk, reveal) | M | P1 | Speeds creators; shows grammar |
| 5.4 | **Storyboard sheet and PDF theming** (logo, scene/shoot-day metadata, language) | S | P2 | Professional polish |
| 5.5 | ✅ **Camera-rig props** (done in v0.7.0: eight rigs drawn in the set view with a per-shot picker; handheld intensity uses the existing intensity slider, no separate shake profiles; rig not yet in the shot-list PDF) (dolly track, jib, gimbal, handheld shake profiles) with visible rig | M | P1 | Realism vs FrameForge/Cine Designer; teaches how to achieve a move cheaply |
| 5.6 | ✅ **Budget-friendly alternatives hints** (done in v0.7.0 as the "On a budget" tip for each rig; tips are English only) ("how to get this move with a phone and a bucket") | S | P2 | India fit, content marketing |

## Phase 5b — Reference video analysis ("Analyse my video") (v0.8.x–v0.9)

**Goal:** the user imports a clip; Kalki reports which camera techniques it detects, suggests improvements, and plays both the *detected* and the *suggested* version as a simulation on the 3D set. Everything runs locally in the browser/exe; the video never leaves the machine.

**What is realistic (feasibility, honest view)** — estimates, not tested:
- **Reliable with classical computer vision (no ML model):** cut/shot-boundary detection (frame-difference histograms); global camera motion per shot via optical flow or feature tracking (pan, tilt, push-in/pull-out vs zoom approximations, handheld shake level, static); shot duration/pacing; aspect ratio; brightness/contrast and colour mood summary.
- **Needs a small bundled ML model (still offline, adds MBs):** shot size (close-up/medium/wide) via face/body detection; subject position for headroom/looking-room/rule-of-thirds checks; person count. A WASM/ONNX or similar in-browser runtime is the likely route; model choice and licence need a spike.
- **Hard / low-confidence:** distinguishing a dolly-in from an optical zoom (needs parallax analysis), exact focal length, aperture/DOF, crane vs tilt, true 3D scene reconstruction. Report these as "likely" with a confidence label, never as fact.
- **Suggestions** come from transparent, rule-based checks (e.g. 180° rule is not checkable from one clip; but: too many consecutive same-size shots, no motivation for a move, shaky handheld in a calm scene, subject cut off by frame edge, speed too fast for the shot length, 9:16 safe-area violations). Optional later: local LLM to phrase suggestions (item 6.1).
- **Simulation:** the analysis output is converted to the existing Kalki shot JSON (move type, lens estimate, shot size, height, speed, duration) on a stock set with placeholder actors, so the user sees an *approximation* of the original camera behaviour and a *modified* version side by side. It is not a reconstruction of the real location.

| # | Feature | Effort | Priority | Rationale |
|---|---|---|---|---|
| 5b.1 | ✅ **Spike:** accuracy test on ~20 varied clips (pan/tilt/push-in/handheld/static); decide model + runtime; set a size and speed budget (done: replaced by synthetic-footage tests, a calibration against Kalki's own renders and a real-video end-to-end test) | S-M | P0 | De-risks the whole feature before UI work |
| 5b.2 | ✅ **Video import + shot-cut detection + timeline of detected shots** (WebCodecs/`<video>` frame sampling; analysis in a Worker; progress bar; length cap, e.g. 2–3 min **[Est.]**) (done in v0.5.3: `<video>` frame sampling, cut detection, shot strip; runs on the main thread, not yet in a Worker) | M | P0 | Foundation; also useful alone as an "auto shot list from video" |
| 5b.3 | ✅ **Camera-motion classifier per shot** (pan/tilt/push/pull/static/handheld with confidence) (done in v0.5.3: pan, tilt, truck, pedestal, push/zoom, pull, handheld, static with confidence; no ML) | M-L | P0 | Core of "how camera techniques are used" |
| 5b.4 | **Shot-size + subject framing (small ML model)** | M-L | P1 | Enables framing advice; adds asset size |
| 5b.5 | ◐ **Analysis report** (per-shot cards, pacing chart, technique summary; export PDF/CSV via Phase 1 pipeline) (CSV report and on-screen cards done in v0.5.3; PDF export still open) | M | P0 | Delivers the "output" the user asked for |
| 5b.6 | ✅ **Rule-based suggestions engine** (explainable, each tip names the rule and the shot) (done in v0.5.3: pacing, move, intensity, easing, shot count, handheld, restraint rules) | M | P0 | The "what changes are needed" part |
| 5b.7 | ◐ **"Detected vs Suggested" simulation**: generate Kalki shots for both and play/compare side by side, with a one-click "apply suggestion to my project" (done in v0.5.3: simulate the reference, apply one or all suggestions and play; side-by-side compare still open) | L | P0 | The "show as simulation" part; depends on 1.6 (schema), 2.x (actors/actions) and 5.3 (templates) |
| 5b.8 | ✅ **Privacy and rights notice** (local-only processing; user responsible for clips they import) (done in v0.5.3: notice in the dialog) | S | P0 | Trust; copyright-sensitive use case |

**Dependencies:** 1.6 schema versioning, 1.1/1.2 export pipeline, 5.3 templates for suggested variants. **Sequence:** 5b.1 → 5b.2 → 5b.3 → 5b.5/5b.6 → 5b.7 → 5b.4 (framing advice can follow).
**Release plan:** v0.8.1 = import + cuts + shot list from video (5b.2); v0.8.2 = motion detection + report (5b.3, 5b.5); v0.9 = suggestions + simulation (5b.6, 5b.7).
**Done when:** on a test set of clips, detected moves match human labels for the majority of shots (target set after the 5b.1 spike, e.g. ≥70% **[Est. target]**), every suggestion cites its rule, and the simulated suggestion plays in the existing timeline.
**Competitive note:** none of the tools in BENCHMARK.md offers offline video-to-camera-analysis; generative tools create video but do not critique it. This is a potential differentiator, but also the highest-uncertainty item on the roadmap.

## Phase 6 — Optional intelligence (v0.9+)

| # | Feature | Effort | Priority | Rationale |
|---|---|---|---|---|
| 6.1 | **Text-to-shot via local LLM** (optional download; converts plain text to the existing JSON; Tamil/Hindi prompts if the model supports it) | L | P2 | Differentiator vs cloud AI tools; depends on stable JSON schema (1.6) and the actions library (2.2); hardware constraints in India are significant; keep strictly optional and separate from the core file |
| 6.2 | **Export reference frames/prompts for generative tools** (frame + lens + move description) | S | P2 | Complements Runway/Kling instead of competing |
| 6.3 | **Import script (Fountain/plain text) → shot-list skeleton** | M | P2 | StudioBinder-style flow, offline |
| 6.4 | **Cloud sync/collab** | L | P3 (not recommended now) | Conflicts with the offline positioning; revisit only on evidence of demand |

## Prioritised master feature list

Ranked by (competitive gap × market evidence) ÷ effort **[Est.]**.

| Rank | Feature | Phase | Effort | Priority |
|---|---|---|---|---|
| 1 | Shot-list PDF | 1 | M | P0 |
| 2 | Lens + sensor presets | 1 | S-M | P0 |
| 3 | Project schema versioning | 1 | S | P0 |
| 4 | Storyboard sheet export | 1 | M | P0 |
| 5 | Actor picker | 2 | M | P0 |
| 6 | Actions library (sit, talk, sip chai) | 2 | L | P0 |
| 7 | Action timeline lane | 2 | M | P0 |
| 8 | Localisation framework + Tamil/Hindi UI | 3 | M | P0 |
| 9 | Windows exe via Tauri | 4 | M | P0 |
| 10 | Touch/phone layout | 4 | L | P0 |
| 11 | Lesson scenes | 5 | M | P0 |
| 12 | Frame guides and Reels safe areas | 1 | S | P1 |
| 13 | Time-of-day lighting presets | 3 | S-M | P1 |
| 14 | Costume packs (Indian wear) | 3 | L | P1 |
| 15 | Set packs (Indian locations) | 3 | L | P1 |
| 16 | Props (chai glass, chair, scooter, auto) | 3 | M | P1 |
| 17 | Actor placement/paths + blocking diagram | 2 | M | P1 |
| 18 | PWA offline install | 4 | S-M | P1 |
| 19 | Camera-rig props | 5 | M | P1 |
| 20 | Shot templates library | 5 | M | P1 |
| 21 | Instructor kit | 5 | M | P1 |
| 21b | Reference video analysis + suggested-shot simulation (5b.1–5b.8) | 5b | L (spike first) | P0 for v0.8.x–v0.9, per owner request; high uncertainty |
| 22 | Local LLM text-to-shot | 6 | L | P2 |
| 23 | Reference-frame/prompt export | 6 | S | P2 |
| 24 | Script import | 6 | M | P2 |
| 25 | Cloud sync | 6 | L | P3 |

## Recommended v0.4 scope

Ship **v0.4 = shot-list PDF + lens/sensor presets + schema versioning** (about 2-3 weeks **[Est.]**), then **v0.4.1 = storyboard sheet + shot notes**. Rationale: these close the largest verified competitive gap (hand-off documents), are low-risk (no new heavy assets, no size growth), and unlock the later phases (versioned JSON, per-shot data for the PDF, lens data for the future LLM).

## Cross-cutting tasks (every release)

- Update README version table and VERSIONS.txt; keep release notes short.
- Test Chrome, Edge and Firefox; test Light mode on a low-end laptop.
- Re-check THIRD-PARTY-NOTICES.txt for each new asset.
- Re-verify competitor pricing in BENCHMARK.md every ~6 months.

## Risks to the roadmap

- **Scope creep in Phase 2** (actions are animation-heavy): ship 3 actions first; reuse existing Rocketbox animation compatibility; budget animation retargeting time.
- **Asset size**: packs must be optional files or compressed; single-file builds need a hard size limit.
- **Localisation quality**: machine-translated Tamil/Hindi strings need native review; accept community PRs.
- **Mobile browsers' WebGL/memory** limits may force a reduced-quality mobile mode.
- **Signing cost/time** for the Windows exe.

## Sources

See the Sources sections of [MARKET_ANALYSIS.md](MARKET_ANALYSIS.md) and [BENCHMARK.md](BENCHMARK.md). Additional:
- Tauri Windows installer docs: <https://v2.tauri.app/distribute/windows-installer/>
- Tauri vs Electron size comparison (anecdotal): <https://hackernoon.com/six-months-with-tauri-the-benefits-and-the-bill>
- StatCounter India: <https://gs.statcounter.com/os-market-share/desktop-operating-systems/india>, <https://gs.statcounter.com/os-market-share/mobile-/india>
