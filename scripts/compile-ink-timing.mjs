// Compile vector paths into numerical brush-arrival times; source art is intact.
import { readFile, writeFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const paths=JSON.parse(await readFile(new URL('src/data/mi-ink-strokes.json',root),'utf8'));
const width=836,height=471,radius=.9;
const times=new Uint16Array(width*height).fill(65535);
const coverage=new Uint8Array(width*height);
for(const stroke of paths){
  const points=[...stroke.d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(m=>[Number(m[1])/2,Number(m[2])/2]);
  let distance=0;
  for(let i=1;i<points.length;i++){
    const [ax,ay]=points[i-1],[bx,by]=points[i],dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy);
    const x0=Math.max(0,Math.floor(Math.min(ax,bx)-radius)),x1=Math.min(width-1,Math.ceil(Math.max(ax,bx)+radius));
    const y0=Math.max(0,Math.floor(Math.min(ay,by)-radius)),y1=Math.min(height-1,Math.ceil(Math.max(ay,by)+radius));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const u=len?Math.max(0,Math.min(1,((x+.5-ax)*dx+(y+.5-ay)*dy)/(len*len))):0;
      const edge=Math.hypot(x+.5-ax-u*dx,y+.5-ay-u*dy);
      if(edge>radius)continue;
      const t=Math.round(stroke.start+stroke.duration*(distance+u*len)/(stroke.length/2));
      const index=y*width+x;
      if(t<times[index])times[index]=t;
      coverage[index]=Math.max(coverage[index],Math.round(255*Math.min(1,(radius-edge)/.6)));
    }
    distance+=len;
  }
}
const bytes=new Uint8Array(width*height*4);
// 16 ms temporal precision is finer than a displayed frame. Normalized times
// can be linearly filtered, avoiding square half-resolution brush boundaries.
for(let i=0;i<times.length;i++){bytes[i*4]=Math.min(255,Math.round(times[i]/4096*255));bytes[i*4+2]=coverage[i];bytes[i*4+3]=255;}
await writeFile(new URL('src/data/mi-ink-timing.bin',root),bytes);
console.log(`Compiled ${paths.length} contours, ${width} × ${height} timing field.`);
