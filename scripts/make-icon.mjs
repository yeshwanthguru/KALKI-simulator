// Generates the 1024px source icon for the desktop app (run: node scripts/make-icon.mjs, then: npx tauri icon src-tauri/app-icon.png)
import sharp from 'sharp';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b4a"/><stop offset="1" stop-color="#ffb547"/></linearGradient></defs>
<rect width="1024" height="1024" rx="230" fill="#14141c"/>
<circle cx="512" cy="512" r="330" fill="none" stroke="url(#g)" stroke-width="64"/>
<circle cx="512" cy="512" r="150" fill="url(#g)"/>
<g fill="#14141c"><circle cx="512" cy="512" r="64"/></g>
<g stroke="url(#g)" stroke-width="40" stroke-linecap="round"><path d="M512 150v70M512 804v70M150 512h70M804 512h70"/></g>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile('src-tauri/app-icon.png');
console.log('icon written');
