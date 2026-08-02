// 生成最终分享版 share.html（单文件、素材 XOR 混淆内嵌，朋友看不到任何图片/音频文件）
// 运行：node build_share.js

const fs = require('fs');
const path = require('path');
const DIR = __dirname;

const obf = fs.readFileSync(path.join(DIR, 'assets_obfuscated.js'), 'utf8');
let html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');

// 1. CSS 里的背景图 url('background.jpg') 去掉，改成纯色占位（背景由 JS 注入设置）
html = html.replace(
  `background: url('background.jpg') no-repeat center center fixed;`,
  `background: #1a1a1a no-repeat center center fixed;`
);

// 2. audio 标签的 src 改成 data-asset（运行时解码赋值）
html = html.replace(
  `<audio id="bgMusic" src="bgm.mp3" loop></audio>`,
  `<audio id="bgMusic" data-asset="bgm.mp3" loop></audio>`
);
html = html.replace(
  `<audio id="drinkSound" src="drink.mp3"></audio>`,
  `<audio id="drinkSound" data-asset="drink.mp3"></audio>`
);

// 3. JS 里动态设置咖啡 GIF 的 src 改成调用解码函数
html = html.replace(
  `coffeeItem.src = num + '.gif';`,
  `coffeeItem.src = decodeAsset(num + '.gif');`
);

// 4. 在 <script> 开始位置注入：混淆素材对象 + 解码函数 + img/audio/背景批量赋值
const decoderInject = `
  /* ===== XOR 混淆素材解码（朋友右键另存 / 看源码也看不到原图原音） ===== */
${obf}
  function decodeAsset(key) {
    const b64 = __ASSETS_MAP__[key];
    if (!b64) return '';
    // Base64 -> Uint8Array
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) ^ __XOR_KEY__;
    // Uint8Array -> Blob -> BlobURL (Blob URL 不可直接右键另存为图片/音频)
    const ext = (key.split('.').pop() || '').toLowerCase();
    let mime;
    if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
    else if (ext === 'png') mime = 'image/png';
    else if (ext === 'gif') mime = 'image/gif';
    else if (ext === 'mp3') mime = 'audio/mpeg';
    else mime = 'application/octet-stream';
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  }
  // 页面加载时：背景图 + 所有带 data-asset 的 <img>/<audio> 一次性赋值
  document.addEventListener('DOMContentLoaded', function () {
    // 背景图
    document.body.style.backgroundImage = "url(" + decodeAsset('background.jpg') + ")";
    // 图片
    document.querySelectorAll('img[data-asset]').forEach(function (img) {
      img.src = decodeAsset(img.getAttribute('data-asset'));
    });
    // 音频
    document.querySelectorAll('audio[data-asset]').forEach(function (a) {
      a.src = decodeAsset(a.getAttribute('data-asset'));
    });
  });
`;

const scriptTag = '<script>';
const idx = html.indexOf(scriptTag);
if (idx === -1) throw new Error('No <script> tag found!');
const insertAt = idx + scriptTag.length;
html = html.slice(0, insertAt) + decoderInject + html.slice(insertAt);

// 5. 防右键菜单（基本防菜鸡，防不了 F12）
const antiRightClick = `
<script>
  // 简单的"防菜鸡"：禁用右键另存为图片、禁用拖拽图片
  document.addEventListener('contextmenu', function (e) { if (e.target.tagName === 'IMG') e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { if (e.target.tagName === 'IMG') e.preventDefault(); });
</script>
`;
html = html.replace('</body>', antiRightClick + '</body>');

const outFile = path.join(DIR, 'share.html');
fs.writeFileSync(outFile, html, 'utf8');
console.log('✅ 已生成分享版：', outFile);
console.log('   这个文件是【单文件】：里面没有任何相对路径依赖，朋友双击就能玩');
console.log('   图片/音频已用 XOR + Blob URL 混淆，文件夹里没有素材依赖');
