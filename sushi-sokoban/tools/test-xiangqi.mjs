// 象棋引擎检验:走法数(perft)对照公开数据、将军/照面/马腿/炮架/兵吃子规则、一步杀、AI 自对弈不出非法走法。
// 用法:node tools/test-xiangqi.mjs
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../../xiangqi/engine.js', import.meta.url), 'utf8');
new Function(src)(); const X = globalThis.Xiangqi;
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };
const idx = (r, c) => r * 9 + c;
function perft(b, side, d) { const ms = X.genLegal(b, side); if (d === 1) return ms.length; let n = 0; for (const m of ms) { const cap = X.make(b, m.from, m.to); n += perft(b, 1 - side, d - 1); X.unmake(b, m.from, m.to, cap); } return n; }
// 1) 初始局面走法数:公开 perft 数据 44 / 1920 / 79666
{ const b = X.INIT.slice(); const t0 = Date.now(); const p1 = perft(b, 0, 1), p2 = perft(b, 0, 2), p3 = perft(b, 0, 3);
  check(p1 === 44, `perft(1)=${p1} (期望 44)`); check(p2 === 1920, `perft(2)=${p2} (期望 1920)`); check(p3 === 79666, `perft(3)=${p3} (期望 79666)  ${Date.now() - t0}ms`); }
// 2) 双王照面:车离开中线会露王,必须非法
{ const b = new Array(90).fill(0); b[idx(9, 4)] = 1; b[idx(0, 4)] = 8; b[idx(5, 4)] = 5;
  const ms = X.genLegal(b, 0); const rookSide = ms.filter(m => m.from === idx(5, 4) && m.to % 9 !== 4);
  check(rookSide.length === 0, `照面:车横走 ${rookSide.length} 种(期望 0)`);
  check(ms.filter(m => m.from === idx(5, 4)).length === 8, `照面:车沿中线走法 ${ms.filter(m => m.from === idx(5, 4)).length} 种(期望 8)`); }
// 3) 将军判定:车、炮(炮架)、马(马腿)、兵(过河横吃)
{ const b = new Array(90).fill(0); b[idx(9, 4)] = 1; b[idx(0, 3)] = 8; b[idx(2, 4)] = 12;
  check(X.inCheck(b, 0) === true, '车将军');
  b[idx(8, 4)] = 2; check(X.inCheck(b, 0) === false, '仕挡车');
  b[idx(2, 4)] = 13; check(X.inCheck(b, 0) === true, '炮隔一子将军');
  b[idx(6, 4)] = 7; check(X.inCheck(b, 0) === false, '炮隔两子不将');
  b[idx(2, 4)] = 0; b[idx(6, 4)] = 0; b[idx(8, 4)] = 0;
  b[idx(7, 3)] = 11; check(X.inCheck(b, 0) === true, '马将军');
  b[idx(8, 3)] = 7; check(X.inCheck(b, 0) === false, '蹩马腿');
  b[idx(7, 3)] = 0; b[idx(8, 3)] = 0;
  b[idx(8, 4)] = 14; check(X.inCheck(b, 0) === true, '卒正面将军'); b[idx(8, 4)] = 0;
  b[idx(9, 3)] = 14; check(X.inCheck(b, 0) === true, '过河卒横吃将军'); b[idx(9, 3)] = 0;
  b[idx(9, 5)] = 0; }
// 4) 一步杀:红双车 vs 黑单王
{ const b = new Array(90).fill(0); b[idx(0, 4)] = 8; b[idx(9, 3)] = 1; b[idx(2, 0)] = 5; b[idx(1, 8)] = 5;
  const t0 = Date.now(); const mv = X.chooseMove(b, 0, { level: 3, timeMs: 1500 });
  const cap = X.make(b, mv.from, mv.to); const over = X.gameOver(b, 1); X.unmake(b, mv.from, mv.to, cap);
  // 象棋里困毙(无子可走)同样算输,所以将死或困毙都算 AI 找到了一步取胜
  check(over === 'checkmate' || over === 'stalemate', `一步取胜:AI 走 ${mv.from}->${mv.to} 深度${mv.depth} 节点${mv.nodes} ${Date.now() - t0}ms -> ${over}`); }
// 5) AI 自对弈:每步都必须在合法走法里,不崩,能结束或到步数上限
{ const b = X.INIT.slice(); let side = 0, plies = 0, result = null, nodes = 0; const hist = []; const t0 = Date.now();
  while (plies < 160) { const over = X.gameOver(b, side); if (over) { result = over + ' ' + (side === 0 ? '红方负' : '黑方负'); break; }
    const mv = X.chooseMove(b, side, { level: 2, timeMs: 120, history: hist }); nodes += mv.nodes;
    const legal = X.genLegal(b, side).some(m => m.from === mv.from && m.to === mv.to); if (!legal) { result = '非法走法 ' + JSON.stringify(mv); fails++; break; }
    X.make(b, mv.from, mv.to); hist.push(X.key(b, 1 - side)); side = 1 - side; plies++; }
  console.log(`自对弈 ${plies} 步 结果:${result || '到步数上限(未分胜负)'} 总节点 ${nodes} 用时 ${Date.now() - t0}ms`);
  check(result === null || !result.startsWith('非法'), '自对弈无非法走法'); }
// 6) 速度参考
{ const b = X.INIT.slice(); const t0 = Date.now(); const mv = X.chooseMove(b, 0, { level: 3, timeMs: 2000 }); console.log(`困难档开局思考:深度 ${mv.depth} 节点 ${mv.nodes} 用时 ${Date.now() - t0}ms (${Math.round(mv.nodes / ((Date.now() - t0) / 1000))} 节点/秒)`); }
console.log(fails ? `${fails} 项失败` : '全部通过');
process.exit(fails ? 1 : 0);
