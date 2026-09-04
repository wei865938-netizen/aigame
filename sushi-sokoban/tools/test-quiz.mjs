// 智能脑王题库检验:格式、四个选项互不相同、正确答案不在错误选项里、题目不重复、每类题量。
// 用法:node tools/test-quiz.mjs
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../../quiz/questions.js', import.meta.url), 'utf8');
const win = {}; new Function('window', src)(win); const BANK = win.QUIZ_BANK;
let fails = 0; const bad = (m) => { fails++; console.log('FAIL ' + m); };
const seen = new Map(); let total = 0;
for (const c of BANK.categories) {
  const qs = BANK.questions[c.id];
  if (!qs) { bad(`分类 ${c.name} 没有题目`); continue; }
  qs.forEach((q, i) => {
    const where = `${c.name} #${i + 1}`;
    if (!Array.isArray(q) || q.length < 4) return bad(`${where} 格式错`);
    const [text, ans, wrong, diff, note] = q;
    if (typeof text !== 'string' || text.length < 4) bad(`${where} 题目太短`);
    if (typeof ans !== 'string' || !ans) bad(`${where} 没有正确答案`);
    if (!Array.isArray(wrong) || wrong.length !== 3) bad(`${where} 错误选项要 3 个`);
    else { const all = [ans, ...wrong].map(s => String(s).trim()); if (new Set(all).size !== 4) bad(`${where} 选项重复: ${all.join(' | ')}`); }
    if (![1, 2, 3].includes(diff)) bad(`${where} 难度要 1-3`);
    if (note != null && typeof note !== 'string') bad(`${where} 解析格式错`);
    const key = text.replace(/[\s"“”?？]/g, '');
    if (seen.has(key)) bad(`${where} 与 ${seen.get(key)} 题目重复`); else seen.set(key, where);
  });
  const dist = [1, 2, 3].map(d => qs.filter(q => q[3] === d).length);
  console.log(`${c.name.padEnd(5, '　')} ${String(qs.length).padStart(3)} 题  难度分布 ★${dist[0]} ★★${dist[1]} ★★★${dist[2]}${qs.length < 30 ? '  (少于 30 题!)' : ''}`);
  if (qs.length < 30) bad(`${c.name} 题量不足 30`);
  total += qs.length;
}
console.log(`共 ${total} 题`);
console.log(fails ? `${fails} 项失败` : '全部通过');
process.exit(fails ? 1 : 0);
