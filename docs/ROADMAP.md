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
| 1.2 | **Storyboard sheet export** (PNG/PDF grid: N frames per page with caption and lens) | M | P0 | Boords/StudioBinder core function; reuses existing PNG capture |
| 1.3 | ✅ **Lens + sensor presets** (done in v0.4 except phone presets and anamorphic squeeze, still open) (Super 35, Full-frame, Micro 4/3, phone main/tele, Alexa/RED/BMPCC-style film-back names as generic sizes; crop factor, equivalent focal length, anamorphic squeeze) | S-M | P0 | Realism gap vs FrameForge/Blender; cheap; useful for creators with phones/mirrorless |
| 1.4 | **Frame guides** (rule of thirds, safe areas, Reels/Shorts UI overlay zones) | S | P1 | Vertical-first positioning |
| 1.5 | **Shot notes + reference field** (free-text per shot, included in PDF/CSV) | S | P1 | Needed for any hand-off |
| 1.6 | ✅ **Project file versioning/migration** (done in v0.4) (`schemaVersion` in `.kalki.json`) | S | P0 | Prevents breaking files in later phases |
| 1.7 | **Regression checklist + small smoke-test page** | S | P1 | Reduces risk as features accumulate |

**Release plan:** v0.4 = 1.1 + 1.3 + 1.6 (released); v0.4.1 = 1.2 + 1.5; v0.4.2 = 1.4 + 1.7.

**Done when:** a 5-shot scene exports a PDF a non-user can read and act on; old projects still open.

## Phase 2 — Performers and actions (v0.5)

**Goal:** show *what happens* in the shot, not just where the camera is.

| # | Feature | Effort | Priority | Rationale |
|---|---|---|---|---|
| 2.1 | **Actor picker** (more avatars from existing MIT Rocketbox set; choose per shot/subject; size/skin/height) | M | P0 | Content gap; low legal risk (same source and licence) |
| 2.2 | **Actions library v1**: sit, stand, talk (gesture loop), sip chai, hand-over/handshake, look-around | L | P0 | Highest content value; matches the original idea list; competitors' animatics show actions |
| 2.3 | **Action timeline lane** (per-actor clips with start/duration) | M | P0 | Needed to sequence actions with camera moves |
| 2.4 | **Actor placement and path** (click-to-place, simple waypoints) | M | P1 | Basic blocking; narrows gap with Shot Designer |
| 2.5 | **Top-down blocking diagram export** (overhead view with camera/actor paths, printable) | M | P1 | Shot Designer's signature feature; reuses set view |
| 2.6 | **Performance guard** (poly/texture budget, auto Light mode thresholds retuned) | S | P0 | Prevents regressions on low-end laptops |

**Dependency:** 2.3 requires 2.2; 2.4 and 2.5 depend on 2.1.
**Done when:** a two-person chai-stall conversation (sit, talk, sip) with a push-in plays and exports in <60 s authoring time for a new user.

## Phase 3 — Indian content and language (v0.6)

**Goal:** become the obvious Indian-context tool.

| # | Feature | Effort | Priority | Rationale |
|---|---|---|---|---|
| 3.1 | **UI localisation framework** (string table, language switch, font loading for Tamil/Devanagari embedded as subsets) | M | P0 | Prerequisite; nobody benchmarked serves Indic languages; 98% of Indian internet users use Indic content ([Kantar-IAMAI via Business Today](https://www.businesstoday.in/amp/technology/news/story/indias-internet-revolution-key-insights-from-kantar-and-iamai-report-461043-2025-01-16)) |
| 3.2 | **Tamil + Hindi UI** (then Telugu/Malayalam/Kannada/Bengali/Marathi via community contributions) | M | P0 | Table stakes for stated audience; community-translatable |
| 3.3 | **Costume packs v1** (kurta, saree, dhoti/lungi, school uniform, formal shirt; as texture/mesh swaps on existing rigs) | L | P1 | India fit; keep assets self-made/CC0 |
| 3.4 | **Set packs v1**: tea stall (existing), village street, tiled living room, auto-rickshaw stand, temple courtyard, small office, school classroom | L | P1 | Content depth; ship as optional packs (separate files) to protect size budget |
| 3.5 | **Props**: chai glass/cup, plastic chair, scooter, auto, lamp | M | P1 | Needed by actions and sets |
| 3.6 | **Time-of-day lighting presets** (dawn, noon, golden hour, dusk, night with street lights) | S-M | P1 | Cheap, high visual payoff, extends existing looks |

**Release plan:** v0.6 = 3.1 + 3.2 (+ 3.6); v0.6.1 = first costumes/props; v0.6.2 = first extra set pack.
**Done when:** the full UI and onboarding work in Tamil and Hindi without layout breaks.

## Phase 4 — Reach: mobile and Windows (v0.7)

**Goal:** run where the audience actually is.

| # | Feature | Effort | Priority | Rationale |
|---|---|---|---|---|
| 4.1 | **Touch/phone layout** (responsive panels, gesture orbit/pinch, larger controls) | L | P0 | Android ~92% of Indian mobile ([StatCounter](https://gs.statcounter.com/os-market-share/mobile-/india)); Apple-only incumbent Previs Pro |
| 4.2 | **PWA install (offline cache)** | S-M | P1 | Android installation without an app store; check CSP/offline constraints |
| 4.3 | **Windows installer via Tauri 2** (WebView2; choose bootstrapper vs offline installer for no-network labs) | M | P0 | Windows ~78% of desktop ([StatCounter](https://gs.statcounter.com/os-market-share/desktop-operating-systems/india)); typical Tauri installers are far smaller than Electron (e.g. ~12 MB vs ~201 MB in one comparison, [HackerNoon](https://hackernoon.com/six-months-with-tauri-the-benefits-and-the-bill)); offline lab deployment possible per [Tauri docs](https://v2.tauri.app/distribute/windows-installer/) |
| 4.4 | **Native file save/open and folder asset packs in the exe** | M | P1 | Smoother than browser downloads; enables optional large packs |
| 4.5 | **Signed-installer plan** (SmartScreen reputation; cost is a recurring expense **[Est.]**) | S | P1 | Unsigned exes trigger warnings that reduce trust |

**Done when:** a lab PC without internet can install and run Kalki; a mid-range Android phone runs a 3-shot scene in Light mode.

## Phase 5 — Teaching and professional polish (v0.8)

| # | Feature | Effort | Priority | Rationale |
|---|---|---|---|---|
| 5.1 | **Lesson scenes/templates** ("Learn 18 moves", "Shot sizes", "180° rule", "Lens comparison") | M | P0 | Film-school niche; low production cost; strong marketing |
| 5.2 | **Instructor kit**: assignment file + checklist, side-by-side before/after compare | M | P1 | Institution licence story |
| 5.3 | **Shot templates and presets library** (dialogue OTS, walk-and-talk, reveal) | M | P1 | Speeds creators; shows grammar |
| 5.4 | **Storyboard sheet and PDF theming** (logo, scene/shoot-day metadata, language) | S | P2 | Professional polish |
| 5.5 | **Camera-rig props** (dolly track, jib, gimbal, handheld shake profiles) with visible rig | M | P1 | Realism vs FrameForge/Cine Designer; teaches how to achieve a move cheaply |
| 5.6 | **Budget-friendly alternatives hints** ("how to get this move with a phone and a bucket") | S | P2 | India fit, content marketing |

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
