import {createWerewolfView} from './werewolf-ui.js';
import {wolfCue} from './werewolf-text.js';
import {createBackgroundMusic} from './background-music.js';
const app=document.querySelector('#app'),music=createBackgroundMusic();let view,role,state,audioContext,lastCue='',speech;
const tell=(type,value)=>parent.postMessage({retroMuseum:1,type,...value},'*');
const sound=document.querySelector('#sound');
sound.onclick=async()=>{try{audioContext||=new(window.AudioContext||window.webkitAudioContext)();await audioContext.resume();sound.textContent='♪';playSound();}catch{}};
function playSound(){if(role!=='display'||!state)return;music.update(audioContext,state,audioContext?.state==='running');const cue=wolfCue(state),key=state.party.id+':'+state.party.werewolf?.sequence+':'+state.phase+':'+cue;if(key===lastCue)return;lastCue=key;speech?.pause();if(cue&&audioContext?.state==='running'){speech=new Audio('assets/narration/'+state.language+'/'+cue+'.mp3');speech.play().catch(()=>{});}}
window.addEventListener('message',event=>{
 if(event.source!==parent||event.data?.retroMuseum!==1||event.data.type!=='state')return;
 role=event.data.role;state=event.data.state;
 state={...state,experience:'werewolf',party:{...state.party,werewolf:state.party.community}};
 view||=createWerewolfView(app,role,{send:(action,value)=>{tell('action',{action,value});return Promise.resolve();},notice:text=>{document.querySelector('#notice').textContent=text;}});
 view.update(state,event.data.online);playSound();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){music.stop();speech?.pause();lastCue='';}else playSound();});
tell('ready',{});
