// 把 index.html 里 ARTIFACT-START/END 之间的内容切出来,生成 Claude Artifact 用的页面片段
// (Artifact 会自己套 <html><head><body>,所以片段里不带这些)。
// 用法:node tools/build-artifact.mjs <输出路径>
import fs from 'node:fs';

const out = process.argv[2];
if (!out) { console.error('用法: node tools/build-artifact.mjs <输出文件>'); process.exit(1); }
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const m = html.match(/<!--ARTIFACT-START-->([\s\S]*?)<!--ARTIFACT-END-->/);
if (!m) throw new Error('找不到 ARTIFACT-START/END 标记');
const title = (html.match(/<title>([^<]*)<\/title>/) || [, '寿司消消乐·推箱子'])[1];
fs.writeFileSync(out, '<title>' + title + '</title>\n' + m[1].trim() + '\n', 'utf8');
console.log('写入', out, (fs.statSync(out).size / 1024).toFixed(1) + ' KB');
