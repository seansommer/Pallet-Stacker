export const LEVELS=Object.freeze([
 {name:'GREEN LIGHT',juice:'Mighty Dozen',lanes:3,travel:8.4,interval:1.45,color:0x60d775},
 {name:'CITRUS SHIFT',juice:'Citrus Immunity',lanes:4,travel:7.2,interval:1.12,color:0xffc45b},
 {name:'PURPLE REIGN',juice:'Berry Lemon',lanes:5,travel:6.4,interval:.88,color:0xc58cff}
]);
export const mod4=n=>((n%4)+4)%4;
export const targetTurn=(lane,row,lanes)=>lane===0?3:lane===lanes-1?1:row===0?0:2;
export const alignment=(turn,target)=>mod4(turn)%2===target%2;
export function seededRandom(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export class Stacker{
 constructor({seed=12345,practice=false,onEvent=()=>{}}={}){Object.assign(this,{seed,practice,onEvent,random:seededRandom(seed),level:0,layer:0,time:0,levelTime:0,score:0,combo:0,maxCombo:0,stacked:0,perfect:0,labels:0,wrongLabels:0,misses:0,boxes:[],slots:[],placed:[],nextId:1,spawnClock:.45,state:'playing',paused:false,breakTime:0,completed:0,levelStartScore:0});}
 get config(){return LEVELS[this.level];}get lanes(){return this.config.lanes;}get lives(){return Math.max(0,8-this.misses);}get multiplier(){return Math.min(4,1+Math.floor(this.combo/8));}
 emit(type,values={}){this.onEvent({type,...values});}
 rotate(id,dir=1){if(this.paused||this.state!=='playing')return false;const b=this.boxes.find(b=>b.id===id);if(!b||b.progress<.22||b.progress>=1)return false;b.turn+=dir<0?-1:1;b.lastTurn=b.progress;b.turns++;this.emit('turn',{id,lane:b.lane,ready:alignment(b.turn,b.target),label:mod4(b.turn)===b.target});return true;}
 rotateLane(lane,dir=1){const b=this.boxes.filter(b=>b.lane===lane&&b.progress>=.22&&b.progress<1).sort((a,b)=>b.progress-a.progress)[0];return b?this.rotate(b.id,dir):false;}
 spawn(){const open=[];for(let lane=0;lane<this.lanes;lane++)for(let row=0;row<2;row++){const key=lane+':'+row;if(!this.slots.includes(key)&&!this.boxes.some(b=>b.key===key))open.push({lane,row,key});}if(!open.length)return false;
 const slot=open[Math.floor(this.random()*open.length)],target=targetTurn(slot.lane,slot.row,this.lanes);const turn=mod4(target+1+Math.floor(this.random()*3));const b={...slot,id:this.nextId++,target,turn,turns:0,lastTurn:-1,progress:0,layer:this.layer};this.boxes.push(b);this.emit('spawn',{box:{...b}});return true;}
 step(dt){if(this.paused||['won','lost'].includes(this.state))return;dt=Math.max(0,Math.min(dt,.1));
 if(this.state==='layer'||this.state==='level'){this.breakTime-=dt;if(this.breakTime>0)return;
  if(this.state==='level'){if(this.level===2){this.state='won';this.emit('end',{won:true});return;}this.level++;this.layer=0;this.levelTime=0;this.levelStartScore=this.score;this.placed=[];this.emit('levelStart',{level:this.level});}
  else this.layer++;this.slots=[];this.boxes=[];this.spawnClock=.65;this.state='playing';return;
 }
 this.time+=dt;this.levelTime+=dt;this.spawnClock-=dt;if(this.spawnClock<=0){if(this.spawn())this.spawnClock=this.config.interval*(this.practice?1.35:1);else this.spawnClock=.1;}
 for(const b of [...this.boxes]){b.progress+=dt/(this.config.travel*(this.practice?1.3:1));if(b.progress>=1){this.land(b);if(this.state==='lost')break;}}
 if(this.state==='playing'&&this.slots.length===this.lanes*2&&this.boxes.length===0){this.combo+=2;const points=200*this.multiplier;this.score+=points;this.state=this.layer===4?'level':'layer';this.breakTime=this.layer===4?3:1.35;
  if(this.layer===4){this.completed++;const bonus=Math.round(4000*60/(60+this.levelTime));this.score+=bonus;this.emit('pallet',{points:points+bonus,level:this.level,completed:this.completed});}
  else this.emit('layer',{points,layer:this.layer+1});
 }
 }
 land(b){this.boxes=this.boxes.filter(x=>x.id!==b.id);if(!alignment(b.turn,b.target)){this.misses++;this.combo=0;this.emit('miss',{box:{...b},points:0});if(!this.practice&&this.misses>=8){this.state='lost';this.emit('end',{won:false});}return;}
 const label=mod4(b.turn)===b.target,timed=b.lastTurn>=.78&&b.lastTurn<=.98;const mult=this.multiplier;
 if(label){this.labels++;this.combo++;}else{this.wrongLabels++;this.combo=0;}
 if(label&&timed)this.perfect++;this.maxCombo=Math.max(this.maxCombo,this.combo);this.stacked++;this.slots.push(b.key);this.placed.push({...b,level:this.level});
 const penalty=label?0:60,points=(100+(label?50:0)+(label&&timed?100:0))*mult-penalty;this.score+=points;
 this.emit('stack',{box:{...b},points,label,timed:label&&timed,mult,penalty});
 }
 result(){return {version:'1.0.0',game:'pallet-stacker',mode:this.practice?'practice':'arcade',seed:this.seed,score:this.score,stacked:this.stacked,perfect:this.perfect,labels:this.labels,wrongLabels:this.wrongLabels,misses:this.misses,maxCombo:this.maxCombo,completed:this.completed,duration:Math.round(this.time*100)/100,won:this.state==='won'};}
}
export function rankRuns(directory={},runs={},hidden={}){return Object.entries(runs||{}).flatMap(([uid,records])=>Object.entries(records||{}).filter(([id,r])=>directory?.[uid]&&!hidden?.[uid]?.[id]&&r.game==='pallet-stacker'&&r.mode==='arcade'&&Number.isFinite(r.score)&&r.score>=0).map(([id,r])=>({...r,id,uid,displayName:directory[uid].displayName}))).sort((a,b)=>b.score-a.score||a.duration-b.duration||String(a.id).localeCompare(String(b.id))).slice(0,10);}
