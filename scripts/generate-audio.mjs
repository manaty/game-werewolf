import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {WOLF_SCRIPT,wolfLanguage} from '../public/werewolf-text.js';
const envIndex=process.argv.indexOf('--env-file');
const envPath=envIndex>=0?process.argv[envIndex+1]:'.env';
let key=process.env.OPENAI_API_KEY;
if(!key){try{const env=await readFile(envPath,'utf8');const line=env.split(/\r?\n/).find(l=>/^\s*OPENAI_API_KEY\s*=/.test(l));key=line?.slice(line.indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2');}catch{}}
if(!key)throw new Error('Set OPENAI_API_KEY or pass --env-file. No audio was generated.');
const model='gpt-4o-mini-tts',voice='marin';
const instructions='Narrate a friendly, mysterious village social deduction game. Speak clearly and naturally, with calm suspense, suitable for a family audience. Use the language of the supplied text. Do not add any words. Keep a steady, brisk pace with short pauses.';
let manifest={};try{manifest=JSON.parse(await readFile('assets/narration/manifest.json','utf8'));}catch{}
const jobs=['en','fr','tl'].flatMap(language=>Object.entries(WOLF_SCRIPT).map(([cue,text])=>({language,cue,input:text[wolfLanguage(language)]})));
async function worker(){while(jobs.length){const {language,cue,input}=jobs.shift(),id=`${language}/${cue}`,path=`assets/narration/${id}.mp3`,hash=createHash('sha256').update(JSON.stringify({model,voice,input,instructions})).digest('hex');
 if(manifest[id]?.hash===hash){try{if((await stat(path)).size>1000){console.log('Cached '+id);continue;}}catch{}}
 const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,voice,input,instructions,response_format:'mp3'}),signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw new Error(`TTS ${response.status} for ${id}`);
 const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<1000)throw new Error('Empty TTS response');
 await mkdir(`assets/narration/${language}`,{recursive:true});await writeFile(path,bytes);manifest[id]={hash,model,voice,bytes:bytes.length};console.log('Generated '+id);
}}
const results=await Promise.allSettled([worker(),worker(),worker()]);
await mkdir('assets/narration',{recursive:true});await writeFile('assets/narration/manifest.json',JSON.stringify(manifest,null,2)+'\n');
if(results.some(r=>r.status==='rejected')){for(const r of results)if(r.status==='rejected')console.error(r.reason.message);process.exitCode=1;}else console.log('All '+Object.keys(WOLF_SCRIPT).length*3+' narration clips ready.');
