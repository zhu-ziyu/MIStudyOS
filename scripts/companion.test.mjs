import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompanion } from '../src/companion.js';
import { DIALOGUE_LINES, speechPlan, speechPose } from '../src/dialogue-lines.js';

function fixture() {
  let clock=0,seq=0,home=true,allowed=true,motion=true,auto=true,plan=null,began=0;
  const timers=new Map(),nodes={};
  const node=()=>({textContent:'',dataset:{},attributes:{},classList:{add(){},remove(){}},
    setAttribute(k,v){this.attributes[k]=v;},append(){}});
  globalThis.document={createElement:node};
  const bubble=node();bubble.querySelector=key=>nodes[key]??=node();
  const character={talk(text){plan=speechPlan(text);began=clock;return plan.duration;},
    stopTalk(){plan=null;},getState:()=>speechPose(plan,clock-began)};
  const companion=createCompanion({character,bubble,isHome:()=>home,autoAllowed:()=>allowed,
    motionEnabled:()=>motion,preferences:()=>({companion:auto}),random:()=>.37,now:()=>clock,
    later(fn,delay){const id=++seq;timers.set(id,{at:clock+delay,fn});return id;},clear:id=>timers.delete(id)});
  function advance(ms){
    const end=clock+ms;
    for(;;){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next||next[1].at>end)break;
      clock=next[1].at;timers.delete(next[0]);next[1].fn();
    }clock=end;
  }
  return {companion,bubble,nodes,timers,advance,
    set(values){if('home'in values)home=values.home;if('allowed'in values)allowed=values.allowed;
      if('motion'in values)motion=values.motion;if('auto'in values)auto=values.auto;}};
}

test('speech closes for punctuation and restores the original closed pose at the end',()=>{
  const plan=speechPlan('学，习。');
  assert.equal(plan.pulses.length,2);
  const first=plan.pulses[0],second=plan.pulses[1];
  assert.ok(speechPose(plan,first.at+first.duration/2).mouth>.5);
  assert.equal(speechPose(plan,first.at+first.duration+100).mouth,0);
  assert.ok(second.at>=first.at+first.duration+210);
  assert.deepEqual(speechPose(plan,plan.duration),{mouth:0,speaking:false});
});
test('click response, click cooldown and repeated-poke persona',()=>{
  const f=fixture();f.companion.sync();
  assert.equal(f.companion.poke(),true);
  assert.equal(f.companion.getState().text,'你是来学习的，不是来戳我的。');
  const first=f.companion.getState().lineId;
  assert.equal(f.companion.poke(),false);
  assert.equal(f.companion.getState().lineId,first);
  f.advance(1800);f.companion.poke();f.advance(1800);f.companion.poke();
  assert.equal(f.companion.getState().kind,'repeat');
  assert.equal(f.timers.size,2,'One typing timer and one reminder; no queued overlapping speech');
});
test('automatic reminders are local, quiet during editing and disabled by preference',()=>{
  const f=fixture();f.companion.sync();
  assert.ok(f.companion.getState().nextAutoInMs>=60000);
  f.set({allowed:false});f.companion.sync();f.advance(180000);
  assert.equal(f.companion.getState().kind,'welcome');
  assert.equal(f.timers.size,0);
  f.set({allowed:true});f.companion.sync();f.advance(82200);
  assert.equal(f.companion.getState().kind,'idle');
  assert.ok(DIALOGUE_LINES.some(l=>l.id===f.companion.getState().lineId));
  f.set({auto:false});f.companion.sync();assert.equal(f.timers.size,0);
  assert.equal(f.companion.poke(),true,'Manual response remains enabled');
});
test('pause and reduced motion never leave partial text, speech or timers',()=>{
  const f=fixture();f.companion.sync({welcome:true});f.advance(650);
  f.set({home:false});f.companion.pause();
  assert.equal(f.timers.size,0);assert.equal(f.companion.getState().speaking,false);
  assert.equal(f.nodes['.dialog-cn'].textContent,f.companion.getState().text);
  f.set({home:true,motion:false});f.companion.sync();f.companion.poke();
  assert.equal(f.companion.getState().typing,false);
  assert.equal(f.nodes['.dialog-cn'].textContent,f.companion.getState().text);
});
test('preset bags do not repeat until exhausted, and arbitrary prompts cannot enter the catalogue',()=>{
  const f=fixture();f.companion.sync();const seen=new Set();
  for(let i=0;i<12;i++){assert.equal(f.companion.preview('idle'),true);seen.add(f.companion.getState().lineId);}
  assert.equal(seen.size,12);
  assert.equal(f.companion.preview('撒娇卖萌'),false);
  assert.equal(DIALOGUE_LINES.length,23);
  assert.equal(new Set(DIALOGUE_LINES.map(l=>l.id)).size,23);
});
