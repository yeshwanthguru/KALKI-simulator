# Kalki · Market Analysis (India)

*Prepared October 2026. Figures marked **[Est.]** are the author's estimates or reasoned assumptions, not sourced facts. Third-party figures vary by source and definition; where sources conflict this is stated. Prices change often: re-verify before acting on any of them.*

## 1. Summary

Kalki is a free-to-run, offline, single-file camera-movement simulator with an Indian set and a vertical/Reels framing option. The India opportunity is real but is **a volume-of-users, low-revenue-per-user market**. Evidence points to:

1. A large, fast-growing pool of video creators and a mobile-first, Indic-language internet (see §3).
2. Professional previs tools priced in USD at levels that are out of reach for most indie users (Previs Pro lifetime ~US$399, StudioBinder from US$49/month, FrameForge Core ~US$379; see BENCHMARK.md).
3. The realistic alternative for most users is "no previs at all" or free-but-hard tools (Blender, Unreal), not a paid competitor. Kalki competes with the learning-curve cost, not mostly with price.
4. Monetisation should be modest and optional (donations, small one-time licence, education site licences, asset packs). **[Est.]**

## 2. Target segments

| Segment | Who | Job to be done | Fit with Kalki today | Willingness to pay **[Est.]** |
|---|---|---|---|---|
| **Indie / short-film makers** | Tamil, Telugu, Malayalam, Hindi etc. indie directors, DOPs, assistant directors; ad and music-video freelancers | Plan camera moves and lens choices before a costly shoot day; communicate to DOP/crew; produce a shot list | Strong: 18 moves, lens/DOF, CSV shot list. Gaps: PDF shot list, storyboard sheet, own locations/sets | Low to medium. Will pay a small one-time fee if it saves a shoot day; most will use free |
| **YouTubers / Reels / Shorts creators** | Solo and small-team creators, often shooting on phones/mirrorless | Plan a 9:16 or 16:9 sequence, learn "cinematic" moves, impress with better b-roll | Good: 9:16 framing, offline, no account. Gaps: phone-friendly UI, templates, faster onboarding, regional UI | Low. Price-sensitive; prefers free or bundled (see Canva/Jio example in §5) |
| **Film schools and film-making courses** | Government institutes (FTII, SRFTI), private colleges, mass-comm departments, short-course academies | Teach camera grammar (shot sizes, lenses, blocking) without a camera kit; assignments | Very good: offline (labs with poor connectivity), no account, free, runs in a browser on lab PCs. Gaps: assignment/grading export, lesson plans, lab deployment (exe) | Low per seat but institution-level purchase or grant possible; slow sales cycle |
| **Hobbyists / students (self-taught)** | Learners following YouTube cinematography tutorials | Understand what a dolly zoom or 85 mm at f/1.8 looks like | Good as a learning toy | Near zero |

Recommended **primary** segment for v0.4-v0.6: **YouTubers/Reels creators and film students** (largest reach, lowest friction, best fit with a free offline HTML tool). **Secondary:** indie filmmakers (they need the export artefacts: PDF, storyboard). **Tertiary/longer-term:** institutional deals.

## 3. Market size and trends (with caveats)

