// The authored clock matches the precompiled ink field. Play it at 6.2 seconds
// without changing the relative timing of ink, wings, labels and captions.
// Each pair settles before the next pair starts; the character has a quiet hold.
export const INTRO = {
  duration: 11300,
  playbackDuration: 6200,
  border: { start: 40, duration: 650 },
  character: { start: 540, duration: 3300, finish: 3910, finishDuration: 690 },
  wings: { start: 5000, stagger: 820, duration: 680, settle: 760, labelDelay: 430, labelDuration: 310 },
  daily: { start: 8480, duration: 520 },
  grades: { start: 9140, duration: 520 },
  topbar: { start: 9840, duration: 400 },
  greeting: { start: 9980, duration: 430 },
  bottom: { start: 9900, duration: 700 },
  bubble: { start: 10500, duration: 500 },
  dialog: { start: 10610, duration: 400 },
  footer: { start: 10790, duration: 410 },
  completeArt: { start: 11020, duration: 260 }
};
export const wingStart = row => INTRO.wings.start + row * INTRO.wings.stagger;
export const introCaptions = [
  [0, '纸面苏醒'],
  [540, '落笔 · 勾勒发丝'],
  [1520, '点睛 · 描摹眉眼'],
  [2760, '描线 · 衣袖成形'],
  [3910, '染墨 · 明暗入画'],
  [4600, '宓 · 静候片刻'],
  [5000, '花枝舒展 · 双翼成章'],
  [8300, '双翼落定'],
  [8480, '今日 · 从容启程'],
  [9840, '书房渐明'],
  [10500, '宓 · 欢迎回来']
];
