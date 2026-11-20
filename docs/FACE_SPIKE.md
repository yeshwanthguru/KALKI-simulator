# Face-detection spike: results

*Spike for roadmap item 5b.4, run 1-2 November 2026. Follows [FRAMING_MODEL_CHECK.md](FRAMING_MODEL_CHECK.md). Nothing here is in a release build.*

## Model card findings (read 2 November 2026)

I read the official model card (6 pages) and the MediaPipe Face Detector page.

- **Licence: still not confirmed.** Neither the card text nor the Face Detector page states a licence for the model file. The page footer says its content is CC BY 4.0 and its *code samples* are Apache-2.0; the card contains a hyperlink to the Apache-2.0 licence text, but that is a link, not a licence grant for the weights. Earlier "Apache-2.0" claims came from third-party mirrors. The owner should ask Google or check the MediaPipe repository's licence terms for model files before shipping.
- **Intended use does not match film frames.** The card lists as out of scope: faces more than about 2 metres from the camera, faces turned away or strongly tilted, and the back of heads. It was trained on smartphone selfie-style photos for AR, "only detects faces that are relatively large", and tells users to consider the result if their domain differs significantly. Its evaluation images had faces at least 15% of the image side; training faces were mostly 5-30% of image area.
- **Fairness figures given by Google** (on its own test sets): average recall 98.4% across perceived genders and 98.1% across five skin-tone groups, varying between 92.5% and 100% across 17 geographic subregions (global average 99.1%); average precision about 99.7% across skin tones. Southern Asia is one of those subregions, but its own figure is in a linked spreadsheet I did not open. These numbers are for large, frontal faces and say little about small faces in film frames.
- **Input handling matches my implementation:** 128x128 RGB in the range -1 to 1, six keypoints, an SSD-style anchor output.

## What was built

| Piece | File | Notes |
|---|---|---|
| TFLite reader | `tools/tflite.mjs`, `tools/tflite-dump.mjs` | Dependency-free reader of the model graph; the dump prints every layer. |
| Converter | `tools/convert-face-model.mjs` | Turns the `.tflite` into a layer list (`assets_src/face/blazeface.json`, 8 KB) and 16-bit weights (`blazeface.bin`, 203 KB). 90 layers, 101,390 weights. |
| Runtime | `src/face.js` | The network in plain JavaScript: no WebAssembly, so the page's content policy is unchanged. Letterboxing, anchors, decoding, duplicate removal, multi-tile search for small faces, and a face-height-to-shot-size mapping. |
| Harness and test | `tools/face-spike.mjs`, `tests/face.test.mjs` (part of `npm test`) | Checks the network and runs it on pictures. |

Model: BlazeFace short-range from the official MediaPipe bucket, 229,746 bytes, MD5 `a3dd6ec31725290770b97cec0cbf94c9` (matches the bucket's published hash). Licence: **not confirmed**: the official model card and documentation page do not state a licence for the model file (see the section above and `assets_src/face/NOTICE.txt`).

## Results (measured)

- **The conversion is faithful where it can be checked.** All 37 convolution and depthwise layers produce exactly the output sizes recorded in the original model, and output is finite. There is no reference runtime on this machine, so numbers could not be compared against TFLite itself; correctness of the values is shown only by the detections below.
- **Speed (Node on this PC):** about 50-80 ms for one 128x128 pass; about 1.1 s when small faces force the multi-tile search. Browser speed was not measured.
- **Size if embedded:** about 203 KB of weights, about 270 KB as base64, plus 8 KB of layer list (about 0.28 MB total, below the 0.5-1 MB budgeted).
- **Detection on Kalki's own CG renders** (classroom set, one frame per shot size, subject A, 50 mm):

| Shot size | Face height / frame | Detected | Mapped to |
|---|---|---|---|
| ECU | 71% | yes, 91% | ECU |
| CU | 31% | yes, 97% | CU |
| MCU | 19% | yes, 97% (plus a second face at 54%) | MCU |
| MS | 13% | yes, 96% (only with the tile search; a single pass misses it) | MS |
| FS | 6% | yes, 96% and 87% (both actors) | FS |
| WS | below about 3% | **no** | not detected |

The thresholds in `sizeFromFace` were fitted to these same frames, so this is a consistency check, not an accuracy measurement.

## What is not known (needs real footage)

- Accuracy on **real faces**, including Indian faces, dark skin tones, low light, backlighting, masks, beards, side views, partial faces. The only pictures tested are CG renders of seven avatars' faces (Meera and Arjun).
- False positives on real scenes (posters, statues, crowds). A blank picture gives none.
- Whether the face-height thresholds hold for real framing (a face fills different fractions of frame depending on lens and subject).
- Browser speed on low-end laptops.

## Limits that will remain

- Faces only: wide shots, backs of heads, hands and objects give "not detected". The report must say so rather than guess; the manual shot-size dropdown (v0.7.2) stays as the override.
- Small faces need the slower tile search, so analysing every shot could add roughly 1-3 s per shot **[Est.]**.

## Recommended next steps

1. **Licence (owner):** the card does not settle it. Ask Google (or check the licence terms of the MediaPipe repository and model bucket) whether the weights may be redistributed in a proprietary product. If yes, add the attribution to `THIRD-PARTY-NOTICES.txt`; if not, choose another model or train one on data you may use.
2. **Real-clip test (owner):** provide 10-20 short clips you have the right to use (Indian faces, mixed lighting, close to wide). I will run the detector on a frame per shot and report hit rate and size-class agreement against your own labels.
3. **Integrate only if** the hit rate on close and medium shots is clearly good: fill the shot-size dropdown with the detected size marked "auto" (user can override), and show "not detected" for the rest. Needs a larger video frame than the current 192x108 thumbnail (about 640 px wide), embedding the model, and a progress step in the analysis.
4. If the licence or accuracy is not acceptable, drop the model and keep the manual dropdown; nothing in the shipped app depends on this spike.
