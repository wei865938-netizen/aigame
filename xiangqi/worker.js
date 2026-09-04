/* 象棋 AI 在后台线程里思考,不卡界面 */
importScripts('engine.js');
onmessage=function(e){
  const d=e.data;
  const res=Xiangqi.chooseMove(d.board,d.side,{level:d.level,timeMs:d.timeMs,history:d.history});
  postMessage({id:d.id,move:res});
};
