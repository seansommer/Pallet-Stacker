import * as T from 'three';
import{RoomEnvironment}from'three/addons/environments/RoomEnvironment.js';
import{M,box,sign,caseModel,outline,pallet,mat,slipSheet,labelPrinter}from'./models.js';
import{targetTurn}from'./simulation.js';
import{CASE,LANE_SPACING,ROW_SPACING,LAYER_PITCH,PALLET_BASE,CASE_BASE,laneX,casePose,labelPhase,fitState,sheetPose,smooth}from'./presentation.js';
export{laneX};
export const pathPosition=(b,lanes)=>{const p=casePose(b,lanes);return new T.Vector3(p.x,p.y,p.z);};
const ink=c=>new T.MeshBasicMaterial({color:c});
const FIT_COLORS={ready:0xbaff83,label:0xffbc66,turn:0xbb96ff};
export class GameScene{
 constructor(canvas,onTap){this.canvas=canvas;this.onTap=onTap;this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;this.scene=new T.Scene();this.scene.background=new T.Color(0x345853);this.scene.fog=new T.Fog(0x345853,42,100);this.camera=new T.PerspectiveCamera(34,1,.1,200);this.ray=new T.Raycaster();this.pointer=new T.Vector2();this.live=new Map();this.placed=[];this.flights=[];this.sheets=[];this.fx=[];this.clock=0;this.view='line';this.template=caseModel();this.level=-1;
 const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.05);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.45;room.dispose();pmrem.dispose();
 this.scene.add(new T.HemisphereLight(0xe6f6ff,0x53614c,2));const sun=new T.DirectionalLight(0xfff2da,3.7);sun.position.set(-10,22,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:20,bottom:-20,near:.5,far:60});sun.shadow.normalBias=.028;sun.shadow.bias=-.0001;sun.shadow.radius=3;this.scene.add(sun);const fill=new T.DirectionalLight(0xaebfff,1.5);fill.position.set(12,10,-8);this.scene.add(fill);
 this.world();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();let down;
 canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,id:e.pointerId};});canvas.addEventListener('pointerup',e=>{if(!down||down.id!==e.pointerId||Math.hypot(e.clientX-down.x,e.clientY-down.y)>10){down=null;return;}down=null;const id=this.pick(e.clientX,e.clientY);if(id)this.onTap(id,e.shiftKey?-1:1);});canvas.addEventListener('pointercancel',()=>down=null);canvas.addEventListener('contextmenu',e=>e.preventDefault());
 }
 world(){this.scene.add(box(70,.2,80,M.floor,0,-3,0));const grid=new T.GridHelper(70,28,0x83978c,0x738b82);grid.position.y=-2.89;this.scene.add(grid);
 const wall=mat(0x96b9a8,.85);this.scene.add(box(60,23,.4,wall,0,8,-24));for(const side of [-1,1])this.scene.add(box(.4,23,55,wall,side*29,8,-4));
 for(let x=-24;x<=24;x+=6){this.scene.add(box(.3,22,.4,M.steel,x,8,-23.5),box(.15,.3,35,M.steel,x,19,-6));for(const z of [-18,-5,8])this.scene.add(box(3.2,.08,.22,ink(0xf2fff0),x,18.8,z));}
 const logo=sign('SUJA / STACK DIVISION',14,2);logo.position.set(0,5.2,-23.6);this.scene.add(logo);
 for(const side of [-1,1]){for(let i=0;i<4;i++){const p=pallet(3.7);p.position.set(side*(13+i%2*5),-2.7,-12+Math.floor(i/2)*8);this.scene.add(p);for(let j=0;j<6;j++)this.scene.add(box(1.2,.8,.9,M.kraft,p.position.x+(j%3-1)*1.2,-2.2+Math.floor(j/3)*.82,p.position.z));}
 this.scene.add(box(2,.3,18,M.dark,side*11,-.3,-5));for(let j=0;j<6;j++)this.scene.add(box(1.4,.9,1.1,M.kraft,side*11,.3,-12+j*2.8));for(const z of [-12,2])this.scene.add(box(.14,2.5,.16,M.steel,side*11,-1.5,z));}
 this.scene.add(box(2.15,.32,5,M.dark,0,1.3,-11.3,true));this.infeedRollers=this.rollers(1.95,-13.65,24,.21);this.scene.add(this.infeedRollers);
 this.printer=labelPrinter();this.scene.add(this.printer);
 // A sheet magazine sits alongside the pallet, separate from the live belt.
 this.magazine=new T.Group();this.scene.add(this.magazine);
 this.line=new T.Group();this.scene.add(this.line);this.palletRoot=new T.Group();this.scene.add(this.palletRoot);this.ghosts=new T.Group();this.scene.add(this.ghosts);
 }
 rollers(width,start,count,gap){const mesh=new T.InstancedMesh(new T.CylinderGeometry(.079,.079,width,16),M.steel,count),o=new T.Object3D();for(let i=0;i<count;i++){o.position.set(0,1.54,start+i*gap);o.rotation.z=Math.PI/2;o.updateMatrix();mesh.setMatrixAt(i,o.matrix);}mesh.receiveShadow=true;return mesh;}
 setup(s){this.level=s.level;this.lanes=s.lanes;this.line.clear();this.palletRoot.clear();this.ghosts.clear();this.magazine?.clear();for(const m of this.live.values())this.scene.remove(m);for(const f of this.flights||[])this.scene.remove(f.m);this.flights=[];this.sheets=[];this.live.clear();this.placed=[];this.placedCount=0;const width=s.lanes*LANE_SPACING;
 this.line.add(box(width+.25,.26,14.4,M.dark,0,1.3,-2.2,true),this.rollers(width-.08,-9.22,66,.214));
 for(const side of [-1,1]){this.line.add(box(.16,.24,14.55,M.steel,side*(width/2+.02),1.38,-2.1,true),box(.035,.05,14.5,ink(side<0?0xa6f972:0xb497e8),side*(width/2+.11),1.52,-2.1));for(const z of [-8,-2,4]){this.line.add(box(.16,4.2,.2,M.steel,side*(width/2-.3),-.85,z),box(.48,.07,.45,M.dark,side*(width/2-.3),-2.86,z));}this.line.add(box(.12,.12,13.6,M.steel,side*(width/2-.3),-.9,-2.1));}
 this.line.add(box(.7,.7,1.2,M.green,width/2+.5,.75,-2,true),box(.12,.12,width,M.steel,0,.3,0));
 for(let lane=0;lane<s.lanes;lane++){const x=laneX(lane,s.lanes);for(const side of [-1,1])this.line.add(box(.024,.012,13.8,ink(0x45685b),x+side*.9,1.629,-2.1));
 const zone=box(1.75,.008,3.05,new T.MeshBasicMaterial({color:0xa874ea,transparent:true,opacity:.23,depthWrite:false}),x,1.635,3.18);zone.castShadow=false;this.line.add(zone);for(const z of [1.67,4.7])this.line.add(box(1.73,.012,.035,ink(0xc49dff),x,1.645,z));const n=sign(String(lane+1),.47,.44);n.rotation.x=-Math.PI/2;n.position.set(x,1.65,4.76);this.line.add(n);
 for(let row=0;row<2;row++){const target=targetTurn(lane,row,s.lanes),g=outline();g.position.set(x,1.65,6+row*ROW_SPACING);g.rotation.y=target*Math.PI/2;g.userData.lane=lane;g.userData.row=row;this.ghosts.add(g);}}
 const deck=pallet(width+.2);this.palletRoot.add(deck);this.palletRoot.position.set(0,PALLET_BASE,6+ROW_SPACING/2);
 // Lift base, scissor arms and ram give the rising stack a physical foundation.
 this.line.add(box(width+.6,.2,4.1,M.dark,0,-2.6,6.84,true));for(const side of [-1,1]){const arm=box(.16,4,.16,M.steel,side*(width/2-.45),-.55,6.84);arm.rotation.x=side*.55;this.line.add(arm);}
 if(this.magazine){for(let i=0;i<5;i++){const sheet=slipSheet(width+.16);sheet.position.set(width+1.8,.5+i*.065,6.84);this.magazine.add(sheet);}this.magazine.add(box(width+.3,.15,3.8,M.steel,width+1.8,.3,6.84));}
 this.resize();
 }
 resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.setView(this.view);}
 setView(view){this.view=view;const target=new T.Vector3(0,.6,-1.8),direction=new T.Vector3(view==='angle'?12:view==='line'?2.5:0,view==='overhead'?40:23,view==='overhead'?5:26).normalize();const width=(this.lanes||3)*LANE_SPACING;
 // Fit the real near and far corners, including case height, at any aspect ratio.
 const points=[];for(const x of [-width/2-.5,width/2+.5])for(const z of [-13.2,9])for(const y of [.3,2.8])points.push(new T.Vector3(x,y,z));let distance=23;for(let i=0;i<70;i++){this.camera.position.copy(target).addScaledVector(direction,distance);this.camera.lookAt(target);this.camera.updateMatrixWorld();if(points.every(v=>{const p=v.clone().project(this.camera);return Math.abs(p.x)<.9&&p.y<.72&&p.y>-.79;}))break;distance*=1.035;}}
 pick(x,y){const r=this.canvas.getBoundingClientRect();this.pointer.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);this.ray.setFromCamera(this.pointer,this.camera);const eligible=[...this.live.values()].filter(m=>m.userData.progress>=.22);const hits=this.ray.intersectObjects(eligible.map(m=>m.children[0]),true);if(hits.length)return hits[0].object.userData.id;
 let id=null,dist=30;for(const m of eligible){const p=m.position.clone().add(new T.Vector3(0,CASE.height/2,0)).project(this.camera),d=Math.hypot((p.x+1)/2*r.width+r.left-x,(1-p.y)/2*r.height+r.top-y);if(d<dist){dist=d;id=m.userData.id;}}return id;}
 makeCase(b){const m=new T.Group();m.add(this.template.clone());const guide=outline();guide.rotation.y=b.target*Math.PI/2;guide.position.set(0,.006,1.33);m.add(guide);m.userData.guide=guide;m.traverse(o=>o.userData.id=b.id);return m;}
 event(e){if(e.type==='stack'||e.type==='miss'){const m=this.live.get(e.box.id);if(m){this.live.delete(e.box.id);m.userData.guide.visible=false;this.flights.push({m,box:e.box,miss:e.type==='miss',age:0,start:m.position.clone()});}if(e.type==='stack')this.burst(laneX(e.box.lane,this.lanes),1.9,5.3,e.timed?0xc8a2ff:0xadff91);}
 if(e.type==='layer'){const width=this.lanes*LANE_SPACING+.16,m=slipSheet(width);this.palletRoot.add(m);this.sheets.push({m,age:0,layer:e.layer-1,width});}if(e.type==='layer'||e.type==='pallet')this.burst(0,2,6,0xf3da76,25);}
 burst(x,y,z,color,count=10){for(let i=0;i<count;i++){const m=box(.07,.07,.07,ink(color),x,y,z);this.scene.add(m);this.fx.push({m,age:0,v:new T.Vector3((Math.random()-.5)*4,2+Math.random()*4,(Math.random()-.5)*3)});}}
 render(s,dt){if(s!==this.sim){this.level=-1;this.sim=s;}if(s.level!==this.level)this.setup(s);this.clock+=dt;
 this.palletRoot.position.y=T.MathUtils.lerp(this.palletRoot.position.y,PALLET_BASE-s.layer*LAYER_PITCH,Math.min(1,dt*5));
 const applying=s.boxes.find(b=>labelPhase(b.progress).active);const phase=labelPhase(applying?.progress??0);const head=this.printer.userData.head;head.position.z=1.3-phase.extension*.735;
 for(const b of s.boxes){let m=this.live.get(b.id);if(!m){m=this.makeCase(b);this.scene.add(m);this.live.set(b.id,m);}const pose=casePose(b,s.lanes),label=labelPhase(b.progress);m.position.set(pose.x,pose.y,pose.z);m.getObjectByName('ShippingLabel').visible=label.labelVisible;const current=m.children[0].rotation.y;m.children[0].rotation.y=b.progress<.22?pose.turn*Math.PI/2:T.MathUtils.lerp(current,b.turn*Math.PI/2,Math.min(1,dt*20));m.userData.progress=b.progress;const guide=m.userData.guide;guide.visible=b.progress>=.22&&b.progress<.95;guide.userData.ink.color.setHex(FIT_COLORS[fitState(b)]);guide.userData.surface.color.setHex(FIT_COLORS[fitState(b)]);guide.userData.ink.opacity=.75+.15*Math.sin(this.clock*4);}
 for(const [id,m]of this.live)if(!s.boxes.some(b=>b.id===id)){this.scene.remove(m);this.live.delete(id);}
 while(this.placedCount<s.placed.length){const b=s.placed[this.placedCount++],m=this.template.clone();m.position.set(laneX(b.lane,s.lanes),CASE_BASE+b.layer*LAYER_PITCH,(b.row-.5)*ROW_SPACING);m.rotation.y=b.turn*Math.PI/2;m.visible=false;m.userData.id=b.id;this.palletRoot.add(m);this.placed.push(m);}
 for(const f of this.flights){f.age+=dt;const t=Math.min(1,f.age/.55);if(f.miss){f.m.position.set(f.start.x+(f.box.lane%2?1:-1)*t*.5,1.64-5*t*t,5+2*t);f.m.rotation.z=t*2;f.m.rotation.x=t*1.5;}else{const target=new T.Vector3(laneX(f.box.lane,s.lanes),this.palletRoot.position.y+CASE_BASE+f.box.layer*LAYER_PITCH,6+f.box.row*ROW_SPACING);f.m.position.lerpVectors(f.start,target,smooth(0,1,t));f.m.position.y+=Math.sin(t*Math.PI)*.35;}if(t>=1){this.scene.remove(f.m);const placed=this.placed.find(m=>m.userData.id===f.box.id);if(placed)placed.visible=true;}}
 this.flights=this.flights.filter(f=>f.age<.55);for(const m of this.placed)if(!this.flights.some(f=>f.box.id===m.userData.id))m.visible=true;
 for(const sheet of this.sheets){sheet.age+=dt;const p=sheetPose(sheet.age,sheet.width,sheet.layer);sheet.m.position.set(p.x,p.y,p.z);sheet.m.rotation.z=(1-smooth(.65,1.65,sheet.age))*.025;sheet.m.visible=sheet.age>=.6;}
 for(const g of this.ghosts.children){g.visible=s.state==='playing'&&!s.slots.includes(g.userData.lane+':'+g.userData.row);g.position.y=this.palletRoot.position.y+CASE_BASE+s.layer*LAYER_PITCH+.014;g.userData.ink.opacity=.55+.15*Math.sin(this.clock*3);}
 for(const f of this.fx){f.age+=dt;f.m.position.addScaledVector(f.v,dt);f.v.y-=6*dt;f.m.rotation.z+=dt*4;f.m.scale.setScalar(Math.max(0,1-f.age));if(f.age>1){this.scene.remove(f.m);f.m.geometry.dispose();f.m.material.dispose();}}this.fx=this.fx.filter(f=>f.age<1);
 this.renderer.render(this.scene,this.camera);}
}
