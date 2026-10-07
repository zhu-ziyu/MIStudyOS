// Native SVG composition keeps every frame, icon, label and hit target independent.
// The supplied reference is sampled only inside each individual art layer.
export const REFERENCE = '/resource-packs/MiStudyOS_Home_4K_AssetPack/00_reference/home_reference_1672x941.png';
export const PACK = '/resource-packs/MiStudyOS_Home_4K_AssetPack/';
let serial = 0;

export function position(element, [x, y, width, height]) {
  Object.assign(element.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
  return element;
}

export function artLayer(rect, { holes = [], className = '', polygon = null, label = null, feather = false } = {}) {
  const [x, y, width, height] = rect;
  const id = `art-mask-${serial++}`;
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  node.setAttribute('preserveAspectRatio', 'none');
  node.setAttribute('aria-hidden', 'true');
  node.classList.add('art-layer');
  for (const name of className.split(' ').filter(Boolean)) node.classList.add(name);
  if (label) node.dataset.layer = label;
  position(node, rect);
  const base = polygon ? `<polygon points="${polygon}" fill="white"/>` : `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white"/>`;
  const cutouts = holes.map(([hx, hy, hw, hh, radius = 8]) => `<rect x="${hx-5}" y="${hy-5}" width="${hw+10}" height="${hh+10}" rx="${radius}" fill="black" filter="url(#${id}-soft)"/>`).join('');
  node.innerHTML = `<defs><filter id="${id}-soft" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="3"/></filter><mask id="${id}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${width}" height="${height}">${base}${cutouts}</mask></defs><image href="${REFERENCE}" x="0" y="0" width="1672" height="941" preserveAspectRatio="none" mask="url(#${id})"/></svg>`;
  if (feather) node.classList.add('feather-edge');
  return node;
}

export function localArt(rect, className = '') {
  const layer = artLayer(rect, { className });
  layer.style.left = '0';
  layer.style.top = '0';
  return layer;
}

export function buildPanel(module) {
  const root = document.createElement('div');
  root.className = `module-group ${module.side ? `wing wing-${module.side}` : 'core-card'} row-${module.row ?? 0}`;
  root.dataset.module = module.id;
  root.style.setProperty('--delay', `${module.side ? 3100 + module.row * 350 + (module.side === 'right' ? 70 : 0) : module.id === 'daily' ? 4550 : 4820}ms`);
  // Decorative frames live in the continuous scene renderer. Only complete
  // icons and accessible controls are independent DOM layers.
  const icon = artLayer(module.icon, { className: 'panel-icon', label: `${module.id}-icon` });
  root.append(icon);
  const button = document.createElement('button');
  button.id = module.id;
  button.className = 'module-button';
  button.dataset.openModule = module.id;
  button.setAttribute('aria-label', `${module.name} / ${module.english}`);
  // Labels and hit targets are real DOM; baked reference labels are masked away.
  position(button, [module.label[0], module.label[1] - 3, module.side ? (module.side === 'left' ? 211 : 217) : 252, 66]);
  button.innerHTML = `<span class="label-cn">${module.name}</span><span class="label-en">${module.english}</span>`;
  root.append(button);
  const arrow = document.createElement('button');
  arrow.className = 'panel-arrow';
  arrow.dataset.openModule = module.id;
  arrow.setAttribute('aria-label', `进入${module.name}`);
  arrow.tabIndex = -1;
  position(arrow, module.arrow);
  arrow.innerHTML = '<svg viewBox="0 0 38 38" aria-hidden="true"><circle cx="19" cy="19" r="16.3"/><circle class="arrow-inner" cx="19" cy="19" r="13.6"/><path d="m17 13 6 6-6 6"/></svg>';
  root.append(arrow);
  const hit = document.createElement('button');
  hit.className = 'panel-hit';
  hit.dataset.openModule = module.id;
  hit.tabIndex = -1;
  hit.setAttribute('aria-label', `打开${module.name}`);
  const [x,y,w,h] = module.rect;
  position(hit, [x + 39, y + 32, w - 83, h - 76]);
  root.prepend(hit);
  return root;
}
