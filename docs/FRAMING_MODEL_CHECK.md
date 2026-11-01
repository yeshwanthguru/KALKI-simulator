# Shot-size and framing detection: model and licence check

*Roadmap item 5b.4, checked 1 November 2026. Figures come from the cited pages; items marked **[Est.]** are judgement calls and **[Verify]** must be confirmed before any decision.*

## Goal

For each shot found in a reference video, estimate the shot size (wide, medium, close-up) and where the subject sits in the frame (headroom, thirds, looking room), so the suggestions engine can say more than "pace" and "move" advice. Everything must stay offline, inside the single HTML file, under the existing strict Content Security Policy.

## Constraints in this project

- The page's policy is `default-src 'none'; script-src 'unsafe-inline'; ...` (see `src/index.html`). It has **no** `'wasm-unsafe-eval'`, so browsers will not compile WebAssembly today. Any WebAssembly-based runtime needs a deliberate policy change.
- Models must be embedded as base64 in the HTML (size counts toward the 8.5 MB file) and their licences must allow redistribution in a proprietary product.
- Third-party licences are listed in `THIRD-PARTY-NOTICES.txt`.

## Candidates

| Option | What it is | Size | Licence (as found) | Main concern |
|---|---|---|---|---|
| **BlazeFace short-range** (MediaPipe) | Face detector, 128x128 input, float16 | Short-range file size not found; the full-range model is about 1.08 MB ([HF mirror](https://huggingface.co/langminer/blaze-face-full-range)) | Apache-2.0 per secondary sources ([Hugging Face Space](https://huggingface.co/spaces/Akjava/mediapipe-face-detect/blob/56e166f80522ec6a319d39ad0996e4590849521f/face_landmarker.task.txt), [ONNX conversion](https://huggingface.co/fernandotonon/QtMeshEditor-blazeface-onnx)); official model card PDF not opened **[Verify]**; [Google docs](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector/index) | Needs a TFLite/ONNX runtime or a hand-written one |
| **Ultra-Light-Fast Generic Face Detector** (slim / RFB-320) | Small face detector | About 1.04-1.1 MB FP32, about 0.3-0.44 MB int8 ([repo](https://github.com/Linzaer/Ultra-Light-Fast-Generic-Face-Detector-1MB), [ONNX Model Zoo](https://huggingface.co/onnxmodelzoo/version-RFB-320/commit/3b11049aa0a4af7907e6827fa634e0fb7af186cc), [NXP port](https://huggingface.co/nxp/ultraface-slim-imx)) | Repository labelled MIT; the weights were trained on WIDER FACE, and the repo says nothing about commercial use of the weights. The Model Zoo copy has conflicting metadata (apache-2.0 header, MIT text) | **[Verify]** the WIDER FACE dataset terms before shipping trained weights in a product |
| **pico.js** | Tiny classical cascade, pure JavaScript | Cascade is small (a few hundred KB **[Est.]**) | Code is MIT ([repo](https://github.com/nenadmarkus/pico)); the repo page does not state a licence for the `facefinder` cascade data | Cascade licence unclear: treat as unlicensed until confirmed; accuracy on non-frontal faces is weaker **[Est.]** |

Runtime options:

| Runtime | Size and fit | Concern |
|---|---|---|
| **onnxruntime-web** | WebAssembly binaries of several MB; one third-party listing shows a threaded SIMD build near 12.3 MB ([example](https://huggingface.co/janitr/experiments/blob/main/runtime/onnxruntime-web/RUNTIME_INFO.json)); a minimal custom build can be about 1.2 MB ([build docs discussion](https://github.com/microsoft/onnxruntime/discussions/33309)) | Needs `'wasm-unsafe-eval'`; official docs say inlined workers may fail under a restrictive CSP ([deploy guide](https://onnxruntime.ai/docs/tutorials/web/deploy.html)) |
| **Hand-written JavaScript inference** for one small model | About 300-600 lines for convolutions, depthwise convolutions and the detection head **[Est.]**; no WebAssembly, CSP unchanged | Development and validation effort (about 1-2 weeks **[Est.]**); slower than WebAssembly but one frame per shot is enough |

## What the detector can and cannot answer

- A face detector gives face position and size. Shot size can then be estimated from face height relative to frame height (for example close-up when the face fills roughly a third of the height or more). The thresholds are **[Est.]** and need calibration on real clips.
- It says nothing when no face is visible: wide shots, backs of heads, hands and objects, crowds with tiny faces. The report must say "not detected" rather than guess.
- Fairness check needed: public face datasets and models can perform unevenly across skin tones and lighting **[Est.; not tested here]**. Because the audience is Indian, the spike must include footage with a range of Indian faces, low light and mixed lighting before anything is advertised.

## Recommendation

1. **Do not ship a model yet.** The blocking questions are licensing, not engineering.
2. **Decide the licence route first** (the owner's call): either confirm the Apache-2.0 BlazeFace model card and use that, or confirm that the WIDER FACE-trained weights are allowed in a proprietary product, or train/choose a model whose data and weights are clearly licensed.
3. **Then run a one-week spike** with hand-written JavaScript inference (no CSP change, about 0.5-1 MB added to the HTML **[Est.]**) on 20-30 clips, and ship only if face detection works on a clear majority of close and medium shots and the report degrades honestly on the rest.
4. If the licence route is not settled, a **no-model alternative** is to let the user mark each shot's size in the analysis report (a dropdown pre-filled with "unknown") so suggestions can still use it. This is a small change and avoids all licence risk.

## Decisions needed from the owner

- Is a roughly 0.5-1 MB size increase acceptable for this feature?
- Which licence route in step 2 is preferred, and can the Apache-2.0 model card be confirmed?
- Should the spike go ahead, or should the manual shot-size dropdown (step 4) come first?
