# 一键复制给 ChatGPT / Codex 的完整实施提示词

你是一名高级桌面 UI 工程师 + 视觉交互设计师。请读取我提供的“拟人打字 V0.37”原项目源代码，以及资源包 `NirenTyping_V037_4K_Art_Kit.zip`。`00_reference/legacy_ui_v037.png` 是原始功能布局（图1）；`00_reference/target_design_v037.png` 是目标美术风格和扇形排版（图2）。任务是把图1 **所有信息、输入框、按钮、标签页、快捷键和业务状态** 不删减地改造为图2的精细黑白二次元纯线稿 UI，优先保留图2人物的长发、花饰、伏案执笔的风格，并且**设计具有真实角色-UI 联动的扇形结构**，而不是在旧布局上贴一层背景。

**不可更改业务规则：**保留 PGDN 拟人输入、PGUP 按键替换、读取剪贴板、打开 GitHub、四个现有 Tab、Essay 文本输入及分析后锁定、离线规则/可选 AI API、修改深度 standard、快速演示、HTTPS URL/Model/API Key、分析并生成四轮计划、F8 开始、终止且保留进度、保存/自动恢复/导入进度、导出 TXT、DOCX 和 Google Docs 富文本导入/导出/复制/核验及 JSON 核验报告。特别保留运行状态三项、当前 0/0 和“本功能只操作内置写作区，不控制 Word/浏览器的外部光标”提示；绝不把 API 密钥写入进度或日志，也不要改原有外部调用方式。

**美术素材使用规则：**
(1) 解压后阅读 `README_先看我.md`、`08_docs/01_迁移排版与功能映射.md` 和 `08_docs/03_asset_manifest.json`，使用现有文件路径，不能凭空假设素材存在。
(2) 独立角色：`01_character/character_transparent_4k.png` 作为左侧主视觉；可用 `character_hair_overlay_softcrop_4k.png` 制作发丝轻动。右下书卷樱花沙漏：`02_ornaments/books_sakura_scroll_hourglass_full_4k.png`，需要局部层时用 `02_ornaments/` 下的分区透明 PNG。它们是透明 art layers，`pointer-events:none`，不应遮挡用户操作。
(3) 顶部三瓣交互折扇：`03_fan_svg/fan_triptych_v037.svg` 是独立纯线稿轮廓。覆盖三个**真实透明 button**，其可点击范围与三瓣 path 一致；三瓣分别是 PGDN、PGUP、读取剪贴板；独立 `fan_petals_hover_left/center/right.svg` 可作为 hover/active 层，图标用 `06_icons_svg/`；文字由真实 HTML/Text 组件绘制，不允许绘制在静态图片中。
(4) 发丝/UI 连接 `03_fan_svg/character_ui_connector_hairlines.svg`；顶部状态用 `fan_circular_status.svg`，GitHub 用 `fan_flower_button.svg`。右侧四个纸笺 Tab 使用 `04_panels_svg/tab_sheet_4.svg`。主编辑器使用 `main_essay_parchment_frame.svg`；设置双区 `settings_dual_frame.svg`；下方 `workflow_buttons_tray.svg` 和 `doc_compatibility_tray.svg`。花枝、飘带、蝴蝶、吊坠可从 `05_decoration_svg/` 适量点缀，避免喧宾夺主。所有图标均从 `06_icons_svg/` 引用，不用截图中的带字按钮。
(5) 所有 SVG 均为 editable/vector 无限清晰，`07_4k_png_exports` 是最长边 4096px 的 RGBA 透明预渲染，优先 SVG。角色、书卷 4K 是已有独立插画的重采样版本，不要假装是从压扁截图中无损还原的原始图层。

**全新排版（基准 1672×941，自适应实现）：**左侧 34% 角色与书卷占位，右侧 66% 可操作工作区；标题和标语简洁留白；从人物的笔尖/发丝延伸弧线指向页面上方三瓣折扇（不能仍然使用从左到右三块普通矩形按钮）。扇形下右侧圆形悬挂状态章、独立 GitHub 花扣；其下四纸笺 Tab。中央大面积单独可滚动 Essay 真实编辑框；其下左右并列的规则设置/API 设置。底部第一层为完整流程按钮托盘，第二层为 DOCX/Google Docs 文档兼容按钮托盘。保留全部字段文本，但结构改为扇形—纸笺—分栏—装饰托盘的视觉节奏。不要把产品海报当页面背景，也不要把艺术字贴到真实输入框上。

**美术约束：**完全白底 + 黑灰极细线稿，黑白漫画钢笔/手绘樱花线稿，不上色、不做灰底大面板、不做彩色渐变、不做炫光玻璃拟态。人物气质、五官、长发线条、花头饰参考图2；不要更换成现代扁平 Q 版。扇面要有细双描边、扇骨放射结构、花结、极细吊坠；人物线稿与扇面共享几根流线，从角色延入交互区域但不妨碍阅读。按钮使用图形外轮廓作视觉蒙版，内部真实按钮仍需有 keyboard focus ring、disabled/hover/active 状态。运行中的状态变化可触发 2–4px 发丝和吊坠的低频联动（prefers-reduced-motion 时关闭）。

**工程要求：**先检查原程序基于 Tkinter/PySide/PyQt/web 或其他框架；按框架实现（若原工程为 Tkinter，不能直接声称 CSS/SVG 可原生工作，需选用适当渲染层/预渲染 PNG，保持原事件函数绑定）。先输出旧控件 ID → 新控件 ID → 绑定原方法映射表，再修改代码；不要只写静态 mockup。不要更改快捷键、剪贴板监控、进度持久化、Word/Google Docs 导出导入和校验算法。实际测试所有按钮、tab 切换、粘贴、编辑锁定、AI 表单、恢复、导出、键盘快捷键、125%/150% DPI、窗口缩放。最终给出修改后**完整可运行工程**、修改清单、验证结果和截图。如果我还没有提供工程代码，请先告诉我上传项目 ZIP/仓库，不要凭截图猜原始业务逻辑。

请开始读取资源包中的 README 和映射文档，再逐个核对原项目现有功能，按以上布局实施。
