import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { modules } from '../src/modules.js';
const pack = 'resource-packs/MiStudyOS_Home_4K_AssetPack';
mkdirSync(`${pack}/14_runtime_svg`, {recursive:true});
mkdirSync(`${pack}/15_reusable_decor`, {recursive:true});
const layers = [];
function exportLayer(id, rect, holes = [], category = 'frame', animation = 'stagger reveal') {
  const [x,y,w,h] = rect;
  const filename = `14_runtime_svg/${id}.svg`;
  const cutouts = holes.map(([hx,hy,hw,hh])=>`<rect x="${hx-5}" y="${hy-5}" width="${hw+10}" height="${hh+10}" rx="8" fill="black" filter="url(#soft)"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="4096" height="${Math.round(4096*h/w)}"><title>${id}</title><desc>Independent masked raster art layer, sampled from the supplied flattened reference; not redrawn vector paths.</desc><defs><filter id="soft" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="3"/></filter><mask id="cut" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white"/>${cutouts}</mask></defs><image href="../00_reference/home_reference_1672x941.png" x="0" y="0" width="1672" height="941" preserveAspectRatio="none" mask="url(#cut)"/></svg>`;
  writeFileSync(`${pack}/${filename}`,svg);
  layers.push({id, file:filename, category, source_bbox_px:[x,y,x+w,y+h], recommended_position:[x/1672,y/941,w/1672,h/941], design_rect_3840x2160:[Math.round(x*3840/1672),Math.round(y*2160/941),Math.round(w*3840/1672),Math.round(h*2160/941)], z_index:category==='icon'?16:15, animation_hint:animation, safe_area:[0,0,w,h], notes:'Reference-based raster image in an SVG mask; preserve the neighboring 00_reference directory. Code-rendered labels are separate.'});
}
for (const module of modules) {
  exportLayer(`${module.id}_frame`,module.rect,[module.clear,...(module.id==='writing'?[[985,136,334,151]]:[])],'frame',module.side?'grow from wing root, then settle 2px':'fade up 6px');
  exportLayer(`${module.id}_icon`,module.icon,[],'icon','fade 130ms after frame; hover scale 1.02');
}
exportLayer('dialog_frame',[985,136,334,151],[[1044,186,234,49]],'dialog','border reveal, then DOM text');
exportLayer('avatar_reference',[1450,23,69,69],[],'avatar','fade; hover 1px');
exportLayer('top_left_branches',[0,0,655,213],[[66,56,440,83],[75,140,394,24],[77,176,320,23]],'decor','scenery fade');
exportLayer('bottom_left_books',[0,769,551,172],[],'foreground','settle after core cards');
exportLayer('bottom_right_fan',[1130,778,542,163],[],'foreground','settle after core cards');
const reusable = ['sakura_flower','sakura_branch_horizontal','hanging_tassel','hanging_flower_charm','butterfly_lineart','corner_flower_vine','corner_scroll_leaf','decorative_ribbon_swirl','mountain_ink_outline','pagoda_lineart','wind_swirls','floating_feather'];
for (const name of reusable) {
  copyFileSync(`assets/lineart/05_decoration_svg/${name}.svg`,`${pack}/15_reusable_decor/${name}.svg`);
  layers.push({id:`reusable_${name}`,file:`15_reusable_decor/${name}.svg`,category:'reusable_vector',recommended_position:null,z_index:5,animation_hint:name.includes('tassel')?'delayed sway 0.5deg; fixed upper pivot':'local low-frequency motion only',safe_area:null,notes:'Copied unchanged from the existing assets/lineart vector library; suggested supporting artwork, not claimed as extracted hidden pixels.'});
}
const manifest = {package:'MiStudyOS Home — corrected runtime layers',version:'1.1',source_size:[1672,941],design_size:[3840,2160],notes:['The original supplied 4K PNG package and its manifest remain unchanged.','This supplementary manifest uses coordinates verified against the actual reference.','SVG frame/icon wrappers contain raster images and masks; reusable_vector entries are actual existing vector paths.','Visible art can be split; hidden/occluded art and original native 4K details cannot be recovered from flattened pixels.'],assets:layers};
writeFileSync(`${pack}/12_manifest/runtime_manifest.json`,JSON.stringify(manifest,null,2));
writeFileSync(`${pack}/RUNTIME_README.md`, `# 首页运行时资源补充\n\n原始四包保持原文件和目录。\n\n- 14_runtime_svg：按照实际参考坐标导出的十个边框、十个独立图标、对话框、头像和前景；使用 SVG viewBox/mask 采样，不是重新绘制的矢量线稿。保留旁边的 00_reference 文件夹，确保相对图像链接可用。\n- 15_reusable_decor：从原 assets/lineart 原样复制的独立花朵、花枝、流苏、蝴蝶、山水等 SVG，可按需补充局部动画。\n- 12_manifest/runtime_manifest.json：准确位置、分类、建议动画、z-index 与安全范围。\n\n背景/远景 z0–5；角色 z9；翼片边框 z15；图标/文字 z16；中央卡 z20；书卷前景 z22；对话与真实 UI z25–35。所有装饰 pointer-events:none，业务交互由 DOM 按钮承担。\n\n导出尺寸 4096 表示设计尺度或栅格放大，不能把源图放大称为新增真实 4K 细节。原 PNG 带透明通道，但部分装饰区域含参考图纸纹；要求完全清洁、无遮挡的分层 master 时，需要原分层工程或重绘。\n`);
console.log(`Exported ${layers.length} independent supplementary art/decor layers.`);
