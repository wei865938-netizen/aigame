/* AIGAME 公共工具:存档、对话框、画布适配、主循环、指针坐标、绘图小工具 */
window.Shell=(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const lerp=(a,b,t)=>a+(b-a)*t;
  const store={
    get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
    set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  };
  const DPR=()=>Math.min(3,window.devicePixelRatio||1);
  function dialog(overlay,opt){
    overlay.innerHTML='';const d=document.createElement('div');d.className='dlg';
    if(opt.title){const h=document.createElement('h2');h.textContent=opt.title;d.appendChild(h);}
    for(const l of (opt.lines||[])){const p=document.createElement('p');p.textContent=l;d.appendChild(p);}
    if(opt.html){const div=document.createElement('div');div.innerHTML=opt.html;d.appendChild(div);}
    if(opt.build)opt.build(d);
    if(opt.buttons&&opt.buttons.length){const bs=document.createElement('div');bs.className='btns';
      for(const b of opt.buttons){const btn=document.createElement('button');btn.textContent=b.label;if(b.primary)btn.className='pri';btn.addEventListener('click',()=>{closeDialog(overlay);if(b.onClick)b.onClick();});bs.appendChild(btn);}
      d.appendChild(bs);}
    overlay.appendChild(d);overlay.hidden=false;return d;
  }
  function closeDialog(o){o.hidden=true;o.innerHTML='';}
  /* 画布铺满 stage,返回设备像素尺寸 */
  function fit(canvas,stage){
    const dpr=DPR();const r=stage.getBoundingClientRect();
    const w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));
    canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    return {w:canvas.width,h:canvas.height,dpr:dpr};
  }
  function watchResize(stage,fn){
    if(window.ResizeObserver)new ResizeObserver(fn).observe(stage);
    window.addEventListener('resize',fn);
  }
  function makeLoop(step){
    let raf=0,last=0,running=false;
    function frame(t){raf=requestAnimationFrame(frame);const dt=Math.min(0.05,Math.max(0,(t-last)/1000));last=t;step(dt);}
    return {
      start(){if(running)return;running=true;last=performance.now();raf=requestAnimationFrame(frame);},
      stop(){running=false;cancelAnimationFrame(raf);},
      isRunning(){return running;}
    };
  }
  function pointerPos(canvas,e){
    const r=canvas.getBoundingClientRect();
    return {x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)};
  }
  function bindNav(){
    document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)location.href=b.dataset.go;});
    document.addEventListener('touchmove',e=>{if(e.target.closest('.stage'))e.preventDefault();},{passive:false});
  }
  function rr(g,x,y,w,h,r){
    r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();
  }
  function text(g,str,x,y,size,fill,stroke,align,font){
    g.font='bold '+Math.round(size)+'px '+(font||'ui-monospace,Menlo,Consolas,"Microsoft YaHei",sans-serif');
    g.textAlign=align||'center';g.textBaseline='middle';
    if(stroke){g.lineWidth=Math.max(2,size*0.18);g.lineJoin='round';g.strokeStyle=stroke;g.strokeText(str,x,y);}
    g.fillStyle=fill;g.fillText(str,x,y);
  }
  function star(g,cx,cy,r,rot,fill,stroke){
    g.beginPath();for(let i=0;i<10;i++){const rr2=i%2?r*0.45:r;const a=(rot||0)+i*Math.PI/5-Math.PI/2;g.lineTo(cx+Math.cos(a)*rr2,cy+Math.sin(a)*rr2);}
    g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=Math.max(1,r*0.14);g.stroke();}
  }
  /* 通用漂浮字/粒子 */
  function makeFx(){
    const pops=[],parts=[];
    return {
      pop(str,x,y,color,size){pops.push({str,x,y,color:color||'#fff',size:size||18,t:0,life:0.9});},
      burst(x,y,color,n,speed,size){for(let i=0;i<(n||8);i++){const a=Math.random()*Math.PI*2,sp=(speed||120)*(0.4+Math.random());parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-speed*0.3,color,size:(size||4)*(0.6+Math.random()*0.8),t:0,life:0.5+Math.random()*0.4});}},
      update(dt,gravity){for(const p of pops){p.t+=dt;p.y-=40*dt;}for(const p of parts){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(gravity==null?500:gravity)*dt;}
        for(let i=pops.length-1;i>=0;i--)if(pops[i].t>=pops[i].life)pops.splice(i,1);
        for(let i=parts.length-1;i>=0;i--)if(parts[i].t>=parts[i].life)parts.splice(i,1);},
      draw(g,scale){scale=scale||1;for(const p of parts){g.globalAlpha=1-p.t/p.life;g.fillStyle=p.color;g.beginPath();g.arc(p.x,p.y,p.size*scale,0,Math.PI*2);g.fill();}
        for(const p of pops){g.globalAlpha=p.t<p.life*0.6?1:1-(p.t-p.life*0.6)/(p.life*0.4);text(g,p.str,p.x,p.y,p.size*scale,p.color,'rgba(0,0,0,.75)');}
        g.globalAlpha=1;},
      clear(){pops.length=0;parts.length=0;}
    };
  }
  return {$,clamp,rand,lerp,store,DPR,dialog,closeDialog,fit,watchResize,makeLoop,pointerPos,bindNav,rr,text,star,makeFx};
})();
