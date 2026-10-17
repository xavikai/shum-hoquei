export function validFavorites(value,teams){if(!Array.isArray(value))return [];const valid=new Set(teams.map(t=>t.id));return [...new Set(value.filter(id=>typeof id==='string'&&valid.has(id)))];}
export function preferredTeam(teams,{wanted,saved,favorites=[],fallback}){return teams.find(t=>t.id===wanted)||teams.find(t=>t.id===saved&&(!favorites.length||favorites.includes(t.id)))||teams.find(t=>favorites.includes(t.id))||teams.find(t=>t.id===fallback)||teams[0];}
export function filteredTeams(teams,ids,mode){return mode==='favorites'&&ids.length?teams.filter(t=>ids.includes(t.id)):teams;}

export function shouldOnboard(standalone,done){return standalone&&!done;}
