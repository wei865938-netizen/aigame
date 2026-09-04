// 羊了个羊检验:每关生成多局,按引擎给出的正解回放必须全部清空;随机乱点几步后洗牌,再按新正解回放也必须清空。
// 用法:node tools/test-sheep.mjs
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../../sheep/engine.js', import.meta.url), 'utf8');
new Function(src)(); const S = globalThis.Sheep;
let fails = 0; const bad = m => { fails++; console.log('FAIL ' + m); };
function replay(st, sol, where) {
  for (const id of sol) {
    const t = st.tiles[id]; if (t.state !== 'board') { bad(`${where}: 正解里的牌 ${id} 不在牌面 (${t.state})`); return false; }
    if (!S.isFree(st, t)) { bad(`${where}: 正解里的牌 ${id} 被压住`); return false; }
    const r = S.pick(st, id); if (!r.ok) { bad(`${where}: 点牌 ${id} 失败`); return false; }
    if (r.full) { bad(`${where}: 按正解走却槽满了`); return false; }
  }
  if (st.over !== 'win') { bad(`${where}: 回放完没有清空,剩 ${st.tiles.filter(t => t.state !== 'gone').length} 张,槽 ${st.slot.length}`); return false; }
  return true;
}
for (let level = 1; level <= 8; level++) {
  const p = S.params(level); let ok = 0, okShuffle = 0, maxFree = 0; const N = 30; const t0 = Date.now();
  for (let seed = 1; seed <= N; seed++) {
    const st = S.newGame(level, seed * 7919 + level);
    if (st.tiles.length !== p.total) bad(`第${level}关 seed${seed}: 牌数 ${st.tiles.length} != ${p.total}`);
    if (st.tiles.some(t => t.kind == null)) bad(`第${level}关 seed${seed}: 有牌没分到图案`);
    const kinds = new Set(st.tiles.map(t => t.kind)); if (kinds.size > p.kinds) bad(`第${level}关 seed${seed}: 图案种类 ${kinds.size} > ${p.kinds}`);
    const cnt = {}; for (const t of st.tiles) cnt[t.kind] = (cnt[t.kind] || 0) + 1; for (const k in cnt) if (cnt[k] % 3) bad(`第${level}关 seed${seed}: 图案 ${k} 数量 ${cnt[k]} 不是 3 的倍数`);
    maxFree = Math.max(maxFree, S.freeIds(st).length);
    if (replay(st, st.solution.slice(), `第${level}关 seed${seed}`)) ok++;
    // 乱点几步(不超过 6 张进槽)再洗牌
    const st2 = S.newGame(level, seed * 7919 + level); const rnd = S.makeRng(seed);
    for (let k = 0; k < 5; k++) { const free = S.freeIds(st2); if (!free.length || st2.slot.length >= 6) break; S.pick(st2, free[Math.floor(rnd() * free.length)]); if (st2.over) break; }
    if (!st2.over) { const sol = S.shuffle(st2); if (replay(st2, sol, `第${level}关 seed${seed} 洗牌后`)) okShuffle++; } else okShuffle++;
  }
  console.log(`第 ${level} 关  ${p.kinds} 种 ${p.total} 张 ${p.layers} 层 叠放${JSON.stringify(p.stacks)}  正解回放 ${ok}/${N}  洗牌后回放 ${okShuffle}/${N}  开局可点最多 ${maxFree} 张  ${Date.now() - t0}ms`);
}
console.log(fails ? `${fails} 项失败` : '全部通过');
process.exit(fails ? 1 : 0);
