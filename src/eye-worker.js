// Decode and register the source on a worker. Only the tiny eye atlas crosses
// back to the UI thread; a multi-megabyte PNG cannot interrupt wing playback.
self.onmessage=async({data:{url,bounds}})=>{
  try{
    const image=await createImageBitmap(await (await fetch(url)).blob());
    const [x,y,w,h]=bounds;
    const patch=new OffscreenCanvas(w,h),p=patch.getContext('2d',{willReadFrequently:true});
    p.setTransform(1.0002822335,-.0002688304,.0002688304,1.0002822335,-.0454719424-x,.2229684623-y);
    p.drawImage(image,0,0,1672,941);p.resetTransform();image.close();
    const mask=new OffscreenCanvas(w,h),m=mask.getContext('2d',{willReadFrequently:true});
    m.filter='blur(2.5px)';m.fillStyle='#fff';
    for(const [cx,cy,rx,ry] of [[806,264,36,16],[894,227,27,19]]){
      m.beginPath();m.ellipse(cx-x,cy-y,rx,ry,-.48,0,Math.PI*2);m.fill();
    }
    p.globalCompositeOperation='destination-in';p.drawImage(mask,0,0);
    const bitmap=patch.transferToImageBitmap();self.postMessage({bitmap},[bitmap]);
  }catch(error){self.postMessage({error:String(error)});}
};
