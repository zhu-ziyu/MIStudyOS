// All utterances are authored locally. Runtime accepts catalogue keys only.
export const PERSONA = Object.freeze({
  name: '宓', role: '冷淡学姐',
  rules: Object.freeze(['简短、克制、直接', '关心学习，不撒娇、不暧昧', '提醒可以严格，不羞辱用户', '只使用审核过的预设台词'])
});
const line = (id, kind, cn, en) => Object.freeze({id,kind,cn,en});
export const DIALOGUE_LINES = Object.freeze([
  line('welcome-seat','welcome','来了就坐好。先做最重要的一项。','Take a seat. Start with the priority.'),
  line('welcome-start','welcome','书已经翻开了。别再拖延。','The book is open. Get started.'),
  line('welcome-plan','welcome','今天要做什么，先写清楚。','Write down what you need to do.'),
  line('poke-study','poke','你是来学习的，不是来戳我的。','You came to study. Not to poke me.'),
  line('poke-page','poke','手收回去。先把这页看完。','Hands back. Finish this page.'),
  line('poke-question','poke','看够了？把题目打开。','Had enough? Open the question.'),
  line('poke-book','poke','我在看书。你也该开始了。','I am reading. You should start too.'),
  line('poke-progress','poke','戳我，不算学习进度。','Poking me is not study progress.'),
  line('poke-note','poke','有问题就记下来。别只顾着点。','Write your questions down.'),
  line('poke-again','repeat','还在戳？作业写完了？','Still poking? Finished your work?'),
  line('poke-enough','repeat','到此为止。把注意力放回题目。','Enough. Back to the question.'),
  line('idle-task','idle','任务不会自己完成。选一项，开始。','Pick a task. It will not do itself.'),
  line('idle-think','idle','先自己想一遍，再看答案。','Think first. Then check the answer.'),
  line('idle-mistake','idle','错题先改。别急着做下一道。','Fix the mistake before moving on.'),
  line('idle-plan','idle','计划写得再漂亮，也要执行。','A good plan still needs action.'),
  line('idle-phone','idle','手机放下。把这段读完。','Put the phone down. Finish reading.'),
  line('idle-draft','idle','先完成，再润色。','Finish first. Polish later.'),
  line('idle-pace','idle','慢一点可以。一直拖着，不行。','Slow is fine. Endless delay is not.'),
  line('idle-honest','idle','没看懂就标出来。别骗自己。','Mark what you do not understand.'),
  line('idle-conclusion','idle','写下结论。空想不算进度。','Write your conclusion down.'),
  line('idle-focus','idle','安静一点。把注意力留给题目。','Quiet now. Focus on the question.'),
  line('idle-review','idle','今天的内容，今天消化。','Review what you learned today.'),
  line('idle-rest','idle','累了就休息片刻。回来继续。','Take a short break. Then continue.')
]);
export const DEFAULT_LINE = DIALOGUE_LINES[0];

// Chinese characters get short, irregular syllable pulses; punctuation closes
// the mouth and creates a longer pause. This is silent dialogue animation.
export function speechPlan(text) {
  const pulses=[];
  let at=100,index=0;
  for(const glyph of text) {
    if(/[，,、；;：:]/u.test(glyph)){at+=210;continue;}
    if(/[。.!！?？]/u.test(glyph)){at+=340;continue;}
    if(/\s/u.test(glyph)){at+=70;continue;}
    const duration=145+(index%3)*20;
    pulses.push({at,duration,amplitude:[.56,.75,.64,.88][index%4]});
    at+=duration+30+(index%2)*12;index++;
  }
  return {pulses,duration:at+160};
}
export function speechPose(plan,elapsed) {
  if(!plan||elapsed<0||elapsed>=plan.duration)return {mouth:0,speaking:false};
  const pulse=plan.pulses.find(p=>elapsed>=p.at&&elapsed<p.at+p.duration);
  const mouth=pulse?Math.sin((elapsed-pulse.at)/pulse.duration*Math.PI)**1.2*pulse.amplitude:0;
  return {mouth,speaking:true};
}
