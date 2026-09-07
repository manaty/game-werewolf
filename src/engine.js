const randomInt=max=>{const a=new Uint32Array(1),limit=4294967296-4294967296%max;do{globalThis.crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%max;};

export const WOLF_TIMES = {reveal:25,night:14,wolves:30,seer:25,witch:30,dawn:20,hunter:25,debate:90,vote:30,verdict:20,finished:0};
export function roleDeck(n) {
  const wolves=Math.max(1,Math.floor((n+1)/4));
  return [...Array(wolves).fill('wolf'),'seer',...(n>=5?['witch']:[]),...(n>=6?['hunter']:[]),...Array(n-wolves-1-(n>=5?1:0)-(n>=6?1:0)).fill('villager')];
}
export function shuffledRoles(n,random=randomInt){
  const roles=roleDeck(n);
  for(let i=roles.length-1;i>0;i--){const j=random(i+1);[roles[i],roles[j]]=[roles[j],roles[i]];}
  return roles;
}
export class Werewolf {
  constructor(players,saved,options={}) {
    if(saved){Object.assign(this,{nightMode:'classic',coverChoices:{}},structuredClone(saved));return;}
    const roles=shuffledRoles(players.length);
    this.players=players.map((p,i)=>({id:p.id,role:roles[i],alive:true}));
    this.nightMode=options.nightMode||'classic';this.coverChoices={};
    this.debateSeconds=options.debateSeconds||90;this.stage='reveal';this.sequence=1;this.left=25;this.day=0;
    this.choices={};this.inspections={};this.potions={heal:true,poison:true};this.victim=null;this.heal=false;this.poison=null;
    this.deaths=[];this.verdict=null;this.hunter=null;this.hunterUsed=false;this.afterHunter=null;this.winner=null;this.winners=[];
  }
  addPlayer() {} // Late arrivals have no role until the next match.
  release() {}
  alive(){return this.players.filter(p=>p.alive);}
  enter(stage){this.stage=stage;this.sequence++;this.left=stage==='debate'?this.debateSeconds:stage==='night'&&this.nightMode==='openEyes'?18:WOLF_TIMES[stage];this.choices={};this.coverChoices={};}
  get coveredNight(){return this.nightMode==='openEyes'&&['wolves','seer','witch'].includes(this.stage);}
  checkWin(){const alive=this.alive(),wolves=alive.filter(p=>p.role==='wolf').length;if(!wolves)this.winner='village';else if(wolves>=alive.length-wolves)this.winner='wolves';if(this.winner){this.winners=this.players.filter(p=>(p.role==='wolf')===(this.winner==='wolves')).map(p=>p.id);this.enter('finished');}return Boolean(this.winner);}
  plurality(){const counts={};for(const id of Object.values(this.choices)){if(id)counts[id]=(counts[id]||0)+1;}const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);return ranked.length&&(!ranked[1]||ranked[0][1]>ranked[1][1])?ranked[0][0]:null;}
  kill(ids){this.deaths=[...new Set(ids.filter(Boolean))];for(const id of this.deaths){const p=this.players.find(p=>p.id===id);if(p)p.alive=false;}}
  resolveDeaths(next){const hunter=this.players.find(p=>!p.alive&&p.role==='hunter');if(hunter&&!this.hunterUsed){this.hunter=hunter.id;this.hunterUsed=true;this.afterHunter=next;this.enter('hunter');}else if(!this.checkWin())this.enter(next);}
  advance(dt){if(this.winner)return false;this.left-=Math.max(0,Math.min(dt,5));if(this.left>0)return false;this.next();return true;}
  next(){
    switch(this.stage){
      case 'reveal': case 'verdict':
        if(this.stage==='verdict'){this.resolveDeaths('night');break;}
        this.enter('night');break;
      case 'night':this.day++;this.deaths=[];this.verdict=null;this.victim=null;this.heal=false;this.poison=null;this.enter('wolves');break;
      case 'wolves':this.victim=this.plurality();this.enter('seer');break;
      case 'seer':if(this.players.some(p=>p.role==='witch'))this.enter('witch');else {this.kill([this.victim]);this.enter('dawn');}break;
      case 'witch':this.kill([this.heal?null:this.victim,this.poison]);this.enter('dawn');break;
      case 'dawn':this.resolveDeaths('debate');break;
      case 'hunter':{const target=this.choices[this.hunter];if(target){const p=this.players.find(p=>p.id===target);if(p)p.alive=false;this.deaths=[...new Set([...this.deaths,target])];}this.hunter=null;if(!this.checkWin())this.enter(this.afterHunter);break;}
      case 'debate':this.enter('vote');break;
      case 'vote':this.verdict=this.plurality();this.kill([this.verdict]);this.enter('verdict');break;
    }
  }
  action(id,action,value){
    const p=this.players.find(p=>p.id===id);
    if(action!=='wolfChoose'||!value||value.sequence!==this.sequence||this.winner||!p)throw new Error('wolfInvalid');
    const target=value.target===null?null:this.players.find(p=>p.id===value.target&&p.alive);
    if(value.target!==null&&!target)throw new Error('wolfInvalid');
    if(this.stage==='hunter'&&id===this.hunter){if(target?.id===id)throw new Error('wolfInvalid');this.choices[id]=target?.id||null;return;}
    if(!p.alive)throw new Error('wolfInvalid');
    if(this.coveredNight){this.coverAction(p,target,value);return;}
    if(this.stage==='vote'||this.stage==='wolves'&&p.role==='wolf'){
      if(target&&(target.id===id||this.stage==='wolves'&&target.role==='wolf'))throw new Error('wolfInvalid');
      this.choices[id]=target?.id||null;return;
    }
    if(this.stage==='seer'&&p.role==='seer'){
      if(!target||target.id===id||this.choices[id])throw new Error('wolfInvalid');
      this.inspections[id]={target:target.id,wolf:target.role==='wolf'};this.choices[id]=target.id;return;
    }
    if(this.stage==='witch'&&p.role==='witch'){
      if(value.potion==='heal'&&this.potions.heal&&this.victim){this.heal=true;this.potions.heal=false;return;}
      if(value.potion==='poison'&&this.potions.poison&&target&&target.id!==id){this.poison=target.id;this.potions.poison=false;return;}
      if(value.potion==='pass'){this.choices[id]=null;return;}
    }
    throw new Error('wolfInvalid');
  }
  coverAction(p,target,value){
    if(target?.id===p.id)throw new Error('wolfInvalid');
    const id=p.id;
    // Identical acknowledgements and controls for real actions and decoys.
    // Cover choices never enter the effective vote or potion state.
    if(this.stage==='witch'){
      if(!['heal','poison','pass'].includes(value.potion)||value.potion==='poison'&&!target)throw new Error('wolfInvalid');
      const cover=this.coverChoices[id]||{};
      this.coverChoices[id]={...cover,choice:target?.id||null,[value.potion]:true};
      if(p.role!=='witch')return;
      if(value.potion==='heal'&&this.potions.heal&&this.victim){this.heal=true;this.potions.heal=false;}
      if(value.potion==='poison'&&this.potions.poison&&target){this.poison=target.id;this.potions.poison=false;}
      return;
    }
    if(value.potion!==undefined)throw new Error('wolfInvalid');
    this.coverChoices[id]={choice:target?.id||null};
    if(this.stage==='wolves'&&p.role==='wolf')this.choices[id]=target&&target.role!=='wolf'?target.id:null;
    if(this.stage==='seer'&&p.role==='seer'&&target&&!this.choices[id]){this.inspections[id]={target:target.id,wolf:target.role==='wolf'};this.choices[id]=target.id;}
  }
  snapshot(id){
    const p=this.players.find(p=>p.id===id),night=['night','wolves','seer','witch'].includes(this.stage);
    return {stage:this.stage,sequence:this.sequence,seconds:Math.max(0,Math.ceil(this.left)),day:this.day,winner:this.winner,winners:this.winners,debateSeconds:this.debateSeconds,nightMode:this.nightMode,
      players:this.players.map(p=>({id:p.id,alive:p.alive,...(this.winner?{role:p.role}:{})})),
      deaths:night?[]:this.deaths,verdict:this.stage==='verdict'?this.verdict:null,
      // Only the authenticated owner gets secrets. Displays and admin use no player id.
      ...(p?{private:{role:p.role,alive:p.alive,choice:this.coveredNight?this.coverChoices[id]?.choice??null:this.choices[id]??null,inspection:this.inspections[id]||null,
        ...(this.coveredNight?{cover:{...this.coverChoices[id]}}:{}),
        ...(p.role==='wolf'&&this.coveredNight&&this.stage==='wolves'?{packChoices:this.players.filter(x=>x.role==='wolf'&&x.alive).map(x=>({id:x.id,target:this.choices[x.id]||null}))}:{}),
        allies:p.role==='wolf'?this.players.filter(x=>x.role==='wolf').map(x=>x.id):[],
        ...(p.role==='witch'?{potions:{...this.potions},victim:this.stage==='witch'?this.victim:null,healed:this.heal,poisoned:this.poison}:{}),
        canAct:(p.alive&&(this.coveredNight||this.stage==='vote'||this.stage==='wolves'&&p.role==='wolf'||this.stage==='seer'&&p.role==='seer'&&!this.choices[id]||this.stage==='witch'&&p.role==='witch'))||(this.stage==='hunter'&&this.hunter===id),
        targets:this.alive().filter(x=>x.id!==id&&(this.coveredNight||!(this.stage==='wolves'&&x.role==='wolf'))).map(x=>x.id)
      }}:{spectator:true})};
  }
  save(){return structuredClone({...this});}
}