| Indicator | Figure | Source / note |
|---|---|---|
| Indian media & entertainment (M&E) revenue 2025 | ~₹2.78 lakh crore (~US$32bn), +9% YoY; digital media (>₹1 lakh crore) now the largest segment, ahead of TV | FICCI-EY M&E report 2026, via [Storyboard18](https://storyboard18.com/how-it-works/ficci-ey-report-me-industry-hits-%e2%82%b9278000-crore-in-2025-as-digital-surges-past-television-92983.htm), [Free Press Journal](https://www.freepressjournal.in/amp/business/indias-me-sector-crosses-278-lakh-crore-in-2025-digital-ads-live-events-drive-strong-9-growth) |
| Film segment 2025 | ~₹20,500 crore; >1,900 releases; digital/satellite rights values fell as streamers cut content spend | Same FICCI-EY coverage. A large number of releases implies many small productions, but also a squeeze on budgets |
| M&E outlook | ~₹3.3 trillion (~US$37.9bn) by 2028 (forecast) | Same sources |
| India creator economy size | US$1.46bn in 2025 → US$5.93bn by 2032 (forecast; base year labelling inconsistent in the source) | [Coherent Market Insights](https://www.coherentmi.com/industry-reports/india-creator-economy-market) (commercial research firm: treat as indicative) |
| Number of creators | 0.96 million (2020) → 4.12 million (2025) per ISB; Kotak AMC claims >100 million "creators" using a much broader definition | [ISB](https://prodcd.isb.edu/media/ykmjlwaj/india_creator_economy_interactive_report.html), [Kotak MF](https://www.kotakmf.com/Information/blogs/inside-india-creator-economy). The ~4 million figure is the more useful one for "serious" creators |
| YouTube India impact 2025 | >₹18,000 crore GDP contribution, ~9.6 lakh FTE jobs; >18,000 channels with >1 million subscribers; channels earning six figures (INR) up >30% YoY | [YouTube India Impact Report 2025 via Medianews4u](https://www.medianews4u.com/youtubes-india-creator-economy-crosses-%E2%82%B918000-crore-gdp-impact-supports-9-6-lakh-jobs/), [People Matters](https://www.peoplematters.in/news/business/youtube-ecosystem-adds-over-rs-18000-cr-to-indias-gdp-supports-96-lakh-jobs-in-2025-52494) |
| Internet users | ~886 million active users in 2024, projected >900 million in 2025; rural 488 million (55%); 98% consume content in Indic languages; 57% of urban users prefer regional languages | [Kantar-IAMAI "Internet in India 2024" via Business Today](https://www.businesstoday.in/amp/technology/news/story/indias-internet-revolution-key-insights-from-kantar-and-iamai-report-461043-2025-01-16), [The Week](https://www.theweek.in/wire-updates/business/2025/01/16/dcm51-biz-iamai-internet-usage-report.html) |
| Short-form video | Bain (2021) forecast 600-650 million short-form video users by 2025 (a forecast, not measured) | [Bain press release](https://bain.com/about/media-center/press-releases/2022/short-form-video-india) |
| Desktop OS (India, mid-2026) | Windows ~78%, Linux ~15%, macOS ~3.5% (one StatCounter table; other tables inconsistent). Windows 11 ~56-59%, Windows 10 ~40-43% | [StatCounter](https://gs.statcounter.com/os-market-share/desktop-operating-systems/india), [StatCounter Windows versions](https://gs.statcounter.com/windows-version-market-share/desktop/india) |
| Mobile OS (India, mid-2026) | Android ~92-93%, iOS ~7% | [StatCounter](https://gs.statcounter.com/os-market-share/mobile-/india) |
| Film-school scale | FTII ~112 seats across all courses (2018-19 data); 6,125 candidates took the FTII/SRFTI joint entrance test in 2019 | [FTII](https://ftii.ac.in/media/record-number-of-6125-candidates-across-india-apply-for-ftii-srfti-joint-entrance-test-as-deadline-for-registration-ends), [Careers360](https://www.careers360.com/media-journalism/articles/how-get-admission-in-ftii). Elite institutes are tiny; the bulk of film education is in private colleges and short courses (**no reliable count found**) |

**Reading the numbers.** The creator and internet figures show a large addressable base, but (a) nothing found measures how many creators plan shots in advance, and (b) the creator-economy revenue figure is software-agnostic. **[Est.]** A realistic reachable audience for a niche desktop/browser previs tool is a small fraction of the ~4 million serious creators: tens of thousands of regular users at best over a couple of years, if distribution works.

**Trends that help Kalki**
- Vertical/Reels/Shorts is the default format for Indian creators; most tools treat 9:16 as an afterthought.
- Regional-language content dominates growth: Tamil, Telugu, Malayalam and Hindi UI is a genuine differentiator (no benchmarked competitor offers it; see BENCHMARK.md).
- Streamer budget cuts (FICCI-EY) push filmmakers toward leaner pre-production, favouring cheap or free previs.
- Windows remains the dominant desktop OS, so a Windows installer is the correct first native target.

**Trends that hurt**
- Generative video tools (Runway, Kling, others) are cheap relative to a shoot and are marketed for "previs"; they can take attention from simulators.
- Mobile-first users may never open a desktop simulator; a desktop-only 3D tool misses many Reels creators.

## 4. Pain points (evidence and inference)

Sourced observations come from the competitor pricing/feature review; the rest is inference **[Est.]** to be validated by user interviews (see ROADMAP Phase 0).

1. **Cost and USD pricing.** Leading dedicated previs/shot-planning tools cost US$379+ one-time, or US$40-150 per month ([Previs Pro](https://www.redsharknews.com/previs-pro-3-launches-with-animatics-and-free-tier), [FrameForge](https://provideocoalition.com/?p=15612), [StudioBinder](https://support.studiobinder.com/en/articles/10106468-choosing-the-right-studiobinder-plan)). Very high relative to indie Indian budgets **[Est.]**.
2. **Platform lock-in.** Previs Pro is Apple-only (iPad/iPhone/Mac) while Android is ~92% of Indian mobile ([StatCounter](https://gs.statcounter.com/os-market-share/mobile-/india)). Shot Designer's Pro adds desktop but is a 2D diagram tool.
3. **Learning curve.** Blender/Unreal/Unity are free but require rigging, lighting and camera setup knowledge; a previs-only user does not want to learn a DCC tool **[Est.]**.
4. **Cultural fit.** Western tools ship Western sets, props and characters. Indian users want chai stalls, autos, tiled interiors, temple/street exteriors, sarees/dhotis/kurtas **[Est.; based on Kalki's own positioning]**.
5. **Connectivity and hardware.** Cloud AI tools need data and credits; lab and low-end laptops matter. Offline CPU-friendly operation is valuable.
6. **Language.** English-only UI is a barrier for a share of film students and small-town creators **[Est.]**. Indic-language usage is near-universal among internet users per Kantar-IAMAI.
7. **Communication of intent.** Directors need to hand the DOP something concrete: PDF shot list, storyboard, reference frames.

## 5. Pricing and willingness to pay

What the evidence supports:

- **Free is the competitive baseline for individuals**: Blender is free under GPL ([Blender](https://www.blender.org/support/faq/)); Previs Pro, Shot Designer and StudioBinder all have free tiers or free downloads with limits.
- **Indian consumers respond to flexible, low-price or bundled models.** Canva offers one-day/one-week passes in India and is bundled by Jio into prepaid plans for students and creators ([T2 Online](https://t2online.in/tech/tech-news/jio-and-canva-partner-to-offer-free-premium-subscriptions-to-eligible-users/2008038), [TelecomTalk](https://telecomtalk.info/reliance-jio-x-canva-what-you-need/1011889/)). Canva Pro India prices were reported inconsistently (₹1,299/yr vs ~₹4,000/yr), so no number is relied on here.
- No survey of Indian creators' willingness to pay for previs software was found.

Suggested model **[Est.; validate before committing]**:

| Tier | Price point (INR) | What | Rationale |
|---|---|---|---|
| Free (core) | ₹0 | Single-file HTML, all current features | Distribution, trust, school adoption (the repository licence is now proprietary, so "free" is a pricing choice, not an open-source commitment) |
| Supporter / Pro pack | one-time ₹499-1,499 | Windows exe, extra actors/sets/costume packs, PDF/storyboard export, Indic UI packs? | Priced near impulse range for working freelancers; far below US$379+ |
| Institution licence | ₹10,000-50,000 per year per lab/department | Lab installer, lesson packs, assignment export, support | Schools buy per department, not per head |
| Alternatives | Donations / sponsorships / grants | | Low effort; consider film-body or cinematographer-community sponsors |

Licensing note (updated November 2026): the repository was changed from MIT to a proprietary, all-rights-reserved licence. Paid add-ons and institution terms can therefore include core features, but the early "free and open-source" positioning no longer applies, and any community route (translations, assets) needs an explicit contribution policy. Third-party assets (Rocketbox, three.js, both MIT) remain permissive; any bought or generated costume or set assets need their own licence check.

## 6. Positioning

> **"See your shot before you shoot it" for Indian filmmakers and creators: free, offline, instant, in your language.**

Differentiators to lead with (all verified against README/BENCHMARK):
1. Opens by double-click, works offline, no account, no network access (strict CSP).
2. Indian context: chai-stall set, Tamil name (கல்கி), Reels/Shorts framing, planned Indic UI.
3. Camera grammar first: 18 named moves, lens/aperture/DOF, looks, timeline.
4. Free to use with no watermark or account (proprietary licence; not open source).

Avoid positioning against: full 3D previs suites (FrameForge, Unreal) on realism, or generative AI video on photorealism. Position as the *fast planning* layer that outputs a shot list and storyboard you can hand to a crew, and as a *teaching tool*.

Naming note: the product is now named Kalki Simulator (short: Kalki; Tamil கல்கி), replacing the earlier working name Kalai. Releases up to v0.3.1 shipped as Kalai, so keep a short "formerly Kalai" note in the README and release notes. (Naming trademark searches were not part of this study.)

## 7. Risks

| Risk | Likelihood / impact **[Est.]** | Mitigation |
|---|---|---|
| **Low willingness to pay** | High / High for revenue | Treat as distribution-first; keep costs near zero; seek institutional and sponsorship income |
| **Mobile-first audience** | Medium-High / High | Keep the mobile browser experience viable (touch UI, Light mode); consider PWA before native Android |
| **AI video tools commoditise "previs"** | Medium / Medium | Stress deterministic control (exact lens, move, timing) and shot-list artefacts that AI tools do not produce; optionally integrate (export reference frames/prompts) |
| **Asset licensing / content risk** (costumes, sets, real brands, actors' likeness) | Medium / Medium | Only use CC0/MIT or self-made assets; keep a licence register; no brand logos |
| **Browser limitations** (WebGL variance, memory, WebM encoding differences, file size growth with bundled assets) | Medium / Medium | Size budget per release; test Chrome/Edge/Firefox; Light mode; consider Tauri exe |
| **Single-file size growth** from actors/sets/textures | High / Medium | Compression (Draco/meshopt/KTX2), optional asset packs loaded from local files, not bundled by default |
| **Proprietary licence vs community goodwill** | Low-Medium / Reputational | Do not claim "open source"; state clearly what users may do; publish a contribution policy if accepting translations |
| **Local LLM feature** (heavy models, hardware, trust) | Medium / Medium | Keep optional and separate; ship only after core export features |
| **Key-person / maintenance** | Medium / High | Small, well-scoped releases; documentation; contributors |
| **Competitor response** (Previs Pro free tier already exists; could add Android/Indic) | Low-Medium / Medium | Compete on offline, free, India context, and teaching |

## 8. Validation plan (cheap, before large builds)

1. 10-15 short interviews: 5 YouTubers/Reels creators, 5 indie DOPs/ADs, 3-5 film-school instructors. Ask what they use now, what they pay, what they'd export.
2. Instrument nothing in-app (privacy promise); use a short in-app link to an optional feedback form or GitHub issues instead.
3. Release a classroom demo kit with 3-4 lesson scenes; ask 2-3 instructors to try it.
4. Track downloads (GitHub release counts) as the one objective adoption measure.

## Sources

- FICCI-EY M&E 2026: <https://storyboard18.com/how-it-works/ficci-ey-report-me-industry-hits-%e2%82%b9278000-crore-in-2025-as-digital-surges-past-television-92983.htm>, <https://www.freepressjournal.in/amp/business/indias-me-sector-crosses-278-lakh-crore-in-2025-digital-ads-live-events-drive-strong-9-growth>, <https://www.ey.com/en_in/insights/media-entertainment/stories-scale-and-impact-unlocking-india-s-m-e-economy>
- Coherent Market Insights, India creator economy: <https://www.coherentmi.com/industry-reports/india-creator-economy-market>
- ISB creator economy report: <https://prodcd.isb.edu/media/ykmjlwaj/india_creator_economy_interactive_report.html>
- Kotak MF: <https://www.kotakmf.com/Information/blogs/inside-india-creator-economy>
- YouTube India Impact 2025: <https://www.medianews4u.com/youtubes-india-creator-economy-crosses-%E2%82%B918000-crore-gdp-impact-supports-9-6-lakh-jobs/>, <https://www.peoplematters.in/news/business/youtube-ecosystem-adds-over-rs-18000-cr-to-indias-gdp-supports-96-lakh-jobs-in-2025-52494>
- Kantar-IAMAI Internet in India 2024: <https://www.businesstoday.in/amp/technology/news/story/indias-internet-revolution-key-insights-from-kantar-and-iamai-report-461043-2025-01-16>, <https://www.theweek.in/wire-updates/business/2025/01/16/dcm51-biz-iamai-internet-usage-report.html>
- Bain, short-form video India: <https://bain.com/about/media-center/press-releases/2022/short-form-video-india>
- StatCounter India: <https://gs.statcounter.com/os-market-share/desktop-operating-systems/india>, <https://gs.statcounter.com/windows-version-market-share/desktop/india>, <https://gs.statcounter.com/os-market-share/mobile-/india>
- FTII/SRFTI: <https://ftii.ac.in/media/record-number-of-6125-candidates-across-india-apply-for-ftii-srfti-joint-entrance-test-as-deadline-for-registration-ends>, <https://www.careers360.com/media-journalism/articles/how-get-admission-in-ftii>
- Canva India/Jio: <https://t2online.in/tech/tech-news/jio-and-canva-partner-to-offer-free-premium-subscriptions-to-eligible-users/2008038>, <https://telecomtalk.info/reliance-jio-x-canva-what-you-need/1011889/>
- Competitor pricing: see BENCHMARK.md sources.
