// Continuous inverse sampling moves the ink by fractions of a pixel. Unlike
// moving a cutout, every output pixel has a source and hair cannot expose holes.
export function createAmbientMesh(stage, artwork, eyes) {
  const surface=document.createElement('canvas');
  surface.width=1672;surface.height=941;surface.className='scene-mesh';
  surface.setAttribute('aria-hidden','true');stage.prepend(surface);
  const gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true});
  const fallback={available:false,setActive(){},updateEyes(){},look(){},freeze(){}};
  if(!gl){surface.remove();return fallback;}
  let available=true,active=false,frozen=false,raf=0,gazeX=0,gazeY=0,targetX=0,targetY=0,epoch=performance.now();
  try {
    const shader=(type,source)=>{
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Ambient shader unavailable');
      return shader;
    };
    const program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position; varying vec2 uv; void main(){ uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }'));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`
      precision highp float;
      varying vec2 uv;
      uniform sampler2D baseArt;
      uniform sampler2D eyelids;
      uniform vec2 gaze;
      uniform float breath;
      void main(){
        vec2 p=vec2(uv.x*1672.,(1.-uv.y)*941.);
        vec2 q=(p-vec2(839.,321.))/vec2(252.,244.);
        float weight=exp(-dot(q,q))*(1.-smoothstep(542.,605.,p.y));
        vec2 shift=vec2(gaze.x*.55,(gaze.y*.18+breath*.38))*weight;
        vec2 sampleUV=uv+vec2(-shift.x/1672.,shift.y/941.);
        vec4 art=texture2D(baseArt,sampleUV);
        vec4 eye=texture2D(eyelids,sampleUV);
        gl_FragColor=eye+art*(1.-eye.a);
      }
    `));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Ambient program unavailable');
    gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');
    gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    function texture(unit,source,name){
      gl.activeTexture(gl.TEXTURE0+unit);const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      gl.uniform1i(gl.getUniformLocation(program,name),unit);return texture;
    }
    texture(0,artwork,'baseArt');const eyeTexture=texture(1,eyes,'eyelids');
    const gaze=gl.getUniformLocation(program,'gaze'),breath=gl.getUniformLocation(program,'breath');
    function render(now=performance.now()){
      if(!available)return;
      gazeX+=(targetX-gazeX)*.045;gazeY+=(targetY-gazeY)*.045;
      gl.uniform2f(gaze,frozen?0:gazeX,frozen?0:gazeY);
      gl.uniform1f(breath,frozen?0:Math.sin((now-epoch)/5600*Math.PI*2));
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    function loop(now){if(!active||frozen||document.hidden)return;render(now);raf=requestAnimationFrame(loop);}
    function setActive(value){
      cancelAnimationFrame(raf);active=!!value&&available;frozen=false;
      stage.classList.toggle('mesh-active',active);
      if(active){epoch=performance.now();render(epoch);raf=requestAnimationFrame(loop);}
    }
    surface.addEventListener('webglcontextlost',event=>{event.preventDefault();available=false;setActive(false);});
    return {
      get available(){return available;},
      setActive,
      updateEyes(){
        if(!available)return;
        gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,eyeTexture);
        gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,eyes);if(active)render();
      },
      look(x,y){targetX=x;targetY=y;},
      freeze(){frozen=true;cancelAnimationFrame(raf);gazeX=gazeY=targetX=targetY=0;render(epoch);}
    };
  }catch{surface.remove();return fallback;}
}
