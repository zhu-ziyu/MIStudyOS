import { PERSONA, DIALOGUE_LINES, DEFAULT_LINE } from './dialogue-lines.js';

export function createCompanion({character,bubble,isHome,autoAllowed,motionEnabled,preferences,
  random=Math.random,now=()=>performance.now(),later=setTimeout,clear=clearTimeout}) {
  const cn=bubble.querySelector('.dialog-cn'),en=bubble.querySelector('.dialog-en');
  const status=document.createElement('span');status.className='sr-only';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  status.setAttribute('aria-atomic','true');bubble.append(status);
  cn.setAttribute('aria-hidden','true');en.setAttribute('aria-hidden','true');
  const bags=new Map();
  let current=DEFAULT_LINE,autoTimer=0,typeTimer=0,greetTimer=0,suspended=true;
  let nextAutoAt=0,nextPokeAt=0,lastPoke=-Infinity,pokeCount=0,firstPoke=true;
  let speakingUntil=0,typed=0;

  function renderFull(){cn.textContent=current.cn;en.textContent=current.en;typed=current.cn.length;}
  renderFull();bubble.dataset.lineId=current.id;bubble.dataset.lineKind=current.kind;
  function choose(kind){
    let bag=bags.get(kind);
    if(!bag?.length){
      bag=DIALOGUE_LINES.filter(l=>l.kind===kind);
      for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
      if(bag.length>1&&bag.at(-1).id===current.id)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];
      bags.set(kind,bag);
    }
    return bag?.pop();
  }
  function cancelTyping(){clear(typeTimer);typeTimer=0;renderFull();bubble.classList.remove('is-speaking');}
  function arm(){
    if(suspended||!preferences().companion||!isHome()||!autoAllowed())return;
    if(autoTimer)return;
    const delay=60000+Math.floor(random()*60000);nextAutoAt=now()+delay;
    autoTimer=later(()=>{
      autoTimer=0;nextAutoAt=0;
      if(!suspended&&preferences().companion&&isHome()&&autoAllowed())say('idle');
      arm();
    },delay);
  }
  function say(kind){
    if(suspended||!isHome())return false;
    const next=kind==='poke'&&firstPoke?DIALOGUE_LINES.find(l=>l.id==='poke-study'):choose(kind);
    if(!next)return false;
    if(kind==='poke')firstPoke=false;
    clear(greetTimer);greetTimer=0;
    cancelTyping();character.stopTalk();current=next;
    bubble.dataset.lineId=current.id;bubble.dataset.lineKind=current.kind;
    status.textContent=`${PERSONA.name}：${current.cn}`;
    bubble.setAttribute('aria-label',`宓：${current.cn} 点击再说一句`);
    const duration=character.talk(current.cn);speakingUntil=now()+duration;
    if(motionEnabled()){
      typed=0;cn.textContent='';en.textContent=current.en;bubble.classList.add('is-speaking');
      const step=()=>{
        if(suspended||!isHome()){cancelTyping();return;}
        typed++;cn.textContent=current.cn.slice(0,typed);
        if(typed<current.cn.length)typeTimer=later(step,62);
        else {typeTimer=later(()=>{typeTimer=0;bubble.classList.remove('is-speaking');},Math.max(0,speakingUntil-now()));}
      };
      typeTimer=later(step,40);
    }else renderFull();
    clear(autoTimer);autoTimer=0;nextAutoAt=0;arm();
    return true;
  }
  function poke(){
    if(suspended||!isHome()||now()<nextPokeAt)return false;
    pokeCount=now()-lastPoke<9000?pokeCount+1:1;lastPoke=now();nextPokeAt=now()+1800;
    return say(pokeCount>=3?'repeat':'poke');
  }
  function pause(){
    suspended=true;clear(autoTimer);clear(greetTimer);autoTimer=greetTimer=0;nextAutoAt=0;
    cancelTyping();character.stopTalk();speakingUntil=0;
  }
  function sync({welcome=false}={}){
    if(!isHome()){pause();return;}
    suspended=false;
    if(!motionEnabled()){cancelTyping();character.stopTalk();}
    if(!preferences().companion||!autoAllowed()){
      clear(autoTimer);clear(greetTimer);autoTimer=greetTimer=0;nextAutoAt=0;
      if(['welcome','idle'].includes(current.kind)){cancelTyping();character.stopTalk();}
    }else arm();
    if(welcome&&preferences().companion){
      clear(greetTimer);greetTimer=later(()=>{greetTimer=0;if(isHome()&&!suspended&&autoAllowed())say('welcome');},650);
    }
  }
  return {poke,pause,sync,
    // Deterministic native QA can trigger a fixed *category*, never free text.
    preview(kind){return ['welcome','idle'].includes(kind)&&say(kind);},
    getState:()=>({persona:PERSONA.role,local:true,lineId:current.id,kind:current.kind,text:current.cn,
      suspended,scheduled:!!autoTimer,nextAutoInMs:Math.max(0,Math.round(nextAutoAt-now())),
      speaking:character.getState().speaking,typing:!!typeTimer,autoEnabled:!!preferences().companion,pokeCount})
  };
}
