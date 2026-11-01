# Kalki · Competitor Benchmark

*Prepared October 2026. Prices are as reported by the cited pages at the time of research and often disagree between sources; verify before relying on them. Cells marked **[Est.]** are judgement calls or unverified. "Kalki" = v0.7.0 as built in the repository on 1 November 2026 (the first version of this table described v0.3.1). Competitor cells were last researched in October 2026 and not re-checked.*

## 1. Competitors reviewed

| Tool | Category | One-line description |
|---|---|---|
| **Previs Pro 3** | Previs / 3D storyboard | iPad/iPhone/Mac app: 3D scenes, actors, props, animatics, AI lighting; free tier with watermark |
| **Shot Designer** | Shot planning (2D) | Overhead camera/blocking diagrams linked to a shot list; free, Pro upgrade adds export and desktop |
| **Cine Designer** (Cinematography Database) | Equipment/lighting plan | Library of camera and lighting equipment for diagrams; later a Cinema 4D plugin and an Unreal Engine blueprint set. Several unrelated products share the name |
| **FrameForge Previz Studio** | Previs (desktop) | Long-running Windows/Mac previs with virtual cameras and storyboard output; Emmy for technical achievement |
| **Blender / Unreal / Unity** | General 3D / game engines | Free but general; previs via cameras, sequencers and manual setup |
| **StudioBinder** | Production management | Shot lists, storyboards (image-based), call sheets, scheduling; web, subscription |
| **Boords** | Storyboard | Web storyboard/animatic tool, AI image credits; subscription |
| **Runway / Kling** | Generative AI video | Text/image-to-video used informally for "previs" |

## 2. Feature matrix

Legend: ● strong/yes, ◐ partial, ○ none/not found, ? unverified.

