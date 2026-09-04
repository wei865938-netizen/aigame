/* 羊了个羊 引擎(无 DOM):关卡生成(保证有解)、压牌判定、进槽消除、移出/洗牌。
   坐标以"牌"为单位,x/y 可取 0.5 的倍数,z 为层级;两张牌若 z 不同且矩形相交(重叠>0),高的压住低的。 */
(function(root){
'use strict';
const KINDS=['carrot','bell','scissors','stump','corn','bucket','milk','yarn','fire','fork','cabbage','glove'];
const SLOT_MAX=7;
function makeRng(seed){let s=(seed>>>0)||1;return function(){s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
/* 关卡参数:图案种类、总牌数(3 的倍数)、层数、两侧叠放条长度 */
function params(n){
  const T=[[5,30,3,[]],[7,54,4,[6]],[9,81,5,[7,7]],[11,105,6,[8,8]],[12,120,7,[9,9]]];
  const p=T[Math.min(n,T.length)-1];const extra=Math.max(0,n-T.length);
  return {kinds:Math.min(12,p[0]),total:p[1]+extra*15,layers:Math.min(8,p[2]+Math.floor(extra/2)),stacks:p[3].map(s=>Math.min(12,s+extra))};
}
const overlap=(a,b)=>Math.abs(a.x-b.x)<0.999&&Math.abs(a.y-b.y)<0.999;
const covers=(a,b)=>a.z>b.z&&overlap(a,b);
function shuffleArr(a,rnd){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}
/* 生成牌位(不含图案) */
function layout(p,rnd){
  const tiles=[];let id=0;
  const stackTotal=p.stacks.reduce((s,v)=>s+v,0);let mainTotal=p.total-stackTotal;
  // 每层容量:偶数层 6×6 整数格,奇数层 5×5 半格偏移
  const cells=l=>{const out=[];if(l%2===0){for(let r=0;r<6;r++)for(let c=0;c<6;c++)out.push({x:1+c,y:0.5+r});}else{for(let r=0;r<5;r++)for(let c=0;c<5;c++)out.push({x:1.5+c,y:1+r});}return out;};
  // 各层分配数量:越高越少
  const w=[];for(let l=0;l<p.layers;l++)w.push(p.layers-l+1);const ws=w.reduce((s,v)=>s+v,0);
  const per=w.map(v=>Math.round(mainTotal*v/ws));let diff=mainTotal-per.reduce((s,v)=>s+v,0);per[0]+=diff;
  for(let l=0;l<p.layers;l++)per[l]=Math.min(per[l],l%2===0?36:25);
  diff=mainTotal-per.reduce((s,v)=>s+v,0);for(let l=0;diff>0&&l<p.layers;l++){const cap=(l%2===0?36:25)-per[l];const add=Math.min(cap,diff);per[l]+=add;diff-=add;}
  let below=[];
  for(let l=0;l<p.layers;l++){
    let cand=cells(l);
    if(l>0){const sup=cand.filter(c=>below.some(b=>overlap(c,b)));if(sup.length>=per[l])cand=sup;}
    shuffleArr(cand,rnd);const chosen=cand.slice(0,per[l]);
    for(const c of chosen)tiles.push({id:id++,x:c.x,y:c.y,z:l,kind:null,state:'board'});
    below=chosen;
  }
  // 两侧叠放条:横向压叠,越靠外层级越高(最外一张空闲)
  p.stacks.forEach((n,si)=>{for(let i=0;i<n;i++){const x=si===0?0.15+i*0.3:7.85-i*0.3;tiles.push({id:id++,x:x,y:7.6,z:100+i,kind:null,state:'board'});}});
  return tiles;
}
/* 随机"自下而上"拓扑序:一张牌只有在它压住的所有牌都排好后才能排 */
function topoOrder(tiles,rnd){
  const n=tiles.length,idx=new Map();tiles.forEach((t,i)=>idx.set(t.id,i));
  const above=tiles.map(()=>[]),remain=new Array(n).fill(0);
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(i!==j&&covers(tiles[i],tiles[j])){above[j].push(i);remain[i]++;}}
  const avail=[];for(let i=0;i<n;i++)if(remain[i]===0)avail.push(i);
  const order=[];
  while(avail.length){const k=Math.floor(rnd()*avail.length);const i=avail[k];avail[k]=avail[avail.length-1];avail.pop();order.push(tiles[i]);for(const a of above[i]){if(--remain[a]===0)avail.push(a);}}
  return order; // 从底到顶
}
/* 按拓扑序三张三张分配图案(groups 可指定顺序与大小),返回正解(从上往下的点击顺序) */
function assign(tiles,groups,rnd){
  const R=topoOrder(tiles,rnd);let pos=R.length;
  for(const g of groups){for(let i=0;i<g.size;i++){pos--;if(pos<0)throw new Error('分组数量与牌数不符');R[pos].kind=g.kind;}}
  if(pos!==0)throw new Error('分组数量与牌数不符 '+pos);
  return R.slice().reverse().map(t=>t.id);
}
function kindCycle(K,rnd){let bag=[];return()=>{if(!bag.length)bag=shuffleArr(KINDS.slice(0,K),rnd);return bag.pop();};}
function generate(level,seed){
  const rnd=makeRng(seed==null?Math.floor(Math.random()*1e9):seed);const p=params(level);
  const tiles=layout(p,rnd);const next=kindCycle(p.kinds,rnd);
  const groups=[];for(let i=0;i<tiles.length/3;i++)groups.push({kind:next(),size:3});
  const solution=assign(tiles,groups,rnd);
  return {level:level,params:p,tiles:tiles,solution:solution,rnd:rnd};
}
/* ===== 对局 ===== */
function newGame(level,seed){const g=generate(level,seed);return {level:level,tiles:g.tiles,slot:[],solution:g.solution,rnd:g.rnd,movedOut:0,over:null};}
const byId=(st,id)=>st.tiles[id];
function boardTiles(st){return st.tiles.filter(t=>t.state==='board');}
function isFree(st,t){if(t.state!=='board')return false;for(const o of st.tiles){if(o.state==='board'&&o!==t&&covers(o,t))return false;}return true;}
function freeIds(st){return boardTiles(st).filter(t=>isFree(st,t)).map(t=>t.id);}
/* 点牌:返回 {ok, removed:[id×3]|null, full:bool} */
function pick(st,id){
  const t=byId(st,id);if(!t||st.over||!isFree(st,t)||st.slot.length>=SLOT_MAX)return {ok:false,removed:null,full:false};
  t.state='slot';st.slot.push(id);
  const same=st.slot.filter(i=>byId(st,i).kind===t.kind);let removed=null;
  if(same.length>=3){removed=same.slice(0,3);for(const i of removed){byId(st,i).state='gone';}st.slot=st.slot.filter(i=>removed.indexOf(i)<0);}
  const full=!removed&&st.slot.length>=SLOT_MAX;
  if(full)st.over='lose';else if(st.tiles.every(x=>x.state==='gone'))st.over='win';
  return {ok:true,removed:removed,full:full};
}
/* 移出:槽里前 3 张放回牌面的空位(最上层,必空闲) */
function moveOut(st){
  const ids=st.slot.splice(0,Math.min(3,st.slot.length));
  ids.forEach((id,i)=>{const t=byId(st,id);t.state='board';t.x=2.5+i*1.05+st.movedOut*0.02;t.y=8.75;t.z=300+st.movedOut*3+i;});
  st.movedOut++;if(st.over==='lose')st.over=null;return ids;
}
/* 洗牌:只重排牌面上剩余牌的图案,且保证仍然有解(槽里已有的图案对应的牌会排在可先取到的位置) */
function shuffle(st){
  const board=boardTiles(st);if(!board.length)return [];
  const rnd=st.rnd||Math.random;
  const slotCount={};for(const id of st.slot){const k=byId(st,id).kind;slotCount[k]=(slotCount[k]||0)+1;}
  const cnt={};for(const t of board)cnt[t.kind]=(cnt[t.kind]||0)+1;
  const groups=[];
  for(const k in slotCount){const need=(3-slotCount[k]%3)%3;if(need>0&&cnt[k]>=need){groups.push({kind:k,size:need});cnt[k]-=need;}}
  const rest=[];for(const k in cnt){while(cnt[k]>=3){rest.push({kind:k,size:3});cnt[k]-=3;}if(cnt[k]>0){rest.push({kind:k,size:cnt[k]});cnt[k]=0;}}
  shuffleArr(rest,rnd);
  st.solution=assign(board,groups.concat(rest),rnd);
  return st.solution;
}
function snapshot(st){return {slot:st.slot.slice(),tiles:st.tiles.map(t=>({state:t.state,x:t.x,y:t.y,z:t.z,kind:t.kind})),movedOut:st.movedOut,over:st.over};}
function restore(st,sn){st.slot=sn.slot.slice();sn.tiles.forEach((s,i)=>{const t=st.tiles[i];t.state=s.state;t.x=s.x;t.y=s.y;t.z=s.z;t.kind=s.kind;});st.movedOut=sn.movedOut;st.over=sn.over;}
root.Sheep={KINDS:KINDS,SLOT_MAX:SLOT_MAX,params:params,generate:generate,newGame:newGame,isFree:isFree,freeIds:freeIds,pick:pick,moveOut:moveOut,shuffle:shuffle,snapshot:snapshot,restore:restore,covers:covers,makeRng:makeRng};
})(typeof globalThis!=='undefined'?globalThis:this);
