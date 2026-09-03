// 推箱子关卡求解器:从 index.html 切出 LEVELS,逐关 BFS(按推箱数最优),
// 任一关无解就以非零码退出。用法:node tools/solve.mjs [--sort]
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const m = html.match(/\/\*LEVELS-START\*\/([\s\S]*?)\/\*LEVELS-END\*\//);
if (!m) throw new Error('index.html 里找不到 LEVELS-START/END 标记');
const LEVELS = new Function(m[1] + '\nreturn LEVELS;')();

const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

function parse(map) {
  const lines = map.replace(/\r/g, '').split('\n');
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const h = lines.length, w = Math.max(...lines.map(l => l.length)), N = w * h;
  const walls = new Array(N).fill(false), targets = new Array(N).fill(false);
  const boxes = []; let player = -1;
  for (let y = 0; y < h; y++) {
    const line = lines[y].padEnd(w, ' ');
    for (let x = 0; x < w; x++) {
      const ch = line[x], i = y * w + x;
      if (ch === '#') walls[i] = true;
      else {
        if (ch === '.' || ch === '*' || ch === '+') targets[i] = true;
        if (ch === '$' || ch === '*') boxes.push(i);
        if (ch === '@' || ch === '+') player = i;
      }
    }
  }
  return { w, h, N, walls, targets, boxes, player };
}

function solve(L, maxStates = 3e6) {
  const { w, h, N, walls, targets, player } = L;
  const nt = targets.filter(Boolean).length;
  if (L.player < 0) return { err: '没有玩家 @' };
  if (nt !== L.boxes.length) return { err: `箱子 ${L.boxes.length} 个,目标 ${nt} 个,数量不等` };
  const inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  // 活格:箱子从该格出发仍有可能被推到某个目标(从目标反向"拉"得到)
  const live = new Array(N).fill(false); const st = [];
  for (let i = 0; i < N; i++) if (targets[i]) { live[i] = true; st.push(i); }
  while (st.length) {
    const i = st.pop(), x = i % w, y = Math.floor(i / w);
    for (let d = 0; d < 4; d++) {
      const jx = x + DX[d], jy = y + DY[d], px = jx + DX[d], py = jy + DY[d];
      if (!inb(jx, jy) || !inb(px, py)) continue;
      const j = jy * w + jx, pj = py * w + px;
      if (walls[j] || walls[pj] || live[j]) continue;
      live[j] = true; st.push(j);
    }
  }
  function reach(p, bset) {
    const seen = new Uint8Array(N); const s = [p]; seen[p] = 1; let mn = p;
    while (s.length) {
      const i = s.pop(); if (i < mn) mn = i;
      const x = i % w, y = Math.floor(i / w);
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d]; if (!inb(nx, ny)) continue;
        const j = ny * w + nx; if (walls[j] || seen[j] || bset.has(j)) continue;
        seen[j] = 1; s.push(j);
      }
    }
    return { seen, mn };
  }
  const solved = bs => bs.every(b => targets[b]);
  const b0 = L.boxes.slice().sort((a, b) => a - b);
  if (solved(b0)) return { pushes: 0, states: 1 };
  const r0 = reach(player, new Set(b0));
  const visited = new Set([r0.mn + '|' + b0.join(',')]);
  let frontier = [{ p: player, bs: b0 }]; let pushes = 0;
  while (frontier.length) {
    const next = [];
    for (const s of frontier) {
      const bset = new Set(s.bs); const { seen } = reach(s.p, bset);
      for (let bi = 0; bi < s.bs.length; bi++) {
        const b = s.bs[bi], bx = b % w, by = Math.floor(b / w);
        for (let d = 0; d < 4; d++) {
          const fx = bx - DX[d], fy = by - DY[d], tx = bx + DX[d], ty = by + DY[d];
          if (!inb(fx, fy) || !inb(tx, ty)) continue;
          const f = fy * w + fx, t = ty * w + tx;
          if (!seen[f] || walls[t] || bset.has(t) || !live[t]) continue;
          const nb = s.bs.slice(); nb[bi] = t; nb.sort((a, c) => a - c);
          const r = reach(b, new Set(nb)); const key = r.mn + '|' + nb.join(',');
          if (visited.has(key)) continue;
          visited.add(key);
          if (visited.size > maxStates) return { pushes: -1, states: visited.size, err: '状态数超限,未搜完' };
          if (solved(nb)) return { pushes: pushes + 1, states: visited.size };
          next.push({ p: b, bs: nb });
        }
      }
    }
    frontier = next; pushes++;
  }
  return { pushes: -1, states: visited.size, err: '无解' };
}

let bad = 0; const rows = [];
LEVELS.forEach((lv, i) => {
  const L = parse(lv.map); const t0 = Date.now(); const r = solve(L); const ms = Date.now() - t0;
  const ok = !r.err && r.pushes >= 0; if (!ok) bad++;
  rows.push({ idx: i + 1, name: lv.name, size: L.w + 'x' + L.h, boxes: L.boxes.length, pushes: r.pushes, states: r.states, ms, note: r.err || '' });
});
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('#', 4) + pad('name', 10) + pad('size', 8) + pad('boxes', 7) + pad('pushes', 8) + pad('states', 9) + pad('ms', 6) + 'note');
for (const r of rows) console.log(pad(r.idx, 4) + pad(r.name, 10) + pad(r.size, 8) + pad(r.boxes, 7) + pad(r.pushes, 8) + pad(r.states, 9) + pad(r.ms, 6) + r.note);
console.log(`\n${rows.length - bad}/${rows.length} 关可解` + (bad ? `,${bad} 关有问题` : ''));
if (process.argv.includes('--sort') || process.argv.includes('--write')) {
  // 第 1 关固定,其余按最优推箱数、再按搜索状态数(难度近似)升序
  const order = [1].concat(rows.filter(r => r.idx !== 1 && r.pushes >= 0).sort((a, b) => a.pushes - b.pushes || a.states - b.states).map(r => r.idx));
  console.log('按难度排序:', order.join(','));
  if (process.argv.includes('--write') && !bad) {
    const src = 'const LEVELS=[\n' + order.map(i => `{name:${JSON.stringify(LEVELS[i - 1].name)},map:\`${LEVELS[i - 1].map}\`}`).join(',\n') + '\n];\n';
    // 注意:必须用替换函数,地图里的 "$'" "$`" 会被 replace 当成特殊替换模式
    const outHtml = html.replace(/\/\*LEVELS-START\*\/[\s\S]*?\/\*LEVELS-END\*\//, () => '/*LEVELS-START*/\n' + src + '/*LEVELS-END*/');
    fs.writeFileSync(new URL('../index.html', import.meta.url), outHtml, 'utf8');
    console.log('已按难度重排并写回 index.html');
  }
}
process.exit(bad ? 1 : 0);
