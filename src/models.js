import * as T from 'three';import{RoundedBoxGeometry}from'three/addons/geometries/RoundedBoxGeometry.js';
export const mat=(color,roughness=.55,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
export const M={steel:mat(0x92b6b2,.28,.75),dark:mat(0x112e32,.55,.55),green:mat(0x087557),blue:mat(0x103b82),floor:mat(0x143735,.35,.4),kraft:mat(0xd6ac72,.9),tape:mat(0xe9cc96,.45),white:mat(0xf7fff1),purple:mat(0x955eea)};
export function box(w,h,d,material,x=0,y=0,z=0,rounded=false){const m=new T.Mesh(rounded?new RoundedBoxGeometry(w,h,d,2,.035):new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
export function textTexture(text,{color='#e5ffe4',background='#073b30',width=512,height=160,size=64}={}){const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');x.fillStyle=background;x.fillRect(0,0,width,height);x.fillStyle=color;x.font=`900 ${size}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillText(text,width/2,height/2,width-20);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;}
export function sign(text,w=3,h=.7){return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:textTexture(text),side:T.DoubleSide}));}
export function caseModel(){const g=new T.Group();g.add(box(1.26,.78,.88,M.kraft,0,.39,0,true));g.add(box(.14,.008,.87,M.tape,0,.787,0),box(.014,.008,.88,M.dark,0,.79,0));
 const brand=textTexture('suja',{background:'#087557',width:256,height:128,size:75});
 for(const z of [-.446,.446]){const m=new T.Mesh(new T.PlaneGeometry(1.13,.27),new T.MeshStandardMaterial({map:brand,roughness:.8}));m.position.set(0,.22,z);if(z<0)m.rotation.y=Math.PI;g.add(m);}
 const c=document.createElement('canvas');c.width=256;c.height=144;const ctx=c.getContext('2d');ctx.fillStyle='#fffef0';ctx.fillRect(0,0,256,144);ctx.fillStyle='#183f32';ctx.font='bold 27px system-ui';ctx.fillText('SUJA · CASE',15,35);ctx.font='16px monospace';ctx.fillText('LABEL OUT ↑',15,64);for(let i=0;i<58;i++)if(i%3!==1)ctx.fillRect(15+i*3.8,83,i%4?2:3,43);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
 const label=new T.Mesh(new T.PlaneGeometry(.79,.44),new T.MeshStandardMaterial({map:tex,roughness:.5}));label.name='ShippingLabel';label.position.set(.1,.5,.451);g.add(label);
 // A top arrow makes the physical side label readable from overhead.
 const arrow=sign('↓',.45,.45);arrow.rotation.x=-Math.PI/2;arrow.position.set(0,.8,.16);g.add(arrow);return g;
}
export function outline(w=1.42,d=1.05,color=0xa9fc73){const geo=new T.EdgesGeometry(new T.BoxGeometry(w,.035,d));return new T.LineSegments(geo,new T.LineBasicMaterial({color,transparent:true,opacity:.8}));}
export function pallet(width=6){const g=new T.Group();for(let i=0;i<7;i++)g.add(box(width,.13,.37,M.blue,0,.3,i*.47-1.41));for(const x of [-width/2+.22,0,width/2-.22])g.add(box(.25,.28,3.2,M.blue,x,.1,0));return g;}
