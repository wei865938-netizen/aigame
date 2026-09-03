// 割绳子关卡可解性检验:切出 rope/index.html 里的引擎和关卡,对每关穷举"割绳时机"
// (单绳:割的时间;双绳:一起割 / 先后割;三绳:一起割 / 先两后一;有泡泡再试戳泡泡时机),
// 只要有一种时机能让糖果进嘴就算可解。用法:node tools/test-rope.mjs
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../../rope/index.html', import.meta.url), 'utf8');
const cut = (a, b) => { const m = html.match(new RegExp('/\\*' + a + '\\*/([\\s\\S]*?)/\\*' + b + '\\*/')); if (!m) throw new Error('找不到 ' + a); return m[1]; };
const LEVELS = new Function(cut('ROPE-LEVELS-START', 'ROPE-LEVELS-END') + '\nreturn LEVELS;')();
const RopeSim = new Function(cut('ROPE-ENGINE-START', 'ROPE-ENGINE-END') + '\nreturn RopeSim;')();

function run(L, plan) {
  const st = RopeSim.makeLevel(L); const acts = plan.slice().sort((a, b) => a.t - b.t); let k = 0;
  while (!st.done && st.t < 9) {
    while (k < acts.length && acts[k].t <= st.t) { const a = acts[k++]; if (a.act === 'cut') RopeSim.cut(st, a.i); else RopeSim.pop(st); }
    RopeSim.step(st);
  }
  return { done: st.done, stars: st.starsGot, t: st.t, x: Math.round(st.candy.x), y: Math.round(st.candy.y) };
}
const grid = (max, step) => { const out = []; for (let t = 0; t <= max + 1e-9; t += step) out.push(+t.toFixed(3)); return out; };
function plansFor(L) {
  const n = L.pins.length, T = grid(3.6, 0.06), C = grid(3.6, 0.12); const plans = [];
  const all = t => L.pins.map((_, i) => ({ t, act: 'cut', i }));
  for (const t of T) plans.push({ tag: '同时@' + t, acts: all(t) });
  if (n === 2) for (const first of [0, 1]) for (const t1 of C) for (const t2 of C) if (t2 > t1) plans.push({ tag: `先${first}@${t1} 后@${t2}`, acts: [{ t: t1, act: 'cut', i: first }, { t: t2, act: 'cut', i: 1 - first }] });
  if (n === 3) for (let last = 0; last < 3; last++) for (const t1 of C) for (const t2 of C) if (t2 > t1) plans.push({ tag: `先两@${t1} 后${last}@${t2}`, acts: [0, 1, 2].filter(i => i !== last).map(i => ({ t: t1, act: 'cut', i })).concat([{ t: t2, act: 'cut', i: last }]) });
  return plans;
}
let bad = 0;
LEVELS.forEach((L, idx) => {
  const init = RopeSim.makeLevel(L);
  const notes = [];
  if (Math.hypot(init.candy.x - init.monster.x, init.candy.y - init.monster.y) < 34) notes.push('糖果一开始就在嘴里');
  L.pins.forEach((p, i) => { const d = Math.hypot(p[0] - L.candy[0], p[1] - L.candy[1]); if (d > p[2] + 3) notes.push(`绳${i} 初始被拉长 ${Math.round(d - p[2])}`); });
  const plans = plansFor(L);
  let ok = 0, best = null, bestStars = -1, first = null; const samples = [];
  const t0 = Date.now();
  const tryPlan = pl => { const r = run(L, pl.acts); if (r.done === 'win') { ok++; if (!first) first = pl.tag; if (r.stars > bestStars) { bestStars = r.stars; best = pl.tag; } } else if (samples.length < 3 && samples.every(s => s.x !== r.x)) samples.push({ tag: pl.tag, ...r }); };
  for (const pl of plans) tryPlan(pl);
  let popTried = 0;
  if (!ok && (L.bubbles || []).length) { // 再试戳泡泡时机
    for (const t of grid(3.6, 0.12)) for (const tp of grid(7, 0.15)) if (tp > t) { popTried++; tryPlan({ tag: `同时@${t} 戳@${tp}`, acts: L.pins.map((_, i) => ({ t, act: 'cut', i })).concat([{ t: tp, act: 'pop' }]) }); }
  }
  const total = plans.length + popTried;
  const solvable = ok > 0 && !notes.length; if (!solvable) bad++;
  console.log(`${String(idx + 1).padStart(2)} ${L.name.padEnd(6, '　')} 绳${L.pins.length} 泡泡${(L.bubbles || []).length}  可解时机 ${ok}/${total} (${(ok / total * 100).toFixed(1)}%)  最多星 ${bestStars < 0 ? '-' : bestStars}  首个成功: ${first || '无'}  最佳: ${best || '-'}  ${Date.now() - t0}ms ${notes.join(';')}`);
  if (!solvable) for (const s of samples) console.log(`     样本 ${s.tag} -> ${s.done} 落点(${s.x},${s.y}) t=${s.t.toFixed(1)}`);
});
console.log(bad ? `\n${bad} 关不可解` : '\n全部关卡可解');
process.exit(bad ? 1 : 0);
