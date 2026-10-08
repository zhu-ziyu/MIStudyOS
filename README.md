# 宓语 StudyOS

这是 Windows 桌面软件。当前 v0.3.1 为首页 UI、分层美术、6.2 秒逐笔描绘与分幕出场动画、离线角色对话和模块入口壳层。尚未接入课程、成绩、Outlook 或新业务功能。

## 启动桌面软件

双击根目录的 `启动宓语StudyOS.cmd`，或打包后直接打开 `dist/MiStudyOS/MiStudyOS.exe`。应用使用 Python + 原生 Windows 窗口 + 内嵌 WebView2，保留原生标题栏、最小化、最大化和关闭。软件运行不需要浏览器或 Node.js。

源码启动与打包：

```powershell
.\setup-desktop.ps1
.\.desktop-env\Scripts\python.exe app.py
.\build-desktop.ps1
```

Python 依赖为 pywebview 与 PyInstaller；Windows 需有 Microsoft WebView2 Runtime。本机已有该运行时。项目原 `.venv` 指向已失效的 Python 3.13 安装位置，因此新建隔离的 `.desktop-env`，不修改旧环境。

`app.py` 在应用进程内部提供素材服务，优先使用固定本机端口以复用美术缓存，端口占用时自动分配独立端口；关闭软件时一并退出。设置写入应用目录下 `.studyos-data`，独立于浏览器配置。

## UI 开发预览

安装 Node.js 后，在本目录运行：

```powershell
npm run dev
```

开发时可打开 http://127.0.0.1:4173 检查同一套 UI。此入口仅供 UI 开发预览，桌面交付入口为 `app.py` / EXE。前端没有第三方运行依赖，无需先 npm install。`STUDYOS_PORT` 可覆盖开发端口。

## 结构

主页有 **2 个总览入口 + 8 个子模块，共 10 个主要功能区**。

| 位置 | 功能 | 子模块主题名 |
| --- | --- | --- |
| 下方中央 | 今日学习总览 / Daily Dashboard | 今日·宓语 |
| 下方中央 | 成绩追踪器 / Grade Tracker | 绩笺·宓语 |
| 左翼 1 | 课程中心 / Course Hub | 课笺·宓语 |
| 左翼 2 | 日程日历 / Smart Calendar | 时笺·宓语 |
| 左翼 3 | 作业工作台 / Assignment Workspace | 业笺·宓语 |
| 左翼 4 | 记忆卡片 / Flashcards | 忆笺·宓语 |
| 右翼 1 | 写作工坊 / Writing Studio | 墨笺·宓语 |
| 右翼 2 | 考试与错题本 / Exam & Mistake Center | 试笺·宓语 |
| 右翼 3 | 校园信箱 / Campus Inbox | 信笺·宓语 |
| 右翼 4 | 原创表达优化 / Originality Studio | 言笺·宓语 |

除已确定的「墨笺·宓语」外，其余主题名是本次 UI 的暂定文案。

- `src/main.js`：首页交互、出场状态、搜索、设置、入口适配器。
- `src/art.js`：模块 DOM、可点击标签、箭头和预览图标。
- `src/scene.js`：统一时钟、双翼铰点运动、实际绘制帧统计与暂停管理。
- `src/intro-timeline.js`：绘制、四对双翼、中央卡片与欢迎区共用的时间轴。
- `src/character.js`：延后加载的 176×104 眼部图集、自然眨眼、偏头注视和按音节开合的口型。
- `src/dialogue-lines.js`：冷淡学姐人设、23 句固定中英文台词、含标点停顿的讲话节奏。
- `src/companion.js`：点击回应、连续戳的提醒、低频主动发言、输入和窗口状态下的暂停管理。
- `src/eye-worker.js`：在工作线程解码、配准闭眼大图，避免阻塞主界面。
- `src/mesh.js`：连续原画 GPU 绘制、曲线墨迹展开、呼吸与发丝滞后；GPU 不可用时保留完整原画淡入与模块操作。
- `scripts/compile-scene-fields.py`：从原画追踪 1,337 条墨线轮廓，预编译笔画时间与互斥图层归属；修改分层几何后重新运行。仅开发时需要 OpenCV 与 NumPy。
- `src/home.css`：16:9 画卷、小屏排版、动画和减少动态效果。
- `assets/lineart/`：原素材保持原位；新增一张闭眼参考素材，原图未覆盖。
- `resource-packs/MiStudyOS_Home_4K_AssetPack/`：四个用户素材 ZIP 合并的独立资源包，保留 4K PNG、SVG、参考图、manifest 和分镜文档。
- `config/studyos.json`：旧写作项目的接入配置。
- `docs/首页实现提示词.md`：可复用实现提示词与交接要求。

## 原写作项目接入

本次检查时，工作区只有素材库与 IDE 配置，没有原写作功能源码；用户提到的 `jiaose.zip` 在给定路径未找到，但现有 `assets/lineart` 中已有角色高清资源。因此没有声称完成旧业务代码搬迁，也没有重写任何旧功能。

如果原项目是 Web 应用，在 `config/studyos.json` 中将 `writingStudio.url` 设置为它已经运行的 URL，首页会在「墨笺·宓语」中嵌入原应用；`mode` 设为 `external` 可改为独立打开。既有项目需允许 iframe 嵌入；不允许时使用独立打开入口。适配器仅接受 HTTP/HTTPS URL。

