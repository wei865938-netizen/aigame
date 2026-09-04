// 五子棋引擎检验:成五判定、必胜/必挡、活三应对、困难档 vs 简单档对局。
// 用法:node tools/test-gomoku.mjs
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../../gomoku/engine.js', import.meta.url), 'utf8');
new Function(src)(); const G = globalThis.Gomoku; const N = G.N;
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };
const at = (x, y) => y * N + x;
{ const b = G.newBoard(); for (let i = 0; i < 5; i++) b[at(3 + i, 7)] = 1; check(G.isWin(b, 5, 7) && G.isWin(b, 5, 7).length === 5, '横向成五判定'); }
{ const b = G.newBoard(); for (let i = 0; i < 4; i++) b[at(3 + i, 7)] = 1; const mv = G.chooseMove(b, 1, 2); check(mv === at(7, 7) || mv === at(2, 7), `有四先成五:落 ${mv % N},${Math.floor(mv / N)}`); }
{ const b = G.newBoard(); for (let i = 0; i < 4; i++) b[at(3 + i, 7)] = 2; b[at(2, 7)] = 1; const mv = G.chooseMove(b, 1, 2); check(mv === at(7, 7), `对方冲四必须挡:落 ${mv % N},${Math.floor(mv / N)}`); }
{ const b = G.newBoard(); for (let i = 0; i < 3; i++) b[at(5 + i, 7)] = 2; b[at(7, 9)] = 1; const mv = G.chooseMove(b, 1, 2); b[mv] = 1;
  let worst = 0; for (const i of G.candidates(b)) worst = Math.max(worst, G.evalPoint(b, i % N, Math.floor(i / N), 2)); check(worst < G.S.LIVE4, `对方活三要应对:落 ${mv % N},${Math.floor(mv / N)},之后对方最强手 ${worst}`); }
function game(lvBlack, lvWhite) { const b = G.newBoard(); let me = 1, n = 0; while (n < N * N) { const mv = G.chooseMove(b, me, me === 1 ? lvBlack : lvWhite); if (mv < 0 || b[mv]) return 0; b[mv] = me; n++; if (G.isWin(b, mv % N, Math.floor(mv / N))) return me; me = 3 - me; } return 0; }
{ let hardWins = 0, games = 6; const t0 = Date.now();
  for (let g = 0; g < games; g++) { const hardIsBlack = g % 2 === 0; const w = game(hardIsBlack ? 3 : 1, hardIsBlack ? 1 : 3); if (w === (hardIsBlack ? 1 : 2)) hardWins++; }
  check(hardWins >= 4, `困难 vs 简单 ${games} 局赢 ${hardWins} 局(期望≥4)  ${Date.now() - t0}ms`); }
{ const b = G.newBoard(); b[at(7, 7)] = 1; b[at(8, 8)] = 2; b[at(7, 8)] = 1; b[at(6, 6)] = 2; b[at(7, 6)] = 1; const t0 = Date.now(); const mv = G.chooseMove(b, 2, 3); console.log(`困难档一手用时 ${Date.now() - t0}ms 落 ${mv % N},${Math.floor(mv / N)}`); }
console.log(fails ? `${fails} 项失败` : '全部通过');
process.exit(fails ? 1 : 0);
