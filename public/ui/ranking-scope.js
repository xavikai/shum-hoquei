export function scopesFor(team={}){return [['shum','Només el nostre equip'],['last','Últim partit del nostre equip'],['group',`${team.group||'Grup'} · tota la lliga`],['or','Tota la categoria']];}
export const scopes=scopesFor();
// group: partits del nostre grup · other: partits dels altres grups de la categoria · own: nom del nostre equip
export function rankingMatches(group,other,scope,groupFilter='all',own='',ownGroup=8){
  const mine=m=>own?m.home===own||m.away===own:m.home.includes('SHUM')||m.away.includes('SHUM');
  if(scope==='shum')return group.filter(mine);
  if(scope==='last'){const latest=group.filter(m=>m.score&&mine(m)).sort((a,b)=>(b.date+(b.time||'')).localeCompare(a.date+(a.time||''))||b.round-a.round)[0];return latest?[latest]:[];}
  if(scope==='or'){const merged=[...group.map(m=>({...m,group:ownGroup})),...other.filter(m=>m.group!==ownGroup)];return merged.filter(m=>groupFilter==='all'||m.group===Number(groupFilter));}
  return group;
}
