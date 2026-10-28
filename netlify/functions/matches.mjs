const API='https://api.football-data.org/v4';
const COMPETITIONS=['FL1','PL','PD','BL1','SA','CL'];
export default async (req) => {
  const token=process.env.FOOTBALL_DATA_TOKEN;
  if(!token) return Response.json({error:'La variable FOOTBALL_DATA_TOKEN est absente dans les variables d’environnement Netlify.'},{status:500});
  const headers={'X-Auth-Token':token};
  const get=async(path)=>{const r=await fetch(API+path,{headers});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||`Football-Data.org répond ${r.status}`);return d};
  const settled=await Promise.allSettled([
    get('/matches?dateFrom='+new Date().toISOString().slice(0,10)+'&dateTo='+new Date(Date.now()+6*86400000).toISOString().slice(0,10)),
    ...COMPETITIONS.map(c=>get(`/competitions/${c}/standings`)),
    get('/competitions/PL/scorers?limit=10')
  ]);
  const matchResult=settled[0];
  if(matchResult.status==='rejected') return Response.json({error:matchResult.reason?.message||'Impossible de charger les matchs. Vérifie le jeton et les compétitions accessibles.'},{status:502});
  const tables={};COMPETITIONS.forEach((c,i)=>{const r=settled[i+1];if(r.status==='fulfilled')tables[c]=r.value.standings?.find(s=>s.type==='TOTAL')||r.value.standings?.[0]||null});
  const scorerResult=settled[COMPETITIONS.length+1];
  return Response.json({matches:matchResult.value.matches||[],tables,scorers:scorerResult.status==='fulfilled'?(scorerResult.value.scorers||[]):[],updatedAt:new Date().toISOString(),source:'Football-Data.org'},{headers:{'Cache-Control':'public, max-age=120'}});
};
