import { modules } from './modules.js';
import { REFERENCE } from './art.js';
import { createSceneRenderer } from './mesh.js';
import { INTRO, wingStart } from './intro-timeline.js';
const W=1672,H=941,END=INTRO.duration;
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
const phase=(t,s,d)=>ease((t-s)/d);
// A small, monotonic hinge movement settles without repeated spring oscillation.
const fan=(t,start,side)=>{
  const u=clamp((t-start)/INTRO.wings.settle);
  return side*.055*(1-u)**3;
};
export async function createScene(stage,character){
  const boot=performance.now(),image=new Image();image.src=REFERENCE;
  const field=path=>fetch(`/src/data/${path}`).then(r=>{if(!r.ok)throw Error(`Missing scene field: ${path}`);return r.arrayBuffer();}).then(b=>new Uint8Array(b));
  const [timing,ownership,metadata]=await Promise.all([field('mi-ink-timing.bin'),field('scene-ownership.bin'),fetch('/src/data/scene-fields.json').then(r=>r.json()),image.decode()]);
  const artwork=Object.assign(document.createElement('canvas'),{width:W,height:H});
  const a=artwork.getContext('2d');a.drawImage(image,0,0,W,H);
  const labelWidths={course:113,calendar:131,assignment:180,flashcards:114,writing:140,exam:169,inbox:134,originality:148,daily:220,grades:207};
  const holes=[[64,53,442,81],[73,137,401,31],[74,173,330,31],[1030,23,610,74],[1266,103,327,41],[1372,151,216,23],[1497,179,93,23],[1040,185,244,53],[660,848,360,49],...modules.flatMap(m=>[[m.label[0]-4,m.label[1]-2,labelWidths[m.id],64],m.arrow])];
  a.globalCompositeOperation='destination-out';a.filter='blur(2px)';
  a.beginPath();for(const [x,y,w,h] of holes)a.rect(x-2,y-2,w+4,h+4);a.fill();
  a.filter='none';a.globalCompositeOperation='source-over';
  const fallback=artwork;fallback.className='scene-canvas';fallback.setAttribute('aria-hidden','true');stage.prepend(fallback);
  const renderer=createSceneRenderer(stage,artwork,character,timing,ownership);
  const nodes={brand:stage.querySelector('.brand'),topbar:stage.querySelector('.topbar'),greeting:stage.querySelector('.greeting'),dialog:stage.querySelector('.mi-dialog'),footer:stage.querySelector('.footer-motto')};
  const groups=modules.map(m=>({module:m,node:stage.querySelector(`[data-module="${m.id}"]`),start:m.side?wingStart(m.row):INTRO[m.id].start}));
  let time=0,reduced=false,raf=0,running=false,idle=false,motion=false,frozen=false,started=0,duration=INTRO.playbackDuration,previous=0,nextFrame=0;
  let target=[0,0],gaze=[0,0],reactionStart=-Infinity,reactionType='',lastPointer=-Infinity;
  let samples=[],idleSamples=[],lastValues=null,domTime=-1;
  const show=(node,value)=>{node.style.opacity=String(value);};
  function draw(t,now=performance.now()){
    time=Math.min(END,t);const final=t>=END,short=reduced?phase(t,0,650):-1;
    const value=(s,d)=>final?1:reduced?short:phase(t,s,d);
    const dt=Math.min(60,Math.max(1,now-previous));previous=now;
    const damp=1-Math.exp(-dt/175);
    const elapsed=now-reactionStart;
    const react=elapsed<1250?Math.sin(elapsed/1250*Math.PI)*Math.exp(-elapsed/1300):0;
    const autonomous=now-lastPointer>9000;
    const glance=autonomous?Math.sin(now/7300)*.27:0;
    gaze[0]+=((target[0]+glance)-gaze[0])*damp;gaze[1]+=(target[1]-gaze[1])*damp;
    const life=idle&&motion&&!frozen?1:0;
    const wings=new Float32Array(8);
    if(!final || domTime!==END) for(const group of groups){
      const m=group.module;
      show(group.node,value(group.start+(m.side?INTRO.wings.labelDelay:100),m.side?INTRO.wings.labelDuration:INTRO[m.id].duration-100));
      if(m.side&&innerWidth>=900){
        const side=m.side==='left'?-1:1;
        const angle=final||reduced?0:fan(t,group.start,side);
        wings[m.row*2+(side>0?1:0)]=angle;
        group.node.style.transformOrigin=`${side<0?574:1118}px ${345+m.row*147}px`;
        group.node.style.transform=`rotate(${angle}rad)`;
      }else group.node.style.transform='';
    }
    if(!final || domTime!==END){
      show(nodes.brand,1);show(nodes.topbar,value(INTRO.topbar.start,INTRO.topbar.duration));show(nodes.greeting,value(INTRO.greeting.start,INTRO.greeting.duration));
      show(nodes.dialog,value(INTRO.dialog.start,INTRO.dialog.duration));show(nodes.footer,value(INTRO.footer.start,INTRO.footer.duration));
      stage.dataset.introTime=String(Math.round(t));stage.classList.toggle('scene-complete',final);
      domTime=time;
    }
    const breath=Math.sin(now/5700*Math.PI*2);
    lastValues={time:t,fade:final?-1:short,life,breath:life?breath:0,
      tilt:life?(gaze[0]*.009+Math.sin(now/9400)*.002+(reactionType==='nod'?react*.015:reactionType==='speak'?react*.003:react*.007)):0,
      nod:life&&reactionType!=='glance'?react*(reactionType==='speak'?.22:1):0,
      mouth:character.sampleSpeech(now).mouth,hair:life?Math.sin(now/6900*Math.PI*2-.7):0,gaze:life?gaze:[0,0],wings};
    if(renderer?.available)renderer.render(lastValues);
    else {fallback.style.opacity=String(final?1:reduced?short:phase(t,INTRO.character.start,INTRO.character.duration));stage.classList.remove('mesh-active');}
    const renderedAt=performance.now();
    if(running)samples.push(renderedAt);else if(idle&&life)idleSamples.push(renderedAt);
    if(idleSamples.length>300)idleSamples.shift();
  }
  function stop(){cancelAnimationFrame(raf);raf=0;running=false;}
  function loop(now){
    if(document.hidden||(!running&&(!idle||!motion||frozen)))return;
    if(now>=nextFrame-1){
      draw(running?(now-started)/duration*(reduced?650:END):END,now);
      nextFrame+=1000/60;if(nextFrame<now-30)nextFrame=now+1000/60;
    }
    raf=requestAnimationFrame(loop);
  }
  function wake(){cancelAnimationFrame(raf);previous=performance.now();nextFrame=previous;raf=requestAnimationFrame(loop);}
  character.bind({
    change(){if(renderer?.available){renderer.updateEyes();if(lastValues&&!running&&(!idle||!motion||frozen))renderer.render(lastValues);}},
    look(x,y){target=[x,y];lastPointer=performance.now();},
    activity(value){motion=value;frozen=false;if(idle){draw(END);if(motion)wake();else cancelAnimationFrame(raf);}},
    react(type){reactionType=type;reactionStart=performance.now();}
  });
  stage.addEventListener('scenecontextlost',()=>{fallback.style.opacity='1';});
  draw(0);stage.classList.add('scene-ready');
  const initializedMs=performance.now()-boot;
  return {
    play(simple=false){stop();idle=false;frozen=false;reduced=simple||!renderer?.available;duration=reduced?650:INTRO.playbackDuration;samples=[];started=performance.now();running=true;draw(0,started);wake();return duration;},
    finish(){stop();idle=true;reduced=false;draw(END);if(motion)wake();},
    seek(t,simple=false){stop();idle=false;frozen=true;reduced=simple;draw(Math.max(0,t));},
    freezeAmbient(){cancelAnimationFrame(raf);frozen=true;draw(END);},
    stop,
    inspectPixels(points){if(!renderer?.available)return null;renderer.render(lastValues);return renderer.inspectPixels(points);},
    getState:()=>({time:Math.round(time),running,complete:time>=END,tracedStrokes:metadata.strokes,leadContours:metadata.leadContours,inkCompleteAt:metadata.drawingEnd,semanticOwnership:true,idle,continuousMesh:!!renderer?.available,duration,initializedMs:Math.round(initializedMs),performance:{timestamps:samples,idleTimestamps:idleSamples},gaze:gaze.map(n=>+n.toFixed(3))})
  };
}