如果原项目是 Python/Tk 或其他原生桌面程序，在 `writingStudio.entryPath` 中填入原 `.py/.pyw/.exe` 入口，Python 程序同时指定 `pythonExecutable`。桌面壳层提供「打开墨笺·宓语」按钮，按原启动方式打开它，不修改原文件或功能逻辑。原项目暂未提供，因此迁移仍待其实际路径确认。本次不生成替代写作功能。

## 动画和操作

- 0.0–0.38s：纸面与外围花枝苏醒。
- 0.30–2.08s：沿真实轮廓按弧长落笔，长发与外轮廓先行，眉眼、细发、衣袖随后；这一步只有线稿。
- 2.15–2.52s：线稿完成后填上原画的墨色与明暗，停顿至 2.74s。
- 2.74–4.55s：左右四对翼片逐排展开，每对落定后再展开下一对。
- 4.65–5.30s：完整中央外框出现，两张卡片的内容依次落定。
- 5.40–6.2s：搜索、欢迎语、书卷与对话框收尾，进入轻微呼吸和低频自然眨眼。

出场按同一比例加速，实际播放约 6.2 秒；底层笔画场保留原始 11,300 刻度，确保绘制、遮罩、翼片、文案和字幕保持同步。眨眼、讲话和日常微动效使用独立时钟。

点击首页、按 Esc、首次按 Tab 或点击「跳过动画」，直接进入完整稳定界面。底部「重绘此刻」可重播；「静止画卷」关闭闲置动效。系统减少动态效果模式使用约 0.65 秒淡入，关闭逐线描绘、展开、呼吸和跟随。

搜索支持模块中英文名与关键词，Ctrl/Cmd+K 聚焦、方向键选择、Enter 打开、Esc 关闭。头像与设置允许保存称呼、动效和出场偏好；日期与问候使用 America/Toronto 时区。

点击宓或她的对话框，会显示一句本地预设台词，配合小幅口型与轻微点头。首次点击为「你是来学习的，不是来戳我的。」连续戳她，会切换为「还在戳？作业写完了？」等提醒；快速点击有 1.8 秒冷却，不堆积讲话。讲话在标点处合嘴停顿，结束后恢复原画嘴部，不影响鼻子、手和眨眼。

宓的人设固定为冷淡、克制的学姐：简短直接、围绕学习、不撒娇、不暧昧、不羞辱用户。全部 23 句台词随软件保存，无联网、模型生成或账号依赖。此版本为文字对话与讲话动画，不播放语音。首页每隔约 60–120 秒随机提醒一次；搜索、输入、打开模块、窗口失焦或隐藏时暂停，回到首页重新计时。设置中的「让学姐偶尔提醒我」可关闭主动发言，手动点击回应仍保留。静止画卷或系统减少动态效果时，直接显示完整台词，不播放口型和逐字显示。

这是 **伪 Live2D**，不是 Cubism 模型。呼吸与偏转通过连续的像素坐标采样完成，闭眼使用与原画对齐的局部绘制素材；没有虚构可独立摆动的隐藏发丝。扁平 PNG 不能产生真实的原生 4K 细节，提供的 4K 位图包含放大内容。

装饰与角色使用同一坐标系的连续墨线画布，移除烘焙文案后叠加真实 DOM 控件。数值归属场让每个像素只属于一个出场分组，中央外框作为完整单元出现。角色先沿轮廓绘制独立线稿，再填原画明暗；过渡阶段以墨迹叠加，避免带纸纹的矩形拼接。所有功能标签、搜索、日期、用户名、按钮和弹窗仍为真实 DOM。此前资源包的 SVG 图像导出仍含栅格采样；笔画 JSON 是动画几何轨迹。

## 验证

```powershell
npm run check
npm run test:ui
npm run test:companion
.\.desktop-env\Scripts\python.exe app.py --smoke-test
.\.desktop-env\Scripts\python.exe app.py --animation-test
.\.desktop-env\Scripts\python.exe app.py --companion-test
```

UI 检查使用 Playwright 与本机 Edge/Chrome；Codex 工作区会使用已提供的运行环境，其他环境可安装 Playwright 并设置 `STUDYOS_BROWSER_PATH`。验证包含 10 个入口、搜索和空结果、键盘关闭、设置持久化、通知、1280 桌面、390 小屏、减少动态效果与资源加载。原生 smoke test 实际打开 Windows WebView2 软件窗口、验证 Python 桥与 10 个入口，完成后自动关闭。截图和报告写入 `artifacts/`。

美术导出运行 `node scripts/export-art-layers.mjs`，生成补充独立 SVG、实际坐标 manifest 与资源说明。

`--animation-test` 在软件自身 WebView2 窗口中保存 20 个出场中间帧、3 个眼部状态，检查真实 GPU 像素中外框无提前漏出、整框完整、笔画沿轮廓推进以及先线稿后填墨，同时验证重播、跳过与减少动态效果，并记录真实播放帧间隔。数值字段与几何 JSON 已随源码和 EXE 提供，软件运行不需要 OpenCV 或 NumPy。

`test:companion` 用可控时钟检查标点停顿、点击冷却、随机台词无重复、关闭提醒和暂停时无残留计时器。`--companion-test` 在原生窗口保存嘴部闭合、半开、全开及放大截图，检查恢复原画、局部口型、实际讲话节奏、打开模块和搜索时停止，以及静止模式的完整文字回应。
