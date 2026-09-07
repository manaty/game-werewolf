import {Werewolf} from './engine.js';
globalThis.RetroMuseumGame={create(players,saved,options){
 const game=new Werewolf(players,saved,options);
 game.status=()=>({winner:game.winner,requiredPlayers:game.players.filter(p=>p.alive).map(p=>p.id)});
 return game;
}};
