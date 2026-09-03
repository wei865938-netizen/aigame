// 愤怒的小鸟关卡检验:从 birds/index.html 切出物理规则和关卡,在 Node 里用 Matter.js 跑:
// 1) 稳定性:开局不发鸟,4 秒内结构不能自己塌、猪不能自己死;
// 2) 可通关:贪心搜索发射角度/力度,用给定的鸟数能不能打光所有猪。
// 用法:node tools/test-birds.mjs [关卡号]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Matter = require('../../common/matter.min.js');
const html = fs.readFileSync(new URL('../../birds/index.html', import.meta.url), 'utf8');
const m = html.match(/\/\*BIRDS-ENGINE-START\*\/([\s\S]*?)\/\*BIRDS-ENGINE-END\*\//);
if (!m) throw new Error('找不到 BIRDS-ENGINE 标记');
const { LEVELS, BirdsSim, REST, PULL } = new Function('Matter', m[1] + '\nreturn {LEVELS,BirdsSim,REST,PULL,MAT};')(Matter);

const only = process.argv[2] ? +process.argv[2] : 0;
// 候选射击:拉弓角度(往左下拉 => 往右上飞)× 力度
const CANDS = [];
for (let deg = -80; deg <= 20; deg += 5) for (const mag of [40, 52, 62]) {
  const a = deg * Math.PI / 180; // 拉的方向(从 REST 出发):负角度 = 往左下
  const px = -Math.cos(a) * mag, py = Math.sin(a) * mag; // 拉到的位置偏移
  CANDS.push({ deg, mag, dx: -px, dy: -py }); // 发射 = REST - 拉点
}
function play(L, shots, hook) {
  const st = BirdsSim.create(); BirdsSim.loadLevel(st, L);
  if (hook) hook(st);
  for (const s of shots) {
    const b = BirdsSim.makeBird(st); BirdsSim.launch(st, b, s.dx, s.dy);
    let t = 0; while (!BirdsSim.birdDone(b, t)) { BirdsSim.step(st); t += 1 / 60; }
    BirdsSim.remove(st, b);
    for (let i = 0; i < 90; i++) BirdsSim.step(st);
    if (st.pigs <= 0) break;
  }
  return st;
}
let bad = 0;
LEVELS.forEach((L, idx) => {
  if (only && only !== idx + 1) return;
  const t0 = Date.now(); const notes = [];
  // 1) 稳定性
  {
    const st = BirdsSim.create(); BirdsSim.loadLevel(st, L);
    const start = BirdsSim.bodies(st).filter(b => !b.isStatic).map(b => ({ b, x: b.position.x, y: b.position.y }));
    for (let i = 0; i < 480; i++) BirdsSim.step(st); // 8 秒
    let maxMove = 0; for (const s of start) maxMove = Math.max(maxMove, Math.hypot(s.b.position.x - s.x, s.b.position.y - s.y));
    if (st.pigs !== L.pigs.length) notes.push(`开局 ${L.pigs.length - st.pigs} 只猪自己死了`);
    if (maxMove > 8) notes.push(`开局结构自己动了 ${maxMove.toFixed(1)}px`);
  }
  // 2) 贪心可通关
  const shots = []; let pigsLeft = L.pigs.length; let usedBirds = 0;
  for (let bird = 0; bird < L.birds && pigsLeft > 0; bird++) {
    let best = null;
    for (const c of CANDS) { const st = play(L, shots.concat(c)); if (!best || st.pigs < best.pigs || (st.pigs === best.pigs && st.score > best.score)) best = { c, pigs: st.pigs, score: st.score }; }
    shots.push(best.c); pigsLeft = best.pigs; usedBirds++;
  }
  const win = pigsLeft === 0;
  if (!win || notes.length) bad++;
  console.log(`${String(idx + 1).padStart(2)} ${L.name.padEnd(5, '　')} 鸟${L.birds} 猪${L.pigs.length} 块${L.blocks.length}  ${win ? `可通关(用 ${usedBirds} 只鸟)` : `打不完,剩 ${pigsLeft} 只猪`}  路线: ${shots.map(s => `${s.deg}°/${s.mag}`).join(' → ')}  ${Date.now() - t0}ms ${notes.join(';')}`);
});
console.log(bad ? `\n${bad} 关有问题` : '\n全部关卡开局稳定且可通关');
process.exit(bad ? 1 : 0);
