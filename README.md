# 宓语 StudyOS

这是 Windows 桌面软件。第一版为首页 UI、分层美术、约 6.8 秒出场动画和模块入口壳层。尚未接入课程、成绩、Outlook 或新业务功能。

## 启动桌面软件

双击根目录的 `启动宓语StudyOS.cmd`，或打包后直接打开 `dist/MiStudyOS/MiStudyOS.exe`。应用使用 Python + 原生 Windows 窗口 + 内嵌 WebView2，保留原生标题栏、最小化、最大化和关闭。软件运行不需要浏览器或 Node.js。

源码启动与打包：

```powershell
.\setup-desktop.ps1
.\.desktop-env\Scripts\python.exe app.py
.\build-desktop.ps1
```

Python 依赖为 pywebview 与 PyInstaller；Windows 需有 Microsoft WebView2 Runtime。本机已有该运行时。项目原 `.venv` 指向已失效的 Python 3.13 安装位置，因此新建隔离的 `.desktop-env`，不修改旧环境。

`app.py` 在应用进程内部提供素材服务，使用动态本机端口，关闭软件时一并退出。设置写入应用目录下 `.studyos-data`，独立于浏览器配置。

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
- `src/scene.js`：连续原画墨线、真实笔画轨迹、柔和翼片展开和统一动画时钟。
- `src/character.js`：对齐原画的闭眼素材、局部软遮罩和眨眼时序。
- `src/mesh.js`：连续采样的轻微呼吸与鼠标偏转，GPU 不可用时保留静态原画和眨眼。
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

- 0.0–0.7s：纸面、远景、花枝苏醒。
- 0.7–3.15s：淡铅笔底稿、沿原画提取的 1284 条笔画描绘、墨色补全。
- 0.45–2.65s：标题、搜索、欢迎语分级浮现。
- 3.1–4.8s：左右四组翼片依次柔和舒展，花枝与图标完整出现，文字和箭头随后淡入。
- 4.55–5.42s：今日学习总览与成绩卡片落定。
- 5.2–6.8s：书卷与完整对话框收尾，进入轻微呼吸和低频自然眨眼。

点击首页、按 Esc、首次按 Tab 或点击「跳过动画」，直接进入完整稳定界面。底部「重绘此刻」可重播；「静止画卷」关闭闲置动效。系统减少动态效果模式使用约 0.85 秒淡入，关闭逐线描绘、展开、呼吸和跟随。

搜索支持模块中英文名与关键词，Ctrl/Cmd+K 聚焦、方向键选择、Enter 打开、Esc 关闭。头像与设置允许保存称呼、动效和出场偏好；日期与问候使用 America/Toronto 时区。

这是 **伪 Live2D**，不是 Cubism 模型。呼吸与偏转通过连续的像素坐标采样完成，闭眼使用与原画对齐的局部绘制素材；没有虚构可独立摆动的隐藏发丝。扁平 PNG 不能产生真实的原生 4K 细节，提供的 4K 位图包含放大内容。

为贴近参考图并避免碎片拼接的缝隙，装饰与角色使用同一坐标系的连续墨线画布，移除烘焙文案后叠加真实 DOM 控件。出场采用软遮罩与从原画分析提取的线条路径，完成后确保每个原画像素都能完整显示。所有功能标签、搜索、日期、用户名、按钮和弹窗仍为真实 DOM。此前资源包的 SVG 图像导出仍含栅格采样；新增的笔画 JSON 是用于动画的几何轨迹。

## 验证

```powershell
npm run check
npm run test:ui
.\.desktop-env\Scripts\python.exe app.py --smoke-test
.\.desktop-env\Scripts\python.exe app.py --animation-test
```

UI 检查使用 Playwright 与本机 Edge/Chrome；Codex 工作区会使用已提供的运行环境，其他环境可安装 Playwright 并设置 `STUDYOS_BROWSER_PATH`。验证包含 10 个入口、搜索和空结果、键盘关闭、设置持久化、通知、1280 桌面、390 小屏、减少动态效果与资源加载。原生 smoke test 实际打开 Windows WebView2 软件窗口、验证 Python 桥与 10 个入口，完成后自动关闭。截图和报告写入 `artifacts/`。

美术导出运行 `node scripts/export-art-layers.mjs`，生成补充独立 SVG、实际坐标 manifest 与资源说明。

`--animation-test` 在软件自身 WebView2 窗口中保存 13 个出场中间帧、3 个眼部状态，检查重播/跳过后残留状态与减少动态效果，并记录真实播放帧间隔。`scripts/analyze-art.py` 为可选开发工具，需要 OpenCV 与 NumPy；导出的几何 JSON 已随源码和 EXE 提供，运行软件不依赖它们。
