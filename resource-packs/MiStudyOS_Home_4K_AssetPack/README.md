# MiStudyOS Home 4K Asset Pack

Source: `宓语 StudyOS：雅致国风学习仪表盘(2).png`  
Source size: 1672×941  
Design target: 3840×2160

This package contains extracted visible non-character UI/decor assets from the supplied homepage reference.

Important:
- The source image is flattened, so exact recovery of pixels hidden behind the character is impossible.
- `*_reference.png` keeps the visible reference content.
- `*_frame.png` removes the central content region so text/icons can be rendered independently in code.
- Dynamic text (Good Morning, date, term, search text, user name, course data) should be code-rendered.
- Character assets are intentionally excluded from this package.

See:
- `13_docs/宓语StudyOS_首页出场动画_秒级分镜表.md`
- `13_docs/宓语StudyOS_素材包目录_命名规范_manifest示例.md`
- `12_manifest/manifest.json`
- `12_manifest/home_intro_timeline.json`
