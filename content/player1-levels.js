/* PLAYER 1 — configuration and pure progression rules. Staged only: no pack issuance, persistence or production changes. Inputs use canonical id_variant keys. */
(function(root){
  'use strict';
  const api=(function createPlayer1Levels(){
  const levels=Object.freeze([
    Object.freeze({id:"player1-01",number:1,name:"PRESS START",designs:Object.freeze(["arcade","abuket","asteroids","invader","controls","collector","gamepop","mainstream","mapa","n64","snes","sonic","samus","hyrule","x","sv001","humangamer","continue","gameover","kame","nerv","gatosamurai","guardianes","sensei","caritele"])}),
    Object.freeze({id:"player1-02",number:2,name:"NEXT LEVEL",designs:Object.freeze(["blowme","challenger","neo","polystation","nowloading","levelup","oneplayer","linkfloyd","wirimask","zero","thankyou","gunsncontrols","omkami","hipstermario","pikaball","keepcalm","tokyo3","docecasas","futbolito","gojira","mrkarate","robogodin","chocarreros","pizzcipher","bustfiction"])})
  ]);
  const variants=Object.freeze(["b","e","r","f"]);
  const membership=new Map(levels.flatMap(l=>l.designs.map(id=>[id,l.id])));
  const has=(owned,key)=>Number(owned?.[key])>0;
  function progress(owned){
    let unlocked=true;
    return levels.map(level=>{
      const discovered=level.designs.filter(id=>variants.some(v=>has(owned,id+"_"+v))).length;
      const collected=level.designs.reduce((sum,id)=>sum+variants.filter(v=>has(owned,id+"_"+v)).length,0);
      const unlockedNow=unlocked;
      unlocked=unlockedNow&&discovered===level.designs.length;
      return {...level,unlocked:unlockedNow,discovered,designTotal:level.designs.length,collected,variantTotal:level.designs.length*variants.length,complete:discovered===level.designs.length,allVariants:collected===level.designs.length*variants.length};
    });
  }
  function eligibleDesigns(owned,levelId){
    const allowed=progress(owned).filter(l=>l.unlocked&&(!levelId||levelId===l.id));
    return allowed.flatMap(l=>l.designs);
  }
  function visibleDesigns(owned){
    const visible=new Set(eligibleDesigns(owned));
    // Never remove legacy cards; callers supply canonical card keys from the existing album.
    for(const key of Object.keys(owned||{})){
      const match=/^([a-z0-9]+)_[berf]$/.exec(key);
      if(match&&has(owned,key))visible.add(match[1]);
    }
    return [...visible];
  }
  function validateCatalog(cards){
    const errors=[],seen=new Set();
    for(const level of levels){
      if(level.designs.length!==25)errors.push(level.id+": expected 25 designs");
      for(const id of level.designs){
        if(seen.has(id))errors.push("duplicate design: "+id);
        seen.add(id);
        for(const v of variants){
          const card=cards.find(c=>c.k===id+"_"+v);
          if(!card||!card.img||card.bx)errors.push("missing eligible variant: "+id+"_"+v);
        }
      }
    }
    return errors;
  }
  return Object.freeze({levels,variants,progress,eligibleDesigns,visibleDesigns,validateCatalog,levelOf:id=>membership.get(id)||null});
})();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ICMX_PLAYER1_LEVELS=api;
})(typeof globalThis!=='undefined'?globalThis:this);
