// 将当前目录下的所有素材（1~8.gif / 背景.JPG / 背景音乐.mp3 / 喝咖啡音效.mp3）
// 转成 XOR 混淆过的 Base64 字符串，输出 assets_obfuscated.js
// 运行方式：在 f:\2-芝麻酥\2-娜洛的咖啡馆 目录下执行  node build_assets.js

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const FILES = [
  '1.gif', '2.gif', '3.gif', '4.gif', '5.gif', '6.gif', '7.gif', '8.gif',
  'background.jpg',
  'bgm.mp3',
  'drink.mp3',
];

// 简单 XOR 混淆 key（一个字节），HTML 里解码用相同的 key
const XOR_KEY = 0xB7;

function xorBuffer(buf) {
  const out = Buffer.allocUnsafe(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ XOR_KEY;
  return out;
}

const map = {};
for (const f of FILES) {
  const full = path.join(DIR, f);
  if (!fs.existsSync(full)) { console.warn('SKIP missing:', f); continue; }
  const raw = fs.readFileSync(full);
  const obf = xorBuffer(raw);
  map[f] = obf.toString('base64');
}

const outJs =
`// ===== 混淆后的素材数据（XOR key = 0x${XOR_KEY.toString(16)}） =====
const __XOR_KEY__ = ${XOR_KEY};
const __ASSETS_MAP__ = ${JSON.stringify(map, null, 2)};
`;

fs.writeFileSync(path.join(DIR, 'assets_obfuscated.js'), outJs, 'utf8');
console.log('已生成 assets_obfuscated.js，共 ' + Object.keys(map).length + ' 个文件');
console.log('XOR key = 0x' + XOR_KEY.toString(16));
