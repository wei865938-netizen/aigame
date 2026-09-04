/* 五子棋引擎(无 DOM):15×15,棋型评分 + 浅层 alpha-beta。board 为长度 225 的数组,0 空 1 黑 2 白。 */
(function(root){
'use strict';
const N=15;
const S={FIVE:100000,LIVE4:10000,RUSH4:1500,LIVE3:1200,SLEEP3:150,LIVE2:120,SLEEP2:15,ONE:3};
const RE={rush4:/11110|01111|11011|10111|11101/,live3:/01110|010110|011010/,sleep3:/11100|00111|10110|01101|11010|01011|10011|11001|10101/,live2:/00110|01100|01010|010010/,sleep2:/000110|011000|00101|10100|10001/};
const DIRS=[[1,0],[0,1],[1,1],[1,-1]];
function lineStr(b,x,y,dx,dy,me){let s='';for(let k=-4;k<=4;k++){const xx=x+dx*k,yy=y+dy*k;if(xx<0||yy<0||xx>=N||yy>=N){s+='2';continue;}const v=k===0?me:b[yy*N+xx];s+=v===0?'0':(v===me?'1':'2');}return s;}
function scoreLine(s){
  if(s.indexOf('11111')>=0)return S.FIVE;
  if(s.indexOf('011110')>=0)return S.LIVE4;
  if(RE.rush4.test(s))return S.RUSH4;
  if(RE.live3.test(s))return S.LIVE3;
  if(RE.sleep3.test(s))return S.SLEEP3;
  if(RE.live2.test(s))return S.LIVE2;
  if(RE.sleep2.test(s))return S.SLEEP2;
  return S.ONE;
}
/* 在 (x,y) 落 me 子的价值(不实际落子) */
function evalPoint(b,x,y,me){
  let sum=0,big=0,rush=0,live3=0;
  for(const d of DIRS){const sc=scoreLine(lineStr(b,x,y,d[0],d[1],me));sum+=sc;if(sc>=S.LIVE4)big++;if(sc===S.RUSH4)rush++;if(sc===S.LIVE3)live3++;}
  if(big>=1)return Math.max(sum,S.LIVE4);
  if(rush>=2||(rush>=1&&live3>=1))sum+=S.LIVE4*0.9;   // 双冲四 / 冲四活三:必胜手
  else if(live3>=2)sum+=S.LIVE4*0.5;                    // 双活三
  return sum;
}
function isWin(b,x,y){
  const me=b[y*N+x];if(!me)return null;
  for(const d of DIRS){let n=1;const cells=[[x,y]];
    for(const sg of [1,-1]){let xx=x+d[0]*sg,yy=y+d[1]*sg;while(xx>=0&&yy>=0&&xx<N&&yy<N&&b[yy*N+xx]===me){n++;cells.push([xx,yy]);xx+=d[0]*sg;yy+=d[1]*sg;}}
    if(n>=5)return cells;}
  return null;
}
function candidates(b){
  const set=new Set();let any=false;
  for(let i=0;i<N*N;i++){if(!b[i])continue;any=true;const x=i%N,y=(i-x)/N;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=N||yy>=N)continue;const j=yy*N+xx;if(!b[j])set.add(j);}}
  if(!any)return [Math.floor(N/2)*N+Math.floor(N/2)];
  return Array.from(set);
}
function scored(b,me){
  const opp=3-me;const out=[];
  for(const i of candidates(b)){const x=i%N,y=(i-x)/N;const a=evalPoint(b,x,y,me),d=evalPoint(b,x,y,opp);out.push({i:i,x:x,y:y,a:a,d:d,t:a+d*0.9});}
  out.sort((p,q)=>q.t-p.t);return out;
}
/* 静态评估:己方最佳落点价值 - 对方最佳落点价值 */
function evaluate(b,me){const opp=3-me;let best=0,bo=0;for(const i of candidates(b)){const x=i%N,y=(i-x)/N;best=Math.max(best,evalPoint(b,x,y,me));bo=Math.max(bo,evalPoint(b,x,y,opp));}return best-bo*1.1;}
function negamax(b,depth,alpha,beta,me,K){
  const list=scored(b,me).slice(0,K);
  if(!list.length)return 0;
  if(depth<=0)return evaluate(b,me);
  let best=-Infinity;
  for(const c of list){
    if(c.a>=S.FIVE)return S.FIVE*10;               // 我方此手成五
    b[c.i]=me;
    let v;
    if(c.d>=S.FIVE&&c.a<S.FIVE){v=-negamax(b,depth-1,-beta,-alpha,3-me,K);} // 挡对方成五
    else v=-negamax(b,depth-1,-beta,-alpha,3-me,K);
    b[c.i]=0;
    if(v>best)best=v;if(v>alpha)alpha=v;if(alpha>=beta)break;
  }
  return best;
}
/* level: 1 简单 2 普通 3 困难 */
function chooseMove(b,me,level){
  const list=scored(b,me);if(!list.length)return -1;
  const opp=3-me;
  for(const c of list)if(c.a>=S.FIVE)return c.i;                 // 直接成五
  const block=list.filter(c=>c.d>=S.FIVE);if(block.length)return block.sort((p,q)=>q.a-p.a)[0].i; // 必须挡五
  const must=list.filter(c=>c.d>=S.LIVE4);
  if(must.length&&list[0].a<S.LIVE4*0.9){return must.sort((p,q)=>q.a-p.a)[0].i;} // 挡活四(除非自己有必胜手)
  if(level<=1){const top=list.slice(0,4);const w=top.map((c,k)=>Math.pow(0.5,k));const r=Math.random()*w.reduce((s,v)=>s+v,0);let acc=0;for(let k=0;k<top.length;k++){acc+=w[k];if(r<=acc)return top[k].i;}return top[0].i;}
  if(level===2)return list[0].i;
  // 困难:对前 8 手做 3 层搜索
  const K=8;let best=list[0].i,bestV=-Infinity;
  for(const c of list.slice(0,K)){b[c.i]=me;const v=-negamax(b,2,-Infinity,Infinity,opp,K)+c.t*0.001;b[c.i]=0;if(v>bestV){bestV=v;best=c.i;}}
  return best;
}
root.Gomoku={N:N,S:S,evalPoint:evalPoint,isWin:isWin,candidates:candidates,scored:scored,chooseMove:chooseMove,newBoard:()=>new Array(N*N).fill(0)};
})(typeof globalThis!=='undefined'?globalThis:this);