| Capability | **Kalki v0.7.0** | Previs Pro 3 | Shot Designer | Cine Designer | FrameForge | Blender / Unreal / Unity | StudioBinder | Boords | Runway / Kling |
|---|---|---|---|---|---|---|---|---|---|
| **Price (as reported)** | Free to use today; proprietary licence, all rights reserved (not open source); no watermark, no account | Free tier (watermark); ~US$39.99/mo, US$179-180/yr, or ~US$399-400 lifetime ([RedShark](https://www.redsharknews.com/previs-pro-3-launches-with-animatics-and-free-tier), [TechRadar](https://www.techradar.com/pro/this-pro-grade-filmmaking-tool-just-introduced-a-free-way-to-create-3d-storyboards-and-animations)) | Free; ~US$19.99 Pro in-app (older review; verify) ([review](https://theblackandblue.com/?p=8466)) | ~US$525 (C4D plugin; listed as not currently for sale) ([Gumroad](https://cinematographydb.gumroad.com/l/bziNeO)) | Core ~US$379, Pro ~US$569, Stereo 3D ~US$849 (undated); older editions US$569-1,049 ([ProVideo Coalition](https://provideocoalition.com/?p=15612), [Videoguys](https://videoguys.com/blogs/news-and-sales/black-friday-special-30-off-frameforge-previz-studio-3-5)) | Blender free (GPL) ([Blender](https://www.blender.org/support/faq/)); Unreal/Unity free tiers with terms (**verify**) | Free (limited); Starter US$49/mo, Indie US$99/mo, Pro US$149/mo ([StudioBinder support](https://support.studiobinder.com/en/articles/10106468-choosing-the-right-studiobinder-plan), [Fitgap](https://us.fitgap.com/products/studiobinder)) | Reported ~US$39-250/mo; sources conflict ([Boords](https://boords.com/pricing), [help](https://help.boords.com/articles/841665-free-plus-team-plans)) | Runway Standard ~US$12/user/mo billed annually ([Runway](https://www.runwayml.com/pricing)); Kling ~US$7-10/mo entry, sources conflict |
| **Platform** | Any modern browser (Chrome/Edge recommended); Windows installer (Tauri); phone-width layout (tested only in a headless browser) | iPad, iPhone, Mac (some sources say iPad-first; Android claim unreliable) | iOS, Android(?), desktop with Pro | Windows/Mac via C4D; or Unreal | Windows, Mac | Win/Mac/Linux | Web | Web | Web/cloud |
| **Offline** | ● (no network by CSP) | ● (native app; AI features likely need cloud **[Est.]**) | ● | ● | ● | ● | ○ | ○ | ○ |
| **Account needed** | ○ none | ◐ (App Store; Pro accounts) **[Est.]** | ◐ | ○ | ○ (licence key) | ○ | ● | ● | ● |
| **Learning curve** | Low | Low-medium | Low | High | Medium | High | Low | Low | Very low |
| **3D scene** | ◐ three sets (chai stall, village street, terrace), seven avatars, costumes | ● | ○ (2D) | ● (if used in C4D/UE) | ● | ● | ○ | ○ | n/a (generated) |
| **Camera-move library (named)** | ● 18 moves (push-in, orbit, dolly zoom, crane…) | ◐ (animatable camera) **[Est.]** | ◐ (path drawing) | ◐ | ◐ | ○ (manual keyframes) | ○ | ○ | ◐ (prompt/camera controls vary by model, **unverified**) |
| **Lens realism** (focal length, FOV, aperture/DOF) | ◐-● focal length, f/1.4-f/11 DOF, bloom, motion blur, grain, sensor presets (Super 35, full frame, APS-C, Micro 4/3, 1-inch) with full-frame equivalents; no anamorphic squeeze | ● (real camera/lens presets; **verify**) | ◐ (FOV on diagram) | ● (physical gear library) | ● (physical cameras in Pro edition) | ● (physical camera model) | ○ | ○ | ○ (simulated) |
| **Lighting** | ◐ window light + sun shafts, looks | ● (AI Light Grade) | ○ | ● | ◐-● (Pro) | ● | ○ | ○ | ◐ (prompt) |
| **Actors / actions** | ● twelve actions with a timed action lane, click-to-place actors, multi-point walk paths | ● posed characters | ◐ (icons) | ◐ | ● | ● (if authored) | ○ | ○ | ● (generated) |
| **Timeline / animatic** | ● timeline, preview video | ● animatics | ● (animated diagrams) | ◐ | ◐ | ● | ○ | ◐ (animatic) | n/a |
| **Shot list export** | ● CSV and PDF (with camera rig) | ● | ● (Pro: export/print) | ○ | ● | ○ | ● | ◐ | ○ |
| **Storyboard / image export** | ● PNG frame, storyboard sheet PDF, top-down blocking diagram PDF | ● | ◐ | ◐ | ● | ◐ | ● | ● (PDF etc.) | n/a |
| **Video export** | ● WebM preview | ● | ◐ | ○ | ◐ | ● | ○ | ◐ | ● (is the output) |
| **Vertical 9:16 / Reels framing** | ● built in | ◐ **[Est.]** | ○ | ○ | ◐ | ◐ (manual) | ○ | ◐ | ● |
| **Code/JSON scene mode** | ● | ○ | ○ | ○ | ○ | ● (Python/scripting) | ○ | ○ | ○ |
| **Indian context** (sets, costumes, language) | ◐-● chai stall, village street and terrace sets, Indian costumes, Tamil/Hindi UI | ○ | ○ | ○ | ○ | ○ (community assets only) | ○ | ○ | ◐ (can prompt) |
| **Indic-language UI** | ● Tamil and Hindi (no native-speaker review yet) | ○ **[Est.]** | ○ **[Est.]** | ○ | ○ | ◐ (Blender has some translations; **verify**) | ○ | ○ | ○ |
| **Reference-video camera analysis** | ● offline; shots, camera-move estimates with confidence, suggestions and a simulation (no ML model; shot size and framing not detected yet) | ○ (not found) | ○ (not found) | ○ | ○ (not found) | ○ | ○ | ○ | ○ (generates video, does not critique it) |
| **Camera-rig guidance** | ● eight rigs drawn in the set view with budget tips | ○ **[Est.]** | ○ | ● equipment library (the product's purpose) | ◐ (Pro: physical cameras) | ○ (manual) | ○ | ○ | ○ |
| **Lessons / templates** | ● seven lesson scenes and five shot templates | ◐ **[Est.]** | ◐ **[Est.]** | ○ | ◐ **[Est.]** | ○ | ◐ (document templates) | ◐ | ○ |
| **Collaboration / sharing** | ◐ file share (.kalki.json) | ● cloud | ● sync / team (Pro) | ○ | ○ | ◐ | ● | ● | ◐ |
| **Determinism / exact control** | ● | ● | ● | ● | ● | ● | n/a | n/a | ○ (stochastic) |

Notes:
- Price comparisons use USD as published; INR equivalents depend on the exchange rate and are not shown.
- Where a cell is **[Est.]** or **verify**, no source in the research confirmed it.
- Previs Pro: sources disagree on platforms and pricing; the free tier (watermarked storyboards, limited AI props, one animatic) is from [RedShark](https://www.redsharknews.com/previs-pro-3-launches-with-animatics-and-free-tier) and [Digital Production](https://digitalproduction.com/2025/09/22/animatics-ai-lighting-and-a-free-tier-previs-pro-3-expands-storyboarding-on-ipad/).
- Runway: 125 one-time free credits; roughly 5 credits per second for Gen-4 Turbo at ~US$0.01/credit per third-party estimates, so ~US$3/min for Turbo. Third-party; unverified ([MagicHour](https://magichour.ai/blog/runway-ml-pricing)).
- Camera-control claims for generative tools were not verified in this research.

## 3. Comparison on the dimensions that matter to Indian users

| Dimension | Kalki | Closest alternative | Verdict |
|---|---|---|---|
| Cost | Free | Previs Pro free tier (watermarked) or Blender | Kalki equal on cost, better on "no watermark/no account" |
| Offline / low-data | Yes, whole app in one file | Blender, FrameForge | Kalki easiest to install/share (USB, WhatsApp-sized file, subject to size growth) |
| Time-to-first-shot | Minutes | Previs Pro | Parity; Kalki wins on zero install |
| Android/phone | Browser with a phone layout since v0.7.0 (tabs, touch-sized controls); not yet tried on a real phone; no native app | None strong (Previs Pro Apple-only) | **Open opportunity**, partly addressed: ~92% Android ([StatCounter](https://gs.statcounter.com/os-market-share/mobile-/india)) |
| Camera/lens realism | Good | FrameForge Pro, Blender | Kalki now has sensor presets; still behind on physical camera models and lighting fidelity, ahead of 2D tools |
| Output for crew | CSV, PDF shot list, storyboard sheet, blocking diagram, PNG, WebM | Shot Designer Pro, StudioBinder, Previs Pro | **Parity on formats**; competitors still lead on collaboration and polish (theming, comments) |
| Content library | 3 sets, 7 avatars, 12 actions, costumes and a few props | Previs Pro, FrameForge | **Still a gap** in breadth (props, poses, set variety) |
| India fit | Chai stall and two more Indian sets, costumes, Tamil/Hindi UI, Reels 9:16 | All Western | **Unique**; keep deepening |
| Teaching use | Lesson scenes and templates; no assignment/grading kit yet | FrameForge education pricing (e.g. discounted student plan during COVID, [FrameForge](https://www.frameforge.com/pages/site-license-covid19)) | Open niche |

## 4. Kalki gaps (prioritised by evidence; updated for v0.7.0)

Closed since the first version of this benchmark: print-ready hand-off documents (shot-list PDF, storyboard sheet, blocking diagram), sensor/lens presets, actions and blocking, Tamil/Hindi UI, a Windows installer, a first phone layout, lessons/templates and camera-rig guidance.

Still open:
1. **Content breadth.** Three sets, seven avatars and a handful of props against competitors' large libraries.
2. **Physical camera and lighting fidelity.** No camera/lens bodies, anamorphic squeeze or light-fixture library as in FrameForge Pro or Cine Designer.
3. **Real-device mobile.** The phone layout is untested on real devices; there is no native app or installable offline web app.
4. **Reference images** in shot notes, and shot-size/framing detection in the video analysis; the analysis report has no PDF yet.
5. **Teaching kit.** Lessons exist; assignments, checklists and before/after comparison do not.
6. **Trust and distribution.** The Windows installer is not code-signed; the Tamil/Hindi text has had no native-speaker review; no user research yet.
7. **Collaboration.** File sharing only (acceptable for an offline product).
8. **Licence clarity for institutions.** The project is proprietary; pricing and institutional terms are undefined.

## 5. Kalki's unique strengths (verified vs competitors in this research)

1. **Zero-install, zero-account, zero-network** single file with a strict CSP; no benchmarked 3D previs tool matches this combination.
2. **Free to use, no watermark, no credits, no account** (the licence is proprietary, so it is not open source).
3. **Cinema-grammar-first design**: 18 named moves with ease/speed/lens/DOF as parameters; closer to how directors think than keyframing in Blender.
4. **Reels/Shorts 9:16 as a first-class framing** alongside 2.39:1 and 16:9.
5. **JSON/code mode**, enabling templates, scripting and (later) text-to-shot; none of the commercial previs tools reviewed advertise this.
6. **Indian-context starting point** (chai stall, Tamil-script brand) in a market where all benchmarked tools are neutral or Western.
7. **Deterministic**: exact lens, move and timing, unlike generative video.
8. **Offline reference-video analysis** that names the camera moves, suggests changes and plays them as a simulation; no competitor in this research offered it.
9. **Teaching layer built in**: lesson scenes, templates and low-budget rig tips.
10. **Tamil and Hindi interface**; none of the benchmarked tools offered an Indic UI.

## 6. Where competitors are *not* a threat

- **Generative video (Runway/Kling)** produce pictures, not plans: no shot list, no repeatable camera spec. They can complement Kalki (export a frame as a reference image). Their per-minute costs are meaningful at scale (Runway Gen-4 Turbo ~US$3/min by third-party figures).
- **StudioBinder/Boords** are production-management/storyboard tools with no real 3D camera; hand-off format, not simulation, is what to learn from them.
- **Blender/Unreal/Unity** can do everything but not quickly; this is Kalki's teaching and onboarding advantage.

## 7. Implications for the roadmap

| Finding | Roadmap response |
|---|---|
| Hand-off documents are the standard paid feature in competitors | v0.4: PDF shot list + storyboard sheet (done in v0.4 and v0.4.1) |
| Real-camera vocabulary is expected | v0.4: lens/sensor presets (done in v0.4) |
| Content library is the main perceived-value gap | v0.5-v0.6: actor picker, actions, costumes, sets (done in v0.5 to v0.6.1) |
| No competitor serves Indic languages | v0.6: Hindi/Tamil UI (done in v0.6.0) |
| Android dominates, Apple-only incumbents | Touch/mobile layout (v0.7.0; real-device testing and offline web install still open) |
| Labs/IT prefer installers | Tauri Windows exe (done in v0.4.1; code signing still open) |
| Generative tools are cheap but unpredictable | v0.9+: optional local text-to-shot via JSON |

## Sources

- Previs Pro: <https://www.redsharknews.com/previs-pro-3-launches-with-animatics-and-free-tier>, <https://www.techradar.com/pro/this-pro-grade-filmmaking-tool-just-introduced-a-free-way-to-create-3d-storyboards-and-animations>, <https://digitalproduction.com/2025/09/22/animatics-ai-lighting-and-a-free-tier-previs-pro-3-expands-storyboarding-on-ipad/>, <https://nofilmschool.com/previs-pro-review>, <https://www.videomaker.com/news/previs-pro-brings-pro-storyboarding-to-your-iphone/>
- Shot Designer: <https://theblackandblue.com/?p=8466>, <https://apps.apple.com/mo/app/id556342711>
- Cine Designer: <https://cinematographydb.gumroad.com/l/bziNeO>
- FrameForge: <https://provideocoalition.com/?p=15612>, <https://videoguys.com/blogs/news-and-sales/black-friday-special-30-off-frameforge-previz-studio-3-5>, <https://www.frameforge.com/pages/site-license-covid19>
- Blender: <https://www.blender.org/support/faq/>
- StudioBinder: <https://support.studiobinder.com/en/articles/10106468-choosing-the-right-studiobinder-plan>, <https://us.fitgap.com/products/studiobinder>
- Boords: <https://boords.com/pricing>, <https://help.boords.com/articles/841665-free-plus-team-plans>
- Runway/Kling: <https://www.runwayml.com/pricing>, <https://magichour.ai/blog/runway-ml-pricing>, <https://metavert.io/compare/runway-vs-kling>
- StatCounter India mobile: <https://gs.statcounter.com/os-market-share/mobile-/india>
