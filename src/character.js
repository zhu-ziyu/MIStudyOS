import { speechPlan, speechPose } from './dialogue-lines.js';
const CLOSED='/assets/lineart/01_character/mi_closed_eyes_reference.png';
// The eye atlas is only 176 × 104. Decoding the source never blocks the home.
const bounds=[756,190,176,104];
export function createCharacter(stage){
  const element=document.createElement('div');element.className='mi-character';element.setAttribute('aria-hidden','true');
  const surface=Object.assign(document.createElement('canvas'),{width:bounds[2],height:bounds[3],className:'mi-eyes'});
  Object.assign(surface.style,{left:`${bounds[0]}px`,top:`${bounds[1]}px`,width:`${bounds[2]}px`,height:`${bounds[3]}px`});
  element.append(surface);stage.append(element);
  const ctx=surface.getContext('2d',{willReadFrequently:true}),patch=Object.assign(document.createElement('canvas'),{width:bounds[2],height:bounds[3]});
  let active=false,enabled=true,loaded=false,timer=0,raf=0,amount=0,blinkCount=0;
  let onChange=()=>{},onLook=()=>{},onActivity=()=>{},onReact=()=>{};
  let plan=null,talkStarted=0,manualMouth=null;
  function sampleSpeech(now=performance.now()){
    if(manualMouth!==null)return {mouth:manualMouth,speaking:false};
    if(!active||!enabled||document.hidden)return {mouth:0,speaking:false};
    const pose=speechPose(plan,now-talkStarted);
    if(!pose.speaking)plan=null;
    return pose;
  }
  function stopTalk(){plan=null;manualMouth=null;}
  function render(value){
    amount=Math.max(0,Math.min(1,value));ctx.clearRect(0,0,...bounds.slice(2));
    if(loaded&&amount){ctx.globalAlpha=amount;ctx.drawImage(patch,0,0);ctx.globalAlpha=1;}
    element.dataset.blink=amount.toFixed(3);onChange();
  }
  // First scene and controls arrive before the eyelids are decoded.
  const ready=new Promise(resolve=>setTimeout(async()=>{
    try{
      if(window.Worker&&window.OffscreenCanvas){
        try{
          const bitmap=await new Promise((done,reject)=>{
            const worker=new Worker(new URL('./eye-worker.js',import.meta.url));
            const timeout=setTimeout(()=>{worker.terminate();reject(Error('Eye preparation timed out'));},12000);
            worker.onmessage=({data})=>{clearTimeout(timeout);worker.terminate();data.error?reject(Error(data.error)):done(data.bitmap);};
            worker.onerror=()=>{clearTimeout(timeout);worker.terminate();reject(Error('Eye worker unavailable'));};
            worker.postMessage({url:new URL(CLOSED,location.href).href,bounds});
          });
          patch.getContext('2d',{willReadFrequently:true}).drawImage(bitmap,0,0);bitmap.close();
          loaded=true;render(amount);resolve(true);return;
        }catch{ /* Older renderers retain the registered canvas fallback. */ }
      }
      const image=new Image();image.src=CLOSED;await image.decode();
      const p=patch.getContext('2d');
      p.setTransform(1.0002822335,-.0002688304,.0002688304,1.0002822335,-.0454719424-bounds[0],.2229684623-bounds[1]);
      p.drawImage(image,0,0,1672,941);p.resetTransform();
      const mask=Object.assign(document.createElement('canvas'),{width:bounds[2],height:bounds[3]});
      const m=mask.getContext('2d');m.filter='blur(2.5px)';m.fillStyle='#fff';
      for(const [x,y,rx,ry] of [[806,264,36,16],[894,227,27,19]]){
        m.beginPath();m.ellipse(x-bounds[0],y-bounds[1],rx,ry,-.48,0,Math.PI*2);m.fill();
      }
      p.globalCompositeOperation='destination-in';p.drawImage(mask,0,0);
      loaded=true;render(amount);resolve(true);
    }catch{resolve(false);}
  },700));
  function cancel(){clearTimeout(timer);cancelAnimationFrame(raf);timer=raf=0;render(0);}
  function schedule(delay=3900+Math.random()*3300){
    clearTimeout(timer);timer=0;
    if(active&&enabled&&!document.hidden)timer=setTimeout(()=>blink(),delay);
  }
  function blink(){
    if(!active||!enabled||document.hidden||!loaded){schedule();return;}
    clearTimeout(timer);timer=0;cancelAnimationFrame(raf);
    const began=performance.now();blinkCount++;
    const tick=now=>{
      const t=now-began;
      if(t>=270){render(0);raf=0;schedule(blinkCount%5===0?190:undefined);return;}
      const value=t<85?t/85:t<115?1:1-(t-115)/155;
      render(value*value*(3-2*value));raf=requestAnimationFrame(tick);
    };
    if(blinkCount%5===1)onReact('glance');
    raf=requestAnimationFrame(tick);
  }
  return {
    element,canvas:surface,bounds,ready,
    bind({change,look,activity,react}){onChange=change;onLook=look;onActivity=activity;onReact=react||onReact;},
    start(){const wasActive=active;active=true;manualMouth=null;if(!raf)schedule();onActivity(enabled&&!document.hidden);if(!wasActive)onReact('welcome');},
    pause(){active=false;stopTalk();cancel();onActivity(false);},
    setMotion(value){
      const next=!!value;
      // Loading the native settings again must not interrupt a sentence or
      // restart a blink when the motion preference has not actually changed.
      if(enabled===next)return;
      enabled=next;stopTalk();cancel();if(active)schedule();onActivity(active&&enabled&&!document.hidden);
    },
    look(x,y){if(active&&enabled)onLook(x,y);},
    react(){if(active&&enabled){onReact('nod');schedule(220);}},
    talk(text){
      stopTalk();
      if(!active||!enabled||document.hidden)return 0;
      plan=speechPlan(text);talkStarted=performance.now();onReact('speak');return plan.duration;
    },
    stopTalk,sampleSpeech,
    seekTalk(value){stopTalk();manualMouth=Math.max(0,Math.min(1,value));},
    reset(){render(0);onLook(0,0);},
    seekBlink(value){clearTimeout(timer);cancelAnimationFrame(raf);timer=raf=0;render(value);},
    getState:()=>({active,enabled,blink:amount,scheduled:!!timer,eyesReady:loaded,eyeAtlas:bounds.slice(2),registrationInliers:23,
      ...sampleSpeech(),speechDuration:plan?.duration||0})
  };
}
