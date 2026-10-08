// One continuous source: inverse sampling keeps every hair and vine connected.
// Intro and idle use the same GPU pass, without per-frame canvas composition.
import { INTRO as I } from './intro-timeline.js';
export function createSceneRenderer(stage,artwork,character,timing,silhouette){
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
      uniform sampler2D baseArt,eyelids,inkTimes,characterField;
      uniform float time,fade,life,breath,tilt,nod,hair;
      uniform vec2 gaze;
      uniform vec4 eyeBounds;
      uniform float wings[8];
      float phase(float start,float duration){return smoothstep(start,start+duration,time);}
      float box(vec2 p,vec4 r,float feather){
        vec2 d=max(r.xy-p,p-r.xy-r.zw);
        return 1.-smoothstep(-feather,feather,max(d.x,d.y));
      }
      vec2 textureUV(vec2 p){return vec2(p.x/1672.,1.-p.y/941.);}
      void main(){
        vec2 p=vec2(uv.x*1672.,(1.-uv.y)*941.);
        vec2 source=p;
        float alpha=1.;
        if(time<${I.duration}. && fade<0.){
          float scenery=max(max(box(p,vec4(-20.,-20.,615.,235.),12.),box(p,vec4(-20.,190.,91.,640.),12.)),max(box(p,vec4(1610.,-20.,82.,850.),12.),box(p,vec4(580.,-20.,1140.,46.),12.)));
          float body=texture2D(characterField,uv).a;
          vec4 ink=texture2D(inkTimes,uv);
          float arrival=ink.r*3200.;
          float drawn=smoothstep(arrival,arrival+95.,time);
          float guide=.14*phase(${I.character.start}.,760.);
          // Fine real contours lead a connected ink finish from crown to
          // sleeves. Partial ink stays soft instead of exposing mottled blocks.
          float inkFront=clamp((time-${I.character.start}.)/${I.character.duration}.,0.,1.)*800.-60.;
          float inkDistance=p.y+abs(p.x-835.)*.19+14.*sin(p.x/130.);
          float finish=1.-smoothstep(inkFront-45.,inkFront+75.,inkDistance);
          float pencil=max(guide,drawn*ink.b*.35);
          alpha=max(scenery*phase(${I.border.start}.,${I.border.duration}.),body*max(guide+(.86*phase(${I.character.finish}.,${I.character.finishDuration}.)),max(finish,pencil)));
          vec2 wingShift=vec2(0.);float totalWeight=0.;
          for(int i=0;i<8;i++){
            float row=floor(float(i)/2.);float side=mod(float(i),2.)<.5?-1.:1.;
            float y=310.+row*147.;float root=side<0.?574.:1118.;
            float outward=(p.x-root)*side;
            float center=side<0.?300.:1396.;
            // Rounded overlapping fields carry a curved ink front from the
            // central hinge to each outer tip. No rectangular wipe boundaries.
            vec2 q=(p-vec2(center,y))/vec2(292.,128.);
            float start=${I.wings.start}.+row*${I.wings.stagger}.;
            float region=max(1.-smoothstep(.87,1.14,length(q)),phase(start+${I.wings.duration-100}.,160.));
            // Restrict each row's interior so adjacent icons cannot emerge
            // through an overlapping branch field before their own turn.
            region*=box(p,vec4(side<0.?43.:1127.,211.+row*147.,side<0.?532.:500.,198.),10.);
            float grow=phase(start,${I.wings.duration}.);
            float curve=outward+abs(p.y-y)*.65+24.*sin((p.y-y)/80.);
            float reveal=1.-smoothstep(grow*730.-85.,grow*730.+35.,curve);
            alpha=max(alpha,region*reveal*smoothstep(0.,.12,grow));
            float edge=side<0.?smoothstep(67.,111.,p.x):1.-smoothstep(1577.,1620.,p.x);
            float w=region*smoothstep(-8.,155.,outward)*edge*(1.-body)*smoothstep(0.,.08,grow);
            vec2 v=p-vec2(root,y+35.);
            float a=wings[i];float c=cos(a),s=sin(a);
            vec2 rotated=vec2(c*v.x+s*v.y,-s*v.x+c*v.y);
            wingShift+=(rotated-v)*w;totalWeight+=w;
          }
          source+=wingShift/max(1.,totalWeight);
          alpha=max(alpha,box(p,vec4(534.,584.,603.,150.),9.)*phase(${I.daily.start}.,${I.daily.duration}.));
          alpha=max(alpha,box(p,vec4(536.,696.,600.,153.),9.)*phase(${I.grades.start}.,${I.grades.duration}.));
          float bottom=max(max(box(p,vec4(-20.,780.,577.,185.),16.),box(p,vec4(1117.,782.,580.,183.),16.)),box(p,vec4(536.,840.,602.,130.),16.));
          alpha=max(alpha,bottom*phase(${I.bottom.start}.,${I.bottom.duration}.));
          alpha=max(alpha,phase(${I.completeArt.start}.,${I.completeArt.duration}.));
          float bubble=box(p,vec4(983.,136.,339.,158.),10.);
          float bubblePhase=phase(${I.bubble.start}.,${I.bubble.duration}.);
          alpha=alpha*(1.-bubble*(1.-bubblePhase));
          alpha=max(alpha,bubble*bubblePhase);
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
        gl_FragColor=art*clamp(alpha,0.,1.);
      }
    `));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    function texture(unit,source,name,raw=false){
      gl.activeTexture(gl.TEXTURE0+unit);const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
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
    texture(2,timing,'inkTimes',true);texture(3,silhouette,'characterField');
    const uniforms=Object.fromEntries(['time','fade','life','breath','tilt','nod','hair','gaze','eyeBounds','wings[0]'].map(n=>[n,gl.getUniformLocation(program,n)]));
    gl.uniform4fv(uniforms.eyeBounds,character.bounds);stage.classList.add('mesh-active');
    const renderer={
      available:true,
      render(values){
        for(const name of ['time','fade','life','breath','tilt','nod','hair'])gl.uniform1f(uniforms[name],values[name]??0);
        gl.uniform2fv(uniforms.gaze,values.gaze||[0,0]);gl.uniform1fv(uniforms['wings[0]'],values.wings||new Float32Array(8));
        gl.drawArrays(gl.TRIANGLES,0,6);
      },
      updateEyes(){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,eyes);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,character.canvas);},
      dispose(){renderer.available=false;stage.classList.remove('mesh-active');surface.remove();},
      surface
    };
    surface.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.dispose();stage.dispatchEvent(new Event('scenecontextlost'));});
    return renderer;
  }catch(error){console.warn('StudyOS renderer uses a static fallback:',error.message);surface.remove();return null;}
}
