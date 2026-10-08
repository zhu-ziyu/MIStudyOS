// One wall-clock timeline shared by ink, wing deformation, labels and captions.
// Each pair settles before the next pair starts; the character has a quiet hold.
export const INTRO = {
  duration: 9300,
  border: { start: 40, duration: 650 },
  character: { start: 540, duration: 2100, finish: 2400, finishDuration: 300 },
  wings: { start: 3000, stagger: 820, duration: 680, settle: 760, labelDelay: 430, labelDuration: 310 },
  daily: { start: 6480, duration: 520 },
  grades: { start: 7140, duration: 520 },
  topbar: { start: 7840, duration: 400 },
  greeting: { start: 7980, duration: 430 },
  bottom: { start: 7900, duration: 700 },
  bubble: { start: 8500, duration: 500 },
  dialog: { start: 8610, duration: 400 },
  footer: { start: 8790, duration: 410 },
  completeArt: { start: 8780, duration: 460 }
};
export const wingStart = row => INTRO.wings.start + row * INTRO.wings.stagger;
export const introCaptions = [
  [0, '纸面苏醒'],
  [540, '落笔 · 与宓相遇'],
  [2700, '宓 · 静候片刻'],
  [3000, '花枝舒展 · 双翼成章'],
  [6300, '双翼落定'],
  [6480, '今日 · 从容启程'],
  [7840, '书房渐明'],
  [8500, '宓 · 欢迎回来']
];
