// One continuous source: inverse sampling keeps every hair and vine connected.
// Intro and idle use the same GPU pass, without per-frame canvas composition.
import { INTRO as I } from './intro-timeline.js';
export function createSceneRenderer(stage,artwork,character,timing,ownership){
  const surface=Object.assign(document.createElement('canvas'),{width:1672,height:941,className:'scene-mesh'});
  surface.setAttribute('aria-hidden','true');stage.prepend(surface);
  const gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:false,depth:false,stencil:false});
  if(!gl){surface.remove();return null;}
  try{
    const shader=(type,source)=>{
      const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;
    };
    const program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}'));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`
      precision highp float;
      varying vec2 uv;
      uniform sampler2D baseArt,eyelids,inkTimes,regionOwners;
      uniform float time,fade,life,breath,tilt,nod,hair,mouth;
      uniform vec2 gaze;
      uniform vec4 eyeBounds;
      uniform float wings[8];
      float phase(float start,float duration){return smoothstep(start,start+duration,time);}
      vec2 textureUV(vec2 p){return vec2(p.x/1672.,1.-p.y/941.);}
      void main(){
        vec2 p=vec2(uv.x*1672.,(1.-uv.y)*941.);
        vec2 source=p;
        float alpha=1.;
        vec4 semantic=texture2D(regionOwners,uv);
        float owner=floor(semantic.r*255.+.5);
        float coverage=semantic.g;
        float characterInk=0.;
        float characterFill=1.;
        if(time<${I.duration}. && fade<0.){
          // Ownership is exclusive. A petal can never reveal pixels assigned
          // to the central enclosure, even where flowers and hair overlap.
          alpha=0.;
          if(owner==15.)alpha=phase(${I.border.start}.,${I.border.duration}.);
          if(owner==14.)alpha=phase(${I.completeArt.start}.,${I.completeArt.duration}.);
          if(owner==13.)alpha=phase(${I.bottom.start}.,${I.bottom.duration}.);
          if(owner==12.)alpha=phase(${I.bubble.start}.,${I.bubble.duration}.);
          if(owner==10.)alpha=phase(${I.daily.start}.,${I.daily.duration}.);
          if(owner==11.)alpha=phase(${I.grades.start}.,${I.grades.duration}.);
          if(owner==1.){
            vec4 ink=texture2D(inkTimes,uv);
            float arrival=ink.r*4096.;
            characterInk=smoothstep(arrival,arrival+48.,time)*ink.b;
            characterFill=phase(${I.character.finish}.,${I.character.finishDuration}.);
            alpha=coverage;
          }
          vec2 wingShift=vec2(0.);float totalWeight=0.;
          for(int i=0;i<8;i++){
            float row=floor(float(i)/2.);float side=mod(float(i),2.)<.5?-1.:1.;
            float y=310.+row*147.;float root=side<0.?574.:1118.;
            float outward=(p.x-root)*side;
            float start=${I.wings.start}.+row*${I.wings.stagger}.;
            float region=1.-step(.5,abs(owner-(2.+float(i))));
            float grow=phase(start,${I.wings.duration}.);
            float curve=outward+abs(p.y-y)*.65+24.*sin((p.y-y)/80.);
            float reveal=1.-smoothstep(grow*730.-85.,grow*730.+35.,curve);
            alpha=max(alpha,region*reveal*smoothstep(0.,.12,grow));
            float edge=side<0.?smoothstep(67.,111.,p.x):1.-smoothstep(1577.,1620.,p.x);
            float w=region*smoothstep(-8.,155.,outward)*edge*smoothstep(0.,.08,grow);
            vec2 v=p-vec2(root,y+35.);
            float a=wings[i];float c=cos(a),s=sin(a);
            vec2 rotated=vec2(c*v.x+s*v.y,-s*v.x+c*v.y);
            wingShift+=(rotated-v)*w;totalWeight+=w;
          }
          source+=wingShift/max(1.,totalWeight);
        }else if(fade>=0.)alpha=fade;
        if(life>0.){
          vec2 q=(p-vec2(839.,316.))/vec2(253.,254.);
          float body=exp(-dot(q,q))*(1.-smoothstep(535.,607.,p.y));
          vec2 v=p-vec2(854.,348.);
          vec2 headQ=(p-vec2(842.,234.))/vec2(171.,188.);
          float head=exp(-dot(headQ,headQ));
          vec2 turn=vec2(-v.y,v.x)*tilt*head;
          vec2 drift=vec2(gaze.x*3.8,gaze.y*1.1+breath*1.25+nod*3.7)*body;
          vec2 faceQ=(p-vec2(838.,249.))/vec2(96.,102.);
          float strands=body*(1.-exp(-dot(faceQ,faceQ)));
          source-=life*(turn+drift+vec2(hair*1.1,breath*.35)*strands);
        }
        vec4 art=texture2D(baseArt,textureUV(source));
        vec2 eyeUV=(source-eyeBounds.xy)/eyeBounds.zw;
        if(eyeUV.x>0. && eyeUV.y>0. && eyeUV.x<1. && eyeUV.y<1.){
          vec4 eye=texture2D(eyelids,vec2(eyeUV.x,1.-eyeUV.y));
          art=eye+art*(1.-eye.a);
        }
        if(mouth>0.){
          // Lips share the original face coordinates and its continuous warp.
          // Recover only the tiny lip area from adjacent skin; closed speech
          // samples the untouched original art, with no persistent face patch.
          vec2 tangent=vec2(.862,-.507),normal=vec2(.507,.862);
          vec2 lipDelta=source-vec2(876.5,281.5);
          vec2 lip=vec2(dot(lipDelta,tangent),dot(lipDelta,normal));
          float area=1.-smoothstep(.80,1.15,length(lip/vec2(11.5,6.)));
          float opened=smoothstep(0.,.18,mouth);
          vec4 skin=texture2D(baseArt,textureUV(source-normal*8.));
          art=mix(art,skin,area*opened);
          float opening=length(vec2(lip.x/(8.1+mouth*.5),lip.y/(.6+mouth*1.7)));
          float lipInk=(1.-smoothstep(.82,1.12,opening))*opened*.86;
          art.rgb=mix(art.rgb,vec3(.23)*art.a,lipInk);
        }
        // During staging, composite ink rather than opaque paper patches.
        // This keeps independent contours free of rectangular crop backgrounds.
        vec3 straightArt=art.a>.001?art.rgb/art.a:vec3(1.);
        float lightest=max(straightArt.r,max(straightArt.g,straightArt.b));
        float inkOpacity=max(0.,1.-lightest/.977)*(1.-smoothstep(.80,.95,lightest));
        vec4 inkArt=vec4(0.,0.,0.,inkOpacity)*art.a;
        if(owner==1. && time<${I.duration}. && fade<0.){
          // The first pass contains lines only. Shaded ribbons, hair and cloth
          // fill after every contour has finished; there is no vertical wipe.
          float darkness=1.-smoothstep(.70,.98,dot(straightArt,vec3(.299,.587,.114)));
          vec4 pencil=vec4(vec3(.22),1.)*(characterInk*darkness*coverage*.68);
          gl_FragColor=mix(pencil,inkArt*coverage,characterFill);
        }else if(time<${I.duration}. && fade<0.){
          gl_FragColor=mix(inkArt*clamp(alpha,0.,1.),art,phase(${I.completeArt.start}.,${I.completeArt.duration}.));
        }else gl_FragColor=art*clamp(alpha,0.,1.);
      }
    `));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    function texture(unit,source,name,raw=false,nearest=false){
      gl.activeTexture(gl.TEXTURE0+unit);const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,nearest?gl.NEAREST:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,nearest?gl.NEAREST:gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      if(raw){
        // Use an explicit row order for the numerical field on every driver.
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
        const flipped=new Uint8Array(source.length),stride=836*4;
        for(let y=0;y<471;y++)flipped.set(source.subarray(y*stride,(y+1)*stride),(470-y)*stride);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,836,471,0,gl.RGBA,gl.UNSIGNED_BYTE,flipped);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      }else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      gl.uniform1i(gl.getUniformLocation(program,name),unit);return t;
    }
    texture(0,artwork,'baseArt');const eyes=texture(1,character.canvas,'eyelids');
    texture(2,timing,'inkTimes',true);texture(3,ownership,'regionOwners',true,true);
    const uniforms=Object.fromEntries(['time','fade','life','breath','tilt','nod','hair','mouth','gaze','eyeBounds','wings[0]'].map(n=>[n,gl.getUniformLocation(program,n)]));
    gl.uniform4fv(uniforms.eyeBounds,character.bounds);stage.classList.add('mesh-active');
    const renderer={
      available:true,
      render(values){
        for(const name of ['time','fade','life','breath','tilt','nod','hair','mouth'])gl.uniform1f(uniforms[name],values[name]??0);
        gl.uniform2fv(uniforms.gaze,values.gaze||[0,0]);gl.uniform1fv(uniforms['wings[0]'],values.wings||new Float32Array(8));
        gl.drawArrays(gl.TRIANGLES,0,6);
      },
      updateEyes(){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,eyes);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,character.canvas);},
      inspectPixels(points){return points.map(([x,y])=>{const pixel=new Uint8Array(4);gl.readPixels(x,940-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return [...pixel];});},
      dispose(){renderer.available=false;stage.classList.remove('mesh-active');surface.remove();},
      surface
    };
    surface.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.dispose();stage.dispatchEvent(new Event('scenecontextlost'));});
    return renderer;
  }catch(error){console.warn('StudyOS renderer uses a static fallback:',error.message);surface.remove();return null;}
}
