// Closed lids are registered art, softly restricted to the actual eye regions.
const CLOSED='/assets/lineart/01_character/mi_closed_eyes_reference.png';
export async function createCharacter(stage){
  const character=document.createElement('div');
  character.className='mi-character'; character.setAttribute('aria-hidden','true');
  const surface=document.createElement('canvas');
  surface.width=1672;surface.height=941;surface.className='mi-eyes';
  character.append(surface);stage.append(character);
  const ctx=surface.getContext('2d'),image=new Image();image.src=CLOSED;
  const [registration]=await Promise.all([
    fetch('/src/data/mi-blink-registration.json').then(response=>response.json()),image.decode()
  ]);
  const patch=document.createElement('canvas');patch.width=1672;patch.height=941;
  const p=patch.getContext('2d'),matrix=registration.matrix;
  p.setTransform(matrix[0][0],matrix[1][0],matrix[0][1],matrix[1][1],matrix[0][2],matrix[1][2]);
  p.drawImage(image,0,0,1672,941);p.resetTransform();
  const mask=document.createElement('canvas');mask.width=1672;mask.height=941;
  const m=mask.getContext('2d');m.filter='blur(2.5px)';m.fillStyle='#fff';
  m.beginPath();m.ellipse(806,264,36,16,-.48,0,Math.PI*2);m.fill();
  m.beginPath();m.ellipse(894,227,27,19,-.48,0,Math.PI*2);m.fill();
  p.globalCompositeOperation='destination-in';p.drawImage(mask,0,0);
  let active=false,enabled=true,timer=0,raf=0,amount=0;
  let onChange=()=>{},onLook=()=>{},onActivity=()=>{};
  function render(value){
    amount=Math.max(0,Math.min(1,value));ctx.clearRect(0,0,1672,941);
    ctx.globalAlpha=amount;ctx.drawImage(patch,0,0);ctx.globalAlpha=1;
    character.dataset.blink=amount.toFixed(3);
    onChange();
  }
  function cancel(){clearTimeout(timer);cancelAnimationFrame(raf);timer=0;raf=0;render(0);}
  function schedule(){
    clearTimeout(timer);
    if(active&&enabled&&!document.hidden)timer=setTimeout(blink,4700+Math.random()*3100);
  }
  function blink(){
    if(!active||!enabled||document.hidden)return;
    const began=performance.now();
    const tick=now=>{
      const t=now-began;
      if(t>=310){render(0);raf=0;schedule();return;}
      const value=t<100?t/100:t<145?1:1-(t-145)/165;
      render(value*value*(3-2*value));raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
  }
  render(0);
  return {
    element:character,canvas:surface,
    bind({change,look,activity}){onChange=change;onLook=look;onActivity=activity;},
    start(){active=true;if(!raf)schedule();onActivity(active&&enabled&&!document.hidden);},
    pause(){active=false;cancel();onActivity(false);},
    setMotion(value){enabled=!!value;cancel();if(active)schedule();onActivity(active&&enabled&&!document.hidden);},
    look(x,y){if(active&&enabled)onLook(x,y);},reset(){render(0);onLook(0,0);},
    seekBlink(value){clearTimeout(timer);cancelAnimationFrame(raf);render(value);},
    getState:()=>({active,enabled,blink:amount,scheduled:!!timer,registrationInliers:registration.inliers})
  };
}
