# 宓语 StudyOS：首页出场动画详细分镜表（秒级时间轴版）

**目标画幅：** 16:9 / 3840×2160 设计基准  
**推荐刷新率：** 60 FPS  
**完整首次启动：** 约 6.8 秒  
**后续启动快速版：** 1.2–1.6 秒  
**视觉原则：** 纸面苏醒 → 宓被一笔笔画出 → 左右“翅膀”从角色向外生长 → 两张主卡片落位 → 宓第一次眨眼 → 进入 Idle。  
**禁止：** 所有按钮同帧突然出现、强弹跳、霓虹、泛光、整屏缩放、所有装饰同时晃动。

| 时间 | 阶段 | 画面 / 元素 | 动画动作 | 实现建议 |
|---|---|---|---|---|
| 0.00–0.35s | Paper Wake | 纸张底纹 | 从近乎纯白进入 2–5% 纸纹；对比度缓慢稳定 | 背景纹理 opacity；不移动 |
| 0.18–0.75s | Distant Ink | 顶部枝条、左右边缘框、底部静物轮廓 | 先出现最淡的远景墨线，再出现近景线 | Mask reveal / alpha ramp |
| 0.45–1.10s | Brand Seed | 「宓语 StudyOS」+ 英文副标题 | 标题像墨笔书写；英文晚 100ms | SVG stroke-dash；若是 raster 用横向/路径 mask |
| 0.70–1.25s | Mi / 大轮廓 | 宓 | 人物主要外轮廓与长发大轮廓先被画出 | 角色线稿分组 mask |
| 1.15–1.90s | Mi / 发丝主体 | 宓 | 主发束、身体轮廓、衣袖逐渐完成 | Seeded random stroke reveal |
| 1.40–2.30s | Top Bar | Search / Bell / Settings / Avatar | 每项 70ms stagger；文字 2px 上移并淡入 | UIRevealQueue |
| 1.70–2.30s | Mi / 五官 | 眼睛、眉、鼻、嘴、脸部近发 | 先眼睛再脸部；避免整张脸突然出现 | 眼部优先 mask |
| 1.85–2.65s | Greeting | Good Morning / 日期 / Fall 2026 | 三行依次出现；无缩放 | Text fade + 2px translateY |
| 2.20–2.85s | Mi / 手与笔 | 手、笔、笔坠 | 笔最后一笔落下后，坠饰有 1 次极轻摆动 | stroke reveal + pendulum |
| 2.35–2.85s | First Life | 眼神/刘海 | 眼睛先轻微移动 1 次，刘海晚 100ms settle | GazeController + hair inertia |
| 2.70–3.35s | Wing Root | 左右枝干根部 | 从角色两侧向外画出，左右相差约 80ms | Path draw |
| 3.10–3.55s | Wing Pair 1 | Course Hub / Writing Studio | 框→图标→标题→英文→箭头→流苏 | staggered reveal |
| 3.45–3.90s | Wing Pair 2 | Smart Calendar / Exam Center | 同上；左右交错 | staggered reveal |
| 3.80–4.25s | Wing Pair 3 | Assignment / Campus Inbox | 同上 | staggered reveal |
| 4.15–4.65s | Wing Pair 4 | Flashcards / Originality | 同上；最后才完成花叶和小装饰 | staggered reveal |
| 4.55–5.15s | Core 1 | Daily Dashboard | 从下方 10px 落位；框线先完成，图标与字后出现 | translateY + opacity |
| 4.82–5.42s | Core 2 | Grade Tracker | 比上一个晚 270ms；相同语言 | translateY + opacity |
| 5.20–5.65s | Foreground Settle | 底部书本、花、扇、流苏 | 2–4px 落定，流苏继续 250ms 惯性 | spring |
| 5.55–6.15s | Mi Dialog | 对话气泡 | 边框描绘 → 纸面淡层 → 中文 → 英文小字 | border draw + text reveal |
| 6.05–6.38s | First Blink | 宓眼睛 | 第一次自然眨眼，作为“主页正式苏醒”标志 | 130/70/130ms |
| 6.25–6.80s | Final Settle | 全页面 | 所有 residual motion 衰减到 Idle 范围 | damped spring |
| 6.80s+ | Idle | 宓 + 环境 | 呼吸、随机眨眼、鼠标注视、头发延迟、流苏、局部花枝、分层景深 | State machine |

## Idle / Live2D 建议

- **Breathing**：4.6–6.2s 周期，主体 Y ±1.2px，scale 1→1.003。
- **Blink**：2.8–6.5s 随机，15% 双眨。
- **Gaze**：低频 Watch Mode；眼珠永不越出安全眼眶。
- **Head follow**：最大约 0.8–1.2°，晚于眼球 80–150ms。
- **Front hair**：头部之后约 +90ms。
- **Long hair**：+140ms。
- **Tassel / flower**：+180–240ms。
- **Parallax**：背景 1–2px、角色 2–4px、前景 4–8px；功能按钮主体最多 1–2px。
- **Ambient breathing**：每 8–15 秒只动一小处花枝/流苏，不允许全屏一起动。

## Hover / Click 微动效

- 功能翼片：`translateY(-2px)` + 线框加深 + 图标 1.02 scale；花饰晚 60ms、流苏晚 120–180ms。
- Daily Dashboard / Grade Tracker：`translateY(-3px)`，内部墨色聚焦 5–8%。
- Search：focus 时边框像一笔补完；caret 使用细墨线。
- Bell / Settings：只做 1–2px 微位移或 1.02 scale，不旋转大角度。
- Dialog：出现先描边、再文字；关闭反向执行但总时长不超过 220ms。

## Intro Skip

用户点击 / 按键跳过时：**不要隐藏动画中未出现的控件**。立即把所有元素 fast-forward 到最终稳定状态，并执行 120–180ms 的统一 settle。角色进入 Neutral，禁止停在半绘制状态。

## Reduced Motion

开启 Reduced Motion 时：总时长压缩到约 0.8–1.2s，只保留分组 stagger fade；禁用角色逐线描绘、翅膀大范围展开和景深位移。
