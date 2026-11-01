# Checks that need a person

These are the things that cannot be verified from the development machine.

## 1. Tamil and Hindi review

The Tamil and Hindi text has not been reviewed by a native speaker. Open [`translation-review.csv`](translation-review.csv) in Excel or Google Sheets. It lists every interface string in English, the current Tamil and Hindi, and empty correction columns.

For each row:
- If the translation is right, leave the correction cell empty.
- If it is wrong, awkward or too formal, write the better text in the correction column.
- Film terms (pan, tilt, zoom, dolly) are meant to stay as the transliterated forms crews actually say; say so in Notes if a crew would use another word.
- Some strings contain placeholders such as numbers or names; keep them as they are.

Lesson descriptions, shot notes and rig tips are English only and are not in this file. After review, send the file back and the corrections go into `src/i18n.js`.

Regenerate the file after interface changes with `node tools/export-translations.mjs`.

## 2. Phone test (Android)

Open `Kalki-versions/Kalki-v0.7.2.html` in Chrome on an Android phone (send the file by cable, cloud storage or chat). Try each step and note what fails:

1. The intro closes and the home screen shows the video preview above the tabs.
2. Tap "Camera moves", add a move; tap "Shot settings", change lens, size and duration. Do the sliders drag smoothly with a finger?
3. Drag the timeline playhead and tap clips. Does the page scroll instead?
4. Open File and Export menus; do they fit on screen?
5. Open the lessons button (graduation cap) and load "Shot sizes".
6. Export a PNG and a shot-list PDF; can you find and open them?
7. Switch the interface to Tamil and Hindi: does any text overflow or get cut?
8. Rotate the phone to landscape.

Write down the phone model, Android version, browser, and the step that failed, with a screenshot if possible.

## 3. User interviews

See [`INTERVIEW_GUIDE.md`](INTERVIEW_GUIDE.md).
