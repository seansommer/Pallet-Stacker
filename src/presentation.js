import {mod4} from './simulation.js';
// The cases, guides and pallet slots share these physical dimensions.
export const CASE={width:1.48,height:.94,depth:.9};
export const LANE_SPACING=1.85,ROW_SPACING=1.68,SHEET_THICKNESS=.05,LAYER_PITCH=CASE.height+SHEET_THICKNESS;
export const PALLET_BASE=1.26,CASE_BASE=.38,BELT_Y=1.64;
export const laneX=(lane,lanes)=>(lane-(lanes-1)/2)*LANE_SPACING;
export const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function casePose(b,lanes){const p=b.progress,route=smooth(.18,.32,p);return {x:laneX(b.lane,lanes)*route,y:BELT_Y,z:p<.06?-12.8+smooth(0,.06,p)*2.8:p<.18?-10:-10+(p-.18)/.82*15,turn:p<.18?0:b.turn*smooth(.18,.22,p)};}
export function labelPhase(p){return {contact:p>=.115,labelVisible:p>=.115,extension:p<.115?smooth(.06,.115,p):1-smooth(.135,.18,p),active:p>=.06&&p<=.18};}
export function fitState(b){return mod4(b.turn)===b.target?'ready':mod4(b.turn)%2===b.target%2?'label':'turn';}
export const sheetPose=(age,width,layer)=>{const t=smooth(.65,1.65,age);return {x:(1-t)*(width+1.8),y:CASE_BASE+(layer+1)*CASE.height+layer*SHEET_THICKNESS+SHEET_THICKNESS/2+(1-smooth(1.55,1.95,age))*.18,z:0};};
