// 消消乐引擎 + 像素资源 校验:从 index.html 切出 ENGINE/SPRITES 段在 Node 里跑。
// 用法:node tools/test-match3.mjs
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cut = (a, b) => { const m = html.match(new RegExp('/\\*' + a + '\\*/([\\s\\S]*?)/\\*' + b + '\\*/')); if (!m) throw new Error('找不到 ' + a); return m[1]; };
const M3 = new Function(cut('ENGINE-START', 'ENGINE-END') + '\nreturn M3;')();
const { PAL, SPR, SUSHI_KINDS, DIGITS } = new Function(cut('SPRITES-START', 'SPRITES-END') + '\nfunction recolor(rows,map){return rows.map(r=>r.replace(/./g,ch=>map[ch]||ch));}\nSPR.boxOn=recolor(SPR.box,{b:"X",d:"x",t:"Z"});\nreturn {PAL,SPR,SUSHI_KINDS,DIGITS};')();

let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.log('FAIL ' + msg); } };

// 1) 像素资源:每张 16x16,只用调色板里的字符
for (const [name, rows] of Object.entries(SPR)) {
  check(rows.length === 16, `${name}: 行数 ${rows.length} != 16`);
  rows.forEach((r, i) => {
    check(r.length === 16, `${name} 第${i}行长度 ${r.length} != 16 -> "${r}"`);
    for (const ch of r) check(ch === '.' || PAL[ch], `${name} 第${i}行未知字符 "${ch}"`);
  });
}
for (const k of SUSHI_KINDS) check(SPR[k], '缺少寿司贴图 ' + k);
for (const [d, rows] of Object.entries(DIGITS)) check(rows.length === 5 && rows.every(r => r.length === 3), '数字 ' + d + ' 不是 3x5');

// 2) 引擎:确定性随机
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const { COLS, ROWS, KINDS } = M3;
let boards = 0, cascades = 0, shuffles = 0;
for (let seed = 1; seed <= 1000; seed++) {
  const r = rng(seed);
  const b = M3.makeBoard(r); boards++;
  check(b.length === ROWS && b.every(row => row.length === COLS), `seed ${seed}: 尺寸错`);
  check(b.every(row => row.every(k => k >= 0 && k < KINDS)), `seed ${seed}: 种类越界`);
  check(M3.findMatches(b).length === 0, `seed ${seed}: 初始盘面有三连`);
  check(M3.findAnyMove(b) !== null, `seed ${seed}: 初始盘面无可走步`);
  // 走一步可走步 -> 必有消除 -> 重力+填充后无空格
  const mv = M3.findAnyMove(b);
  M3.swapCells(b, mv[0], mv[1]);
  const groups = M3.findMatches(b);
  check(groups.length > 0, `seed ${seed}: 提示步交换后没有三连`);
  let rounds = 0;
  while (M3.findMatches(b).length) {
    const set = M3.matchedSet(M3.findMatches(b));
    for (const key of set) b[Math.floor(key / COLS)][key % COLS] = -1;
    const moves = M3.applyGravity(b);
    for (const m of moves) check(m.to.r > m.from.r && m.to.c === m.from.c, `seed ${seed}: 重力移动方向错`);
    // 重力后:每列空格都在顶部
    for (let c = 0; c < COLS; c++) { let seenTile = false; for (let rr = 0; rr < ROWS; rr++) { if (b[rr][c] >= 0) seenTile = true; else check(!seenTile, `seed ${seed}: 列${c} 空格不在顶部`); } }
    const sp = M3.refill(b, r);
    for (const s of sp) check(s.fromR < 0 || s.fromR < s.r, `seed ${seed}: 新块出生位置不在上方`);
    check(b.every(row => row.every(k => k >= 0)), `seed ${seed}: 填充后仍有空格`);
    rounds++; if (rounds > 50) { check(false, `seed ${seed}: 连锁超过 50 轮`); break; }
  }
  if (rounds > 1) cascades++;
  // 洗牌后:无三连且有可走步
  M3.shuffle(b, r); shuffles++;
  check(M3.findMatches(b).length === 0, `seed ${seed}: 洗牌后有三连`);
  check(M3.findAnyMove(b) !== null, `seed ${seed}: 洗牌后无可走步`);
}
// 3) 计分 / 匹配形状
check(M3.scoreFor(3) === 30 && M3.scoreFor(4) === 60 && M3.scoreFor(5) === 100 && M3.scoreFor(7) === 100, '计分表错');
{
  // (r+3c)%6:行内隔位交替、列内逐一递增,天然没有三连
  const b = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => (r + 3 * c) % KINDS));
  for (let c = 0; c < 4; c++) b[2][c] = 0; // 横向 4 连 (2,0)-(2,3)
  b[3][0] = 0; b[4][0] = 0;                // 竖向 3 连 (2,0)-(4,0),与横向共用 (2,0);(5,0)=5 不延伸
  b[3][5] = 0; b[4][5] = 0; b[5][5] = 0;   // 独立竖向 3 连 (3,5)-(5,5);(2,5)=5,(6,5)=3
  const g = M3.findMatches(b);
  check(g.filter(x => x.dir === 'h').length === 1 && g.some(x => x.dir === 'h' && x.cells.length === 4), '横向 4 连未识别');
  check(g.filter(x => x.dir === 'v' && x.cells.length === 3).length === 2, '两条竖向 3 连未识别');
  check(M3.matchedSet(g).size === 9, 'L 形共用格去重后应为 9 格,实际 ' + M3.matchedSet(g).size);
  const b2 = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 1));
  b2[0][0] = 0; b2[0][1] = 0; b2[1][2] = 0; // 0 0 1 / 1 1 0 -> 交换 (0,2)<->(1,2) 形成三连
  check(M3.swapMakesMatch(b2, { r: 0, c: 2 }, { r: 1, c: 2 }), 'swapMakesMatch 漏判');
  check(!M3.isAdjacent({ r: 0, c: 0 }, { r: 1, c: 1 }), '对角判成相邻');
}
console.log(`盘面 ${boards} 局,出现连锁 ${cascades} 局,洗牌 ${shuffles} 次`);
console.log(fails ? `${fails} 项失败` : '全部通过');
process.exit(fails ? 1 : 0);
