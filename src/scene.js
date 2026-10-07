import { modules } from './modules.js';
import { REFERENCE } from './art.js';
import { createAmbientMesh } from './mesh.js';

const W=1672, H=941;
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>{ n=clamp(n); return n*n*(3-2*n); };
const phase=(time,start,duration)=>ease((time-start)/duration);
const canvas=()=>Object.assign(document.createElement('canvas'),{width:W,height:H});

// Original ink shares one coordinate system. No translated crops or separately
// clipped paper rectangles can break connecting vines or character hair.
export async function createScene(stage, character) {
  const image=new Image(); image.src=REFERENCE;
  const [strokes]=await Promise.all([
    fetch('/src/data/mi-ink-strokes.json').then(response=>response.json()),image.decode()
  ]);
  const surface=canvas(); surface.className='scene-canvas';
  surface.setAttribute('aria-hidden','true'); stage.prepend(surface);
  const context=surface.getContext('2d');
  const mask=canvas(), artwork=canvas();
  const m=mask.getContext('2d'), a=artwork.getContext('2d');
  a.drawImage(image,0,0,W,H);
  const labelWidths={course:113,calendar:131,assignment:180,flashcards:114,writing:140,exam:169,inbox:134,originality:148,daily:220,grades:207};
  const holes=[
    [64,53,442,81],[73,137,401,31],[74,173,330,31],
    [1030,23,610,74],[1266,103,327,41],[1372,151,216,23],[1497,179,93,23],[1040,185,244,53],
    [660,848,360,49],...modules.flatMap(module=>[
      [module.label[0]-4,module.label[1]-2,labelWidths[module.id],64],
      [module.arrow[0],module.arrow[1],module.arrow[2],module.arrow[3]]
    ])
  ];
  a.globalCompositeOperation='destination-out';
  for(const [x,y,w,h] of holes){ a.save(); a.filter='blur(2px)'; a.fillRect(x-2,y-2,w+4,h+4); a.restore(); }
  a.globalCompositeOperation='source-over';

  function softRegion(path,feather=12){
    const layer=canvas(),ctx=layer.getContext('2d');
    ctx.filter=`blur(${feather}px)`; ctx.fillStyle='#fff'; ctx.fill(new Path2D(path));
    return layer;
  }
  const rect=(x,y,w,h)=>`M${x},${y}h${w}v${h}h-${w}Z`;
  const scenery=softRegion(`${rect(-20,-20,615,235)}${rect(-20,190,91,640)}${rect(1610,-20,82,850)}${rect(580,-20,1140,46)}`,8);
  const silhouette=softRegion('M672,-8 C738,-10 783,12 857,5 C911,4 968,63 990,127 C1014,179 1009,237 1061,288 C1107,313 1125,344 1151,382 C1189,419 1152,456 1190,516 C1209,549 1171,573 1157,610 L529,610 C498,590 477,577 475,542 C440,516 482,481 481,437 C475,391 522,350 521,306 C528,254 562,222 568,175 C588,126 591,51 672,-8Z',16);
  const sc=silhouette.getContext('2d');
  sc.globalCompositeOperation='destination-out'; sc.filter='blur(9px)';
  sc.fillRect(994,146,316,132); sc.globalCompositeOperation='source-over'; sc.filter='none';
  const groups=modules.map(module=>{
    const region=module.side
      ?softRegion(rect(module.side==='left'?43:1127,module.rect[1]-5,module.side==='left'?532:500,module.rect[3]+22),13)
      :softRegion(rect(module.rect[0]-10,module.rect[1]-5,module.rect[2]+20,module.rect[3]+8),5);
    return {module,region,start:module.side?3100+module.row*350+(module.side==='right'?70:0):module.id==='daily'?4550:4820};
  });
  const bottom=softRegion(`${rect(-20,780,577,185)}${rect(1117,782,580,183)}${rect(536,840,602,130)}`,10);
  const bubble=softRegion(rect(983,136,339,158),6);
  const paths=strokes.map(stroke=>({...stroke,path:new Path2D(stroke.d)}));
  const traceMask=canvas(),tm=traceMask.getContext('2d');
  const finishedInk=canvas(),fm=finishedInk.getContext('2d');
  const complete=new Set();let previousTraceTime=-1;
  for(const ctx of [tm,fm]){ctx.strokeStyle='#fff';ctx.lineWidth=7;ctx.lineCap='round';ctx.lineJoin='round';}
  function trace(t){
    if(t<previousTraceTime){fm.clearRect(0,0,W,H);complete.clear();}
    previousTraceTime=t;tm.clearRect(0,0,W,H);
    for(let index=0;index<paths.length;index++){
      const stroke=paths[index],amount=clamp((t-stroke.start)/stroke.duration);
      if(!amount||complete.has(index))continue;
      if(amount===1){fm.stroke(stroke.path);complete.add(index);continue;}
      tm.setLineDash([stroke.length,stroke.length+1]);
      tm.lineDashOffset=stroke.length*(1-amount);tm.stroke(stroke.path);
    }
    tm.setLineDash([]);tm.drawImage(finishedInk,0,0);
    tm.globalCompositeOperation='destination-in';tm.drawImage(silhouette,0,0);tm.globalCompositeOperation='source-over';
  }
  const dom={
    brand:stage.querySelector('.brand'),topbar:stage.querySelector('.topbar'),
    greeting:stage.querySelector('.greeting'),dialog:stage.querySelector('.mi-dialog'),
    footer:stage.querySelector('.footer-motto'),
    groups:groups.map(group=>({...group,node:stage.querySelector(`[data-module="${group.module.id}"]`)}))
  };
  const show=(node,opacity,lift=0)=>{
    node.style.opacity=String(opacity); node.style.translate=`0 ${lift*(1-opacity)}px`;
  };
  let time=0,reduced=false,raf=0,started=0,running=false,idle=false;
  const ambient=createAmbientMesh(stage,artwork,character.canvas);
  character.bind({change:()=>ambient.updateEyes(),look:(x,y)=>ambient.look(x,y),activity:value=>ambient.setActive(idle&&value)});
  function draw(t,simple=false){
    time=t; reduced=simple;
    const final=t>=6800,short=simple?phase(t,0,650):null;
    m.clearRect(0,0,W,H); m.globalAlpha=1;
    if(final||simple){
      m.globalAlpha=final?1:short; m.fillStyle='#fff'; m.fillRect(0,0,W,H);
    }else{
      m.fillStyle='#fff'; m.globalAlpha=phase(t,5250,1000);
      if(m.globalAlpha>0)m.fillRect(0,0,W,H);
      const blend=(layer,amount)=>{if(amount>.001){m.globalAlpha=amount;m.drawImage(layer,0,0);}};
      blend(scenery,phase(t,70,700));
      // A pale pencil guide connects the fine strokes visually from the first
      // drawing stage. Long real contours lead the detailed ink finish.
      blend(silhouette,.16*phase(t,650,700)+.84*phase(t,2250,900));
      for(const group of groups)blend(group.region,phase(t,group.start,660));
      blend(bottom,phase(t,5100,850));
      if(t>=620&&t<3150){
        trace(t);blend(traceMask,1-phase(t,2700,450));
      }
      // Wing/background fields must not expose stray sections of the speech
      // bubble before the complete bubble appears as its own final stage.
      m.globalCompositeOperation='destination-out'; m.globalAlpha=1-phase(t,5480,700);
      m.drawImage(bubble,0,0); m.globalCompositeOperation='source-over';
      m.globalAlpha=phase(t,5480,700); m.drawImage(bubble,0,0);
    }
    m.globalAlpha=1;
    context.clearRect(0,0,W,H); context.globalCompositeOperation='source-over';
    context.drawImage(artwork,0,0);
    context.globalCompositeOperation='destination-in'; context.drawImage(mask,0,0);
    context.globalCompositeOperation='source-over';
    const value=(start,duration)=>final?1:simple?short:phase(t,start,duration);
    show(dom.brand,value(260,850));
    show(dom.topbar,value(1400,650),2); show(dom.greeting,value(1850,700),2);
    show(dom.dialog,value(5630,620),1); show(dom.footer,value(5280,700));
    for(const group of dom.groups) show(group.node,value(group.start+130,540),2);
    stage.dataset.introTime=String(Math.round(t));
    stage.classList.toggle('scene-complete',final);
  }
  function stop(){cancelAnimationFrame(raf); running=false;}
  let lastFrame=-Infinity;
  function loop(now){if(!running)return;if(now-lastFrame>=15){draw(now-started,reduced);lastFrame=now;}raf=requestAnimationFrame(loop);}
  draw(0); stage.classList.add('scene-ready');
  return {
    play(simple=false){stop();idle=false;ambient.setActive(false);previousTraceTime=-1;complete.clear();fm.clearRect(0,0,W,H);reduced=simple;started=performance.now();lastFrame=-Infinity;running=true;draw(0,simple);raf=requestAnimationFrame(loop);},
    finish(){stop();idle=true;draw(6800);},
    seek(t,simple=false){stop();idle=false;ambient.setActive(false);draw(Math.max(0,t),simple);},
    freezeAmbient:()=>{ambient.setActive(true);ambient.freeze();},
    stop,
    getState:()=>({time:Math.round(time),running,complete:time>=6800,tracedStrokes:paths.length,idle,continuousMesh:ambient.available})
  };
}
