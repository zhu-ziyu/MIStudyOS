# Mi StudyOS 4K 素材包：目录、命名规范与 manifest 规范

## 1. 目录

```text
MiStudyOS_Home_4K_AssetPack/
├─ 00_reference/
│  ├─ home_reference_1672x941.png
│  └─ home_reference_3840x2160.png
├─ 01_top_decor/
├─ 02_left_wing_panels/
├─ 03_right_wing_panels/
├─ 04_center_cards/
├─ 05_dialog_bubbles/
├─ 06_topbar_shells/
├─ 07_background_decor/
├─ 08_bottom_objects/
├─ 09_icons/
│  ├─ png/
│  └─ svg/
├─ 10_small_decor/
├─ 11_layout_guides/
├─ 12_manifest/
│  ├─ manifest.json
│  └─ home_intro_timeline.json
└─ 13_docs/
```

## 2. 命名规则

推荐统一：

```text
{region}_{group}_{semantic}_{variant}.{ext}
```

例如：

```text
left_panel_01_course_hub_frame.png
right_panel_02_exam_mistake_reference.png
center_daily_dashboard_frame.png
icon_course_book.svg
decor_butterfly_top.png
```

约束：

- 全部小写 snake_case。
- `frame` = 去掉中央文字/动态图标后的装饰框。
- `reference` = 保留参考图原始文字/图标，仅用于像素级还原参考。
- `icon_*` = 可独立 hover / animate 的图标。
- `decor_*` = 花、蝴蝶、流苏、边角装饰。
- 不把动态日期、用户名、搜索词、课程数据烘焙进生产素材。

## 3. 4K 坐标基准

主页设计基准：

```text
3840 × 2160
```

源参考图：

```text
1672 × 941
```

manifest 同时记录：
- `source_bbox_px`
- `normalized_rect`
- `design_rect_3840x2160`

这样前端既可以按固定 4K 坐标还原，也可以按 normalized rect 响应式布局。

## 4. manifest 示例

```json
{
  "id": "left_panel_01_course_hub_frame",
  "type": "panel_frame",
  "file": "02_left_wing_panels/left_panel_01_course_hub_frame.png",
  "source_bbox_px": [85, 208, 475, 366],
  "normalized_rect": [0.050837, 0.221041, 0.233254, 0.167906],
  "design_rect_3840x2160": [195, 478, 896, 363],
  "z_index": 10,
  "animation_hint": "wing reveal; frame first, icon second, text third, arrow last",
  "code_render_text_recommended": false,
  "notes": "Frame/decor layer with inner content cleared for code-rendered text/icons."
}
```

## 5. 生产使用规则

- `*_reference.png`：只作为布局/视觉比对，不建议直接作为按钮背景。
- `*_frame.png`：生产环境优先使用，内部文字和动态图标由代码绘制。
- 图标优先使用 `09_icons/svg/`；若 SVG 路径过复杂，则回退 PNG。
- 动态文本必须由代码输出，避免缩放模糊和后续本地化困难。
- 花枝/流苏/蝴蝶与按钮主体分开做动画，不要把整个按钮作为一张图一起摇。
- 角色本体不在本素材包内；继续复用项目现有角色素材库。

## 6. 源图限制

当前上传的是**扁平化 PNG**，不是 PSD / SVG / 分层工程文件，因此：
- 可见的非角色元素可以高质量提取。
- 被角色身体、头发遮挡的边框/花枝，源图中不存在完整像素，无法“真实拆出”被遮住的部分。
- 如果后续需要完全无遮挡的独立翅片和花枝，应基于本素材包的 reference + frame 重新绘制/生成一套 clean master，而不是假装从扁平图中恢复不存在的像素。
