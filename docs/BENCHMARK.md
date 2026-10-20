# Kalki · Competitor Benchmark

*Prepared October 2026. Prices are as reported by the cited pages at the time of research and often disagree between sources; verify before relying on them. Cells marked **[Est.]** are judgement calls or unverified. "Kalki" = v0.3.1 as described in README.md.*

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

| Capability | **Kalki v0.3.1** | Previs Pro 3 | Shot Designer | Cine Designer | FrameForge | Blender / Unreal / Unity | StudioBinder | Boords | Runway / Kling |
|---|---|---|---|---|---|---|---|---|---|
| **Price (as reported)** | Free (MIT) | Free tier (watermark); ~US$39.99/mo, US$179-180/yr, or ~US$399-400 lifetime ([RedShark](https://www.redsharknews.com/previs-pro-3-launches-with-animatics-and-free-tier), [TechRadar](https://www.techradar.com/pro/this-pro-grade-filmmaking-tool-just-introduced-a-free-way-to-create-3d-storyboards-and-animations)) | Free; ~US$19.99 Pro in-app (older review; verify) ([review](https://theblackandblue.com/?p=8466)) | ~US$525 (C4D plugin; listed as not currently for sale) ([Gumroad](https://cinematographydb.gumroad.com/l/bziNeO)) | Core ~US$379, Pro ~US$569, Stereo 3D ~US$849 (undated); older editions US$569-1,049 ([ProVideo Coalition](https://provideocoalition.com/?p=15612), [Videoguys](https://videoguys.com/blogs/news-and-sales/black-friday-special-30-off-frameforge-previz-studio-3-5)) | Blender free (GPL) ([Blender](https://www.blender.org/support/faq/)); Unreal/Unity free tiers with terms (**verify**) | Free (limited); Starter US$49/mo, Indie US$99/mo, Pro US$149/mo ([StudioBinder support](https://support.studiobinder.com/en/articles/10106468-choosing-the-right-studiobinder-plan), [Fitgap](https://us.fitgap.com/products/studiobinder)) | Reported ~US$39-250/mo; sources conflict ([Boords](https://boords.com/pricing), [help](https://help.boords.com/articles/841665-free-plus-team-plans)) | Runway Standard ~US$12/user/mo billed annually ([Runway](https://www.runwayml.com/pricing)); Kling ~US$7-10/mo entry, sources conflict |
| **Platform** | Any modern browser (Chrome/Edge recommended); Windows exe planned | iPad, iPhone, Mac (some sources say iPad-first; Android claim unreliable) | iOS, Android(?), desktop with Pro | Windows/Mac via C4D; or Unreal | Windows, Mac | Win/Mac/Linux | Web | Web | Web/cloud |
| **Offline** | ● (no network by CSP) | ● (native app; AI features likely need cloud **[Est.]**) | ● | ● | ● | ● | ○ | ○ | ○ |
| **Account needed** | ○ none | ◐ (App Store; Pro accounts) **[Est.]** | ◐ | ○ | ○ (licence key) | ○ | ● | ● | ● |
| **Learning curve** | Low | Low-medium | Low | High | Medium | High | Low | Low | Very low |
| **3D scene** | ◐ (one chai-stall set, 2 actors) | ● | ○ (2D) | ● (if used in C4D/UE) | ● | ● | ○ | ○ | n/a (generated) |
| **Camera-move library (named)** | ● 18 moves (push-in, orbit, dolly zoom, crane…) | ◐ (animatable camera) **[Est.]** | ◐ (path drawing) | ◐ | ◐ | ○ (manual keyframes) | ○ | ○ | ◐ (prompt/camera controls vary by model, **unverified**) |
| **Lens realism** (focal length, FOV, aperture/DOF) | ◐-● focal length, f/1.4-f/11 DOF, bloom, motion blur, grain; **no sensor/crop presets yet** | ● (real camera/lens presets; **verify**) | ◐ (FOV on diagram) | ● (physical gear library) | ● (physical cameras in Pro edition) | ● (physical camera model) | ○ | ○ | ○ (simulated) |
| **Lighting** | ◐ window light + sun shafts, looks | ● (AI Light Grade) | ○ | ● | ◐-● (Pro) | ● | ○ | ○ | ◐ (prompt) |
| **Actors / actions** | ◐ 2 actors, idle + walk | ● posed characters | ◐ (icons) | ◐ | ● | ● (if authored) | ○ | ○ | ● (generated) |
| **Timeline / animatic** | ● timeline, preview video | ● animatics | ● (animated diagrams) | ◐ | ◐ | ● | ○ | ◐ (animatic) | n/a |
| **Shot list export** | ◐ CSV | ● | ● (Pro: export/print) | ○ | ● | ○ | ● | ◐ | ○ |
| **Storyboard / image export** | ◐ PNG frame only | ● | ◐ | ◐ | ● | ◐ | ● | ● (PDF etc.) | n/a |
| **Video export** | ● WebM preview | ● | ◐ | ○ | ◐ | ● | ○ | ◐ | ● (is the output) |
| **Vertical 9:16 / Reels framing** | ● built in | ◐ **[Est.]** | ○ | ○ | ◐ | ◐ (manual) | ○ | ◐ | ● |
| **Code/JSON scene mode** | ● | ○ | ○ | ○ | ○ | ● (Python/scripting) | ○ | ○ | ○ |
| **Indian context** (sets, costumes, language) | ◐ chai-stall set, bilingual name; **no Indic UI yet** | ○ | ○ | ○ | ○ | ○ (community assets only) | ○ | ○ | ◐ (can prompt) |
| **Indic-language UI** | ○ (planned) | ○ **[Est.]** | ○ **[Est.]** | ○ | ○ | ◐ (Blender has some translations; **verify**) | ○ | ○ | ○ |
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
| Android/phone | Browser only; UI not tuned for touch **[Est.]** | None strong (Previs Pro Apple-only) | **Open opportunity**: ~92% Android ([StatCounter](https://gs.statcounter.com/os-market-share/mobile-/india)) |
| Camera/lens realism | Good | FrameForge Pro, Blender | Kalki behind on physical cameras and sensors, ahead of 2D tools |
| Output for crew | CSV, PNG, WebM | Shot Designer Pro, StudioBinder, Previs Pro | **Biggest gap**: no PDF, no storyboard sheet |
| Content library | 1 set, 2 actors | Previs Pro, FrameForge | **Big gap** |
| India fit | Chai stall, Reels 9:16, MIT | All Western | **Unique** but thin; needs depth |
| Teaching use | No assignments/lessons | FrameForge education pricing (e.g. discounted student plan during COVID, [FrameForge](https://www.frameforge.com/pages/site-license-covid19)) | Open niche |

## 4. Kalki gaps (prioritised by evidence)

1. **No professional hand-off documents.** Shot Designer Pro, StudioBinder, Boords and Previs Pro all export shot lists/storyboards in print-ready form; Kalki exports CSV and PNG only.
2. **Sparse content.** One set, two actors, idle and walk. Competitors offer many props, characters and poses.
3. **No actions/blocking.** Cannot show a character sitting, sipping chai or talking; limits narrative previs.
4. **No sensor/lens presets.** Real previs and cinematography tools show film-back/sensor, crop factor, anamorphic squeeze. Directors say "35 mm on a Super 35 sensor," not just a focal length **[Est.]**.
5. **No Indic UI.** Even unreached by competitors, this is table stakes for the stated audience.
6. **Phone/tablet usability.** Not designed for touch; Android is the dominant device.
7. **No 2D top-down blocking diagram** like Shot Designer (there is a set view; formal blocking diagrams and camera paths could be printable).
8. **Packaging.** Single HTML works but IT-managed labs often prefer an installer; file size grows with assets.
9. **Collaboration.** File sharing only. (Acceptable for an offline product.)

## 5. Kalki's unique strengths (verified vs competitors in this research)

1. **Zero-install, zero-account, zero-network** single file with a strict CSP; no benchmarked 3D previs tool matches this combination.
2. **Free and MIT-licensed**, no watermark, no credits.
3. **Cinema-grammar-first design**: 18 named moves with ease/speed/lens/DOF as parameters; closer to how directors think than keyframing in Blender.
4. **Reels/Shorts 9:16 as a first-class framing** alongside 2.39:1 and 16:9.
5. **JSON/code mode**, enabling templates, scripting and (later) text-to-shot; none of the commercial previs tools reviewed advertise this.
6. **Indian-context starting point** (chai stall, Tamil-script brand) in a market where all benchmarked tools are neutral or Western.
7. **Deterministic**: exact lens, move and timing, unlike generative video.

## 6. Where competitors are *not* a threat

- **Generative video (Runway/Kling)** produce pictures, not plans: no shot list, no repeatable camera spec. They can complement Kalki (export a frame as a reference image). Their per-minute costs are meaningful at scale (Runway Gen-4 Turbo ~US$3/min by third-party figures).
- **StudioBinder/Boords** are production-management/storyboard tools with no real 3D camera; hand-off format, not simulation, is what to learn from them.
- **Blender/Unreal/Unity** can do everything but not quickly; this is Kalki's teaching and onboarding advantage.

## 7. Implications for the roadmap

| Finding | Roadmap response |
|---|---|
| Hand-off documents are the standard paid feature in competitors | v0.4: PDF shot list + storyboard sheet |
| Real-camera vocabulary is expected | v0.4: lens/sensor presets |
| Content library is the main perceived-value gap | v0.5-v0.6: actor picker, actions, costumes, sets |
| No competitor serves Indic languages | v0.6: Hindi/Tamil UI |
| Android dominates, Apple-only incumbents | v0.5: touch/mobile polish, PWA |
| Labs/IT prefer installers | v0.7: Tauri Windows exe |
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
