import { build } from 'esbuild';
import JO from 'javascript-obfuscator';
import fs from 'fs';

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('src/vendor.js', `import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
window.THREE = Object.assign({}, T, { EffectComposer, RenderPass, BokehPass, UnrealBloomPass, ShaderPass, OutputPass, RoomEnvironment, GLTFLoader, SkeletonUtils });`);
const v = await build({ entryPoints: ['src/vendor.js'], bundle: true, minify: true, format: 'iife', write: false, legalComments: 'inline', target: 'es2020' });
const vendor = v.outputFiles[0].text;

const appMin = (await build({ entryPoints: ['src/app.js'], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020' })).outputFiles[0].text;
const app = process.env.DEBUG ? appMin : JO.obfuscate(appMin, {
  compact: true, controlFlowFlattening: true, controlFlowFlatteningThreshold: 0.4,
  deadCodeInjection: true, deadCodeInjectionThreshold: 0.15, stringArray: true, stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75, splitStrings: true, splitStringsChunkLength: 8, selfDefending: true,
  disableConsoleOutput: true, identifierNamesGenerator: 'hexadecimal', transformObjectKeys: true, unicodeEscapeSequence: false
}).getObfuscatedCode();

const safe = s => s.replace(/<\/script/gi, '<\\/script');
let html = fs.readFileSync('src/index.html', 'utf8');
const actions = fs.readFileSync('assets_src/actions.json', 'utf8');
const assets = 'window.__KA={actions:' + actions + ',' + ['meera','arjun','f_idle','f_walk','m_idle','m_walk'].map(k => `${k}:'${fs.readFileSync('assets_src/'+k+'.glb').toString('base64')}'`).join(',') + ',tex:' + fs.readFileSync('assets_src/tex.json','utf8') + '};';
html = html.replace('<!--APP-->', () => `<script>${assets}</script>\n<!--APP-->`);
html = html.replace('<!--VENDOR-->', () => `<script>${safe(vendor)}</script>`).replace('<!--APP-->', () => `<script>${safe(app)}</script>`);
fs.writeFileSync('dist/Kalki.html', html);
// desktop app frontend: same page, CSP additionally allows Tauri's local IPC channel
fs.mkdirSync('dist-app', { recursive: true });
fs.writeFileSync('dist-app/index.html', html.replace('connect-src blob: data:', 'connect-src blob: data: ipc: http://ipc.localhost'));
console.log('Kalki.html', (html.length / 1024 / 1024).toFixed(2), 'MB');
