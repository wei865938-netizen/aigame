/* 中国象棋引擎(无 DOM):走法生成、将军判定、alpha-beta 搜索。
   棋盘 10 行 × 9 列,下标 r*9+c,第 0 行在上(黑方),第 9 行在下(红方)。
   棋子:红 1帅 2仕 3相 4马 5车 6炮 7兵;黑 = 红 + 7;0 空。红方 side=0,黑方 side=1。 */
(function(root){
'use strict';
const K=1,A=2,B=3,N=4,R=5,C=6,P=7;
const INIT=[
  12,11,10,9,8,9,10,11,12,
  0,0,0,0,0,0,0,0,0,
  0,13,0,0,0,0,0,13,0,
  14,0,14,0,14,0,14,0,14,
  0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,
  7,0,7,0,7,0,7,0,7,
  0,6,0,0,0,0,0,6,0,
  0,0,0,0,0,0,0,0,0,
  5,4,3,2,1,2,3,4,5];
const sideOf=p=>p===0?-1:(p<=7?0:1);
const kind=p=>p>7?p-7:p;
const inBoard=(r,c)=>r>=0&&r<10&&c>=0&&c<9;
const inPalace=(r,c,side)=>c>=3&&c<=5&&(side===0?r>=7:r<=2);
const ownSide=(r,side)=>side===0?r>=5:r<=4;
/* 子力表(红方视角,行 0 在上);黑方用 9-r 镜像 */
const PST={};
PST[P]=[[9,9,9,11,13,11,9,9,9],[19,24,34,42,44,42,34,24,19],[19,24,32,37,37,37,32,24,19],[19,23,27,29,30,29,27,23,19],[14,18,20,27,29,27,20,18,14],[7,0,13,0,16,0,13,0,7],[7,0,7,0,15,0,7,0,7],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0]].map(r=>r.map(v=>v*4.5));
PST[N]=[[90,90,90,96,90,96,90,90,90],[90,96,103,97,94,97,103,96,90],[92,98,99,103,99,103,99,98,92],[93,108,100,107,100,107,100,108,93],[90,100,99,103,104,103,99,100,90],[90,98,101,102,103,102,101,98,90],[92,94,98,95,98,95,98,94,92],[93,92,94,95,92,95,94,92,93],[85,90,92,93,78,93,92,90,85],[88,85,90,88,90,88,90,85,88]].map(r=>r.map(v=>v*4.5));
PST[R]=[[206,208,207,213,214,213,207,208,206],[206,212,209,216,233,216,209,212,206],[206,208,207,214,216,214,207,208,206],[206,213,213,216,216,216,213,213,206],[208,211,211,214,215,214,211,211,208],[208,212,212,214,215,214,212,212,208],[204,209,204,212,214,212,204,209,204],[198,208,204,212,212,212,204,208,198],[200,208,206,212,200,212,206,208,200],[194,206,204,212,200,212,204,206,194]].map(r=>r.map(v=>v*4.4));
PST[C]=[[100,100,96,91,90,91,96,100,100],[98,98,96,92,89,92,96,98,98],[97,97,96,91,92,91,96,97,97],[96,99,99,98,100,98,99,99,96],[96,96,96,96,100,96,96,96,96],[95,96,99,96,100,96,99,96,95],[96,96,96,96,96,96,96,96,96],[97,96,100,99,101,99,100,96,97],[96,97,98,98,98,98,98,97,96],[96,96,97,99,99,99,97,96,96]].map(r=>r.map(v=>v*4.5));
const FLAT={};FLAT[K]=10000;FLAT[A]=200;FLAT[B]=200;
const VAL={1:10000,2:200,3:200,4:430,5:930,6:450,7:110};
function pieceValue(p,r,c){const k=kind(p),s=sideOf(p);const rr=s===0?r:9-r;if(PST[k])return PST[k][rr][c];let v=FLAT[k];if(k===A||k===B)v+=(c===4?8:0);return v;}
/* 生成伪合法走法,返回 [from,to,...] 扁平数组 */
const HORSE=[[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[1,-2],[-1,2],[1,2]];
const ORTH=[[1,0],[-1,0],[0,1],[0,-1]];
function genPseudo(b,side){
  const mv=[];
  for(let i=0;i<90;i++){const p=b[i];if(!p||sideOf(p)!==side)continue;const r=(i-i%9)/9,c=i%9,k=kind(p);
    const add=(tr,tc)=>{if(!inBoard(tr,tc))return;const t=b[tr*9+tc];if(t&&sideOf(t)===side)return;mv.push(i,tr*9+tc);};
    if(k===K){for(const d of ORTH){const tr=r+d[0],tc=c+d[1];if(inPalace(tr,tc,side))add(tr,tc);}}
    else if(k===A){for(const d of [[1,1],[1,-1],[-1,1],[-1,-1]]){const tr=r+d[0],tc=c+d[1];if(inPalace(tr,tc,side))add(tr,tc);}}
    else if(k===B){for(const d of [[1,1],[1,-1],[-1,1],[-1,-1]]){const tr=r+2*d[0],tc=c+2*d[1];if(!inBoard(tr,tc)||!ownSide(tr,side))continue;if(b[(r+d[0])*9+c+d[1]])continue;add(tr,tc);}}
    else if(k===N){for(const d of HORSE){const tr=r+d[0],tc=c+d[1];if(!inBoard(tr,tc))continue;const lr=r+(Math.abs(d[0])===2?Math.sign(d[0]):0),lc=c+(Math.abs(d[1])===2?Math.sign(d[1]):0);if(b[lr*9+lc])continue;add(tr,tc);}}
    else if(k===R){for(const d of ORTH){let tr=r+d[0],tc=c+d[1];while(inBoard(tr,tc)){const t=b[tr*9+tc];if(t){if(sideOf(t)!==side)mv.push(i,tr*9+tc);break;}mv.push(i,tr*9+tc);tr+=d[0];tc+=d[1];}}}
    else if(k===C){for(const d of ORTH){let tr=r+d[0],tc=c+d[1],screen=false;while(inBoard(tr,tc)){const t=b[tr*9+tc];if(!screen){if(t)screen=true;else mv.push(i,tr*9+tc);}else if(t){if(sideOf(t)!==side)mv.push(i,tr*9+tc);break;}tr+=d[0];tc+=d[1];}}}
    else if(k===P){const f=side===0?-1:1;add(r+f,c);if(!ownSide(r,side)){add(r,c-1);add(r,c+1);}}
  }
  return mv;
}
function findKing(b,side){const k=side===0?K:K+7;for(let i=0;i<90;i++)if(b[i]===k)return i;return -1;}
/* (r,c) 是否被 bySide 攻击(含双王照面) */
function attacked(b,r,c,bySide){
  const off=bySide===0?0:7;
  for(const d of ORTH){let tr=r+d[0],tc=c+d[1],screen=false;
    while(inBoard(tr,tc)){const t=b[tr*9+tc];if(t){if(!screen){if(t===R+off||t===K+off)return true;screen=true;}else{if(t===C+off)return true;break;}}tr+=d[0];tc+=d[1];}}
  for(const d of HORSE){const hr=r+d[0],hc=c+d[1];if(!inBoard(hr,hc)||b[hr*9+hc]!==N+off)continue;
    const lr=hr+(Math.abs(d[0])===2?-Math.sign(d[0]):0),lc=hc+(Math.abs(d[1])===2?-Math.sign(d[1]):0);if(!b[lr*9+lc])return true;}
  const pawn=P+off;
  if(bySide===0){if(inBoard(r+1,c)&&b[(r+1)*9+c]===pawn)return true;if(r<=4){if(c>0&&b[r*9+c-1]===pawn)return true;if(c<8&&b[r*9+c+1]===pawn)return true;}}
  else{if(inBoard(r-1,c)&&b[(r-1)*9+c]===pawn)return true;if(r>=5){if(c>0&&b[r*9+c-1]===pawn)return true;if(c<8&&b[r*9+c+1]===pawn)return true;}}
  return false;
}
function inCheck(b,side){const ki=findKing(b,side);if(ki<0)return true;return attacked(b,(ki-ki%9)/9,ki%9,1-side);}
function make(b,from,to){const cap=b[to];b[to]=b[from];b[from]=0;return cap;}
function unmake(b,from,to,cap){b[from]=b[to];b[to]=cap;}
function genLegal(b,side){const ps=genPseudo(b,side),out=[];for(let i=0;i<ps.length;i+=2){const cap=make(b,ps[i],ps[i+1]);const ok=!inCheck(b,side);unmake(b,ps[i],ps[i+1],cap);if(ok)out.push({from:ps[i],to:ps[i+1]});}return out;}
function evaluate(b,side){let s=0;for(let i=0;i<90;i++){const p=b[i];if(!p)continue;const v=pieceValue(p,(i-i%9)/9,i%9);s+=sideOf(p)===0?v:-v;}return side===0?s:-s;}
function key(b,side){let s=side?'b':'r';for(let i=0;i<90;i++)s+=String.fromCharCode(65+b[i]);return s;}
/* ===== 搜索 ===== */
const MATE=100000;
function Searcher(b,opts){
  this.b=b;this.nodes=0;this.deadline=Date.now()+(opts.timeMs||1000);this.stop=false;this.history=new Int32Array(90*90);this.hist=opts.history||[];
}
Searcher.prototype.order=function(moves,side){
  const b=this.b,h=this.history;
  for(const m of moves){const cap=b[m.to];m.s=(cap?VAL[kind(cap)]*10-VAL[kind(b[m.from])]/10+50000:0)+h[m.from*90+m.to];}
  moves.sort((x,y)=>y.s-x.s);
};
Searcher.prototype.quiesce=function(alpha,beta,side,qd){
  this.nodes++;let stand=evaluate(this.b,side);if(stand>=beta)return stand;if(stand>alpha)alpha=stand;if(qd<=0)return stand;
  const ps=genPseudo(this.b,side);const caps=[];for(let i=0;i<ps.length;i+=2)if(this.b[ps[i+1]])caps.push({from:ps[i],to:ps[i+1]});
  this.order(caps,side);
  for(const m of caps){const cap=make(this.b,m.from,m.to);if(inCheck(this.b,side)){unmake(this.b,m.from,m.to,cap);continue;}
    const v=-this.quiesce(-beta,-alpha,1-side,qd-1);unmake(this.b,m.from,m.to,cap);if(v>=beta)return v;if(v>alpha)alpha=v;}
  return alpha;
};
Searcher.prototype.negamax=function(depth,alpha,beta,side,ply){
  if(this.stop)return 0;
  if((++this.nodes&1023)===0&&Date.now()>this.deadline){this.stop=true;return 0;}
  if(depth<=0)return this.quiesce(alpha,beta,side,4);
  const moves=genLegal(this.b,side);
  if(!moves.length)return -MATE+ply;
  this.order(moves,side);
  let best=-Infinity;
  for(const m of moves){const cap=make(this.b,m.from,m.to);const v=-this.negamax(depth-1,-beta,-alpha,1-side,ply+1);unmake(this.b,m.from,m.to,cap);
    if(this.stop)return 0;
    if(v>best)best=v;if(v>alpha){alpha=v;if(!cap)this.history[m.from*90+m.to]+=depth*depth;}if(alpha>=beta)break;}
  return best;
};
/* level 1 简单 2 普通 3 困难;返回 {from,to,score,depth,nodes} */
function chooseMove(board,side,opts){
  opts=opts||{};const level=opts.level||2;const b=board.slice();
  const maxDepth=level===1?2:(level===2?3:6);const timeMs=opts.timeMs||(level===1?300:(level===2?900:2200));
  const S=new Searcher(b,{timeMs:timeMs,history:opts.history});
  const root=genLegal(b,side);if(!root.length)return null;
  const seen=new Set(opts.history||[]);
  let best=null,bestDepth=0;
  for(let depth=1;depth<=maxDepth;depth++){
    S.order(root,side);
    if(best){const i=root.findIndex(m=>m.from===best.from&&m.to===best.to);if(i>0){const m=root.splice(i,1)[0];root.unshift(m);}}
    let alpha=-Infinity,cur=null;
    for(const m of root){const cap=make(b,m.from,m.to);
      let v=-S.negamax(depth-1,-Infinity,-alpha,1-side,1);
      if(!cap&&seen.has(key(b,1-side)))v-=60;         // 避免重复局面
      unmake(b,m.from,m.to,cap);
      if(S.stop)break;
      if(level===1)v+=Math.random()*80-40;                // 简单档加噪声
      if(v>alpha){alpha=v;cur={from:m.from,to:m.to,score:v};}}
    if(S.stop&&depth>1)break;
    if(cur){best=cur;bestDepth=depth;}
    if(S.stop)break;
    if(Math.abs(alpha)>MATE-100)break;
  }
  if(!best)best={from:root[0].from,to:root[0].to,score:0};
  best.depth=bestDepth;best.nodes=S.nodes;return best;
}
function gameOver(b,side){if(!genLegal(b,side).length)return inCheck(b,side)?'checkmate':'stalemate';return null;}
const CHARS={1:'帅',2:'仕',3:'相',4:'马',5:'车',6:'炮',7:'兵',8:'将',9:'士',10:'象',11:'马',12:'车',13:'炮',14:'卒'};
root.Xiangqi={INIT:INIT,RED:0,BLACK:1,kind:kind,sideOf:sideOf,genLegal:genLegal,genPseudo:genPseudo,make:make,unmake:unmake,inCheck:inCheck,attacked:attacked,evaluate:evaluate,chooseMove:chooseMove,gameOver:gameOver,key:key,CHARS:CHARS,findKing:findKing};
})(typeof globalThis!=='undefined'?globalThis:this);
