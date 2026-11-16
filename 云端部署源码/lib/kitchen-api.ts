// @ts-nocheck
// Hosted adapter for the existing Python API. Secrets come only from the runtime.
import prompts from './kitchen-prompts.json';
const days=['周一','周二','周三','周四','周五','周六','周日'],meals=['早餐','午餐','晚餐'];
const staples=['大米','米饭','食用油','酱油','食盐','糖','盐'];
const round=n=>Math.round(n*100)/100;
const numeric=n=>Number(String(n??0).match(/-?\d+(?:\.\d+)?/)?.[0]||0);
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function unitQuantity(q,u='份'){
 u=({g:'克',公克:'克',kg:'千克',公斤:'千克',ml:'毫升',l:'升',只:'个',枚:'个',颗:'个'})[String(u).toLowerCase()]||u;
 return u==='千克'?[q*1000,'克']:u==='升'?[q*1000,'毫升']:[q,String(u).slice(0,10)];
}
function ingredient(i){
 if(!i||typeof i!=='object')return null;
 const [quantity,unit]=unitQuantity(numeric(i.quantity),i.unit||'份'),estimate=numeric(i.estimate),name=String(i.name||'').trim().slice(0,32);
 if(!name||quantity<=0||estimate<0)return null;
 return {name,category:['蔬菜水果','肉蛋海鲜','主食调味','其他'].includes(i.category)?i.category:'其他',quantity:round(quantity),unit,estimate:round(estimate)};
}
function normalizeDish(d){
 const name=String(d?.name||'').trim().slice(0,40);
 const ingredients=(Array.isArray(d?.ingredients)?d.ingredients:[]).map(ingredient).filter(Boolean).filter(i=>!staples.includes(i.name));
 if(!name||!ingredients.length)throw Error('Incomplete recipe');
 return {name,note:String(d.note||'家常搭配').slice(0,80),photo_query:String(d.photo_query||name).slice(0,80),ingredients};
}
function normalizeMenu(out,context){
 if(!Array.isArray(out.days)||out.days.length!==7)throw Error('Incomplete week');
 const week=days.map((label,d)=>{
  const raw=out.days[d]?.meals;if(!Array.isArray(raw)||raw.length!==3)throw Error('Incomplete meals');
  return {key:`day-${d}`,label,meals:meals.map((title,m)=>{
   const servings=(context.participants||[]).filter(p=>Array.isArray(p.participation?.[label])&&p.participation[label].includes(title)).length;
   const meal=raw.find(i=>i.type===title)||raw[m];
   const dishes=servings?(Array.isArray(meal?.dishes)?meal.dishes:[]).slice(0,4).map(normalizeDish):[];
   if(servings&&!dishes.length)throw Error('Missing dishes');
   return {title,servings,dishes};
  })};
 });
 const balances=(context.inventory?.ingredients||[]).map(value=>{
  const text=String(value).trim(),hit=text.match(/^(.+?)\s*(\d+(?:\.\d+)?)\s*(kg|千克|公斤|g|克|公克|ml|毫升|l|升|个|只|枚|颗|盒|袋|瓶|份)?$/i);
  if(!hit)return {name:text,unknown:true,quantity:0,unit:''};
  const [quantity,unit]=unitQuantity(Number(hit[2]),hit[3]||'份');return {name:hit[1].trim(),quantity,unit};
 });
 const canonical=n=>n.replaceAll('西红柿','番茄').replaceAll('鸡蛋','蛋').trim();
 const same=(a,b)=>{a=canonical(a);b=canonical(b);return a===b||(a.length>=2&&b.includes(a))||(b.length>=2&&a.includes(b));};
 for(const day of week)for(const meal of day.meals)for(const dish of meal.dishes){
  dish.ingredients=dish.ingredients.flatMap(i=>{
   const balance=balances.find(b=>same(i.name,b.name));let quantity=i.quantity,estimate=i.estimate;
   if(balance?.unknown){balance.unknown=false;return [];}
   if(balance&&balance.unit===i.unit&&balance.quantity>0){const used=Math.min(quantity,balance.quantity);estimate*=1-used/quantity;quantity-=used;balance.quantity-=used;}
   return quantity>0?[{...i,quantity:round(quantity),estimate:round(estimate)}]:[];
  });
 }
 const merged=new Map();
 for(const day of week)for(const meal of day.meals)for(const dish of meal.dishes)for(const i of dish.ingredients){
  const key=i.name+'|'+i.unit,source=`${day.label}${meal.title}·${dish.name}`;
  if(!merged.has(key))merged.set(key,{...i,sources:[source]});else{const row=merged.get(key);row.quantity=round(row.quantity+i.quantity);row.estimate=round(row.estimate+i.estimate);if(!row.sources.includes(source))row.sources.push(source);}
 }
 const shopping=[...merged.values()].map((i,n)=>({id:`generated-${n+1}`,...i,actual:null,bought:false}));
 const budget=Math.max(0,numeric(context.budget?.amount)),currency=context.budget?.currency==='CNY'?'CNY':'HKD',total=round(shopping.reduce((sum,i)=>sum+i.estimate,0));
 return {summary:`这周的三餐已经安排好了，预计采购约 ${currency==='HKD'?'HK$':'¥'}${total.toFixed(0)}。`,week,shopping,budget_plan:{currency,budget,planned_total:total,target_min:round(budget*.92),target_max:round(budget*.98)}};
}
async function model(env,system,payload,max_tokens=1600){
 if(!env.API_KEY)throw Error('Missing server configuration');
 const response=await fetch(`${env.API_BASE||'https://api.deepseek.com'}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.API_KEY}`},body:JSON.stringify({model:env.TEXT_MODEL||'deepseek-flash',messages:[{role:'system',content:system},{role:'user',content:typeof payload==='string'?payload:JSON.stringify(payload)}],thinking:{type:'disabled'},temperature:0,max_tokens,response_format:{type:'json_object'}}),signal:AbortSignal.timeout(100000)});
 if(!response.ok)throw Error('AI request unavailable');
 const data=await response.json(),content=data.choices?.[0]?.message?.content;
 if(typeof content==='object'&&content)return content;
 return JSON.parse(String(content||'').replace(/^```(?:json)?\s*|\s*```$/g,''));
}
const limits=new Map();
let fxCache=null;
async function displayExchangeRates(){
 if(fxCache&&Date.now()-fxCache.fetchedAt<3600000)return fxCache.data;
 try{
  const response=await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',{signal:AbortSignal.timeout(4000)});
  if(!response.ok)throw Error('Rates unavailable');
  const xml=await response.text(),values=Object.fromEntries([...xml.matchAll(/currency=['"]([A-Z]+)['"]\s+rate=['"]([\d.]+)['"]/g)].map(m=>[m[1],Number(m[2])]));
  if(!['CNY','HKD','USD'].every(c=>values[c]>0))throw Error('Missing currency');
  const data={base:'CNY',rates:{CNY:1,HKD:values.HKD/values.CNY,USD:values.USD/values.CNY},date:xml.match(/time=['"]([\d-]+)['"]/)?.[1]||null,source:'ecb'};
  fxCache={data,fetchedAt:Date.now()};return data;
 }catch{return fxCache?{...fxCache.data,source:'cached'}:{base:'CNY',rates:null,date:null,source:'unavailable'};}
}
export async function kitchenApi(request,env){
 const url=new URL(request.url),route=url.pathname;
 if(route==='/api/status')return json({api_configured:!!env.API_KEY,provider:'deepseek'});
 if(route==='/api/locale'){const country=request.cf?.country||request.headers.get('cf-ipcountry')||request.headers.get('x-vercel-ip-country')||'';return json({country_code:/^[A-Z]{2}$/.test(country)?country:'',city:request.cf?.city||'',source:country?'ip':'unavailable'});}
 if(route==='/api/exchange-rates')return json(await displayExchangeRates());
 if(route==='/api/config')return json({error:'连接设置由维护者在云端后端管理。'},403);
 if(route==='/api/dish-image'){
  try{
   const name=(url.searchParams.get('query')||url.searchParams.get('name')||'').slice(0,80);
   const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',generator:'search',gsrsearch:name+' filetype:bitmap',gsrnamespace:'6',gsrlimit:'5',prop:'imageinfo',iiprop:'url',iiurlwidth:'720',origin:'*'});
   const response=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{headers:{'User-Agent':'AIHomeKitchenAssistant/1.0'},signal:AbortSignal.timeout(6000)});
   const data=await response.json();
   const page=data.query?.pages?.find(p=>!/(collage|illustration|cartoon|insect|caterpillar|logo)/i.test(p.title)&&p.imageinfo?.[0]?.thumburl);
   return json(page?{url:page.imageinfo[0].thumburl,source_url:page.imageinfo[0].descriptionurl,credit:'Wikimedia Commons'}:{url:null});
  }catch{return json({url:null});}
 }
 if(request.method!=='POST')return json({error:'暂时找不到这个功能。'},404);
 try{
  const ip=request.headers.get('cf-connecting-ip')||'anonymous',now=Date.now(),limit=limits.get(ip)||{count:0,start:now};
  if(now-limit.start>3600000){limit.count=0;limit.start=now;}limit.count++;limits.set(ip,limit);
  if(limit.count>60)return json({error:'厨房有点忙，请稍后再试。'},429);
  if(Number(request.headers.get('content-length'))>3000000)return json({error:'照片较大，请换一张小一点的照片。'},413);
  const text=await request.text();if(text.length>3000000)return json({error:'内容过长，请精简后再试。'},413);
  const payload=JSON.parse(text),context=payload.context||{};
  if(route==='/api/generate-menu'){
   if(!Array.isArray(context.participants)||!context.participants.length)return json({error:'请先添加一位用餐人员。'},400);
   let last;for(let attempt=0;attempt<2;attempt++){try{return json(normalizeMenu(await model(env,prompts.menu,{household_context:context,optional_request:String(payload.request||'').slice(0,3000)},12000),context));}catch(e){last=e;}}
   throw last;
  }
  if(route==='/api/parse-voice'){
   const out=await model(env,prompts.voice,{existing_people:payload.people||[],family_request:String(payload.text||'').slice(0,3000)},3000);
   return json({people:Array.isArray(out.people)?out.people:[]});
  }
  if(route==='/api/recommend-replacements'){
   const out=await model(env,prompts.replacement,{family_context:context,current_dish:payload.dish,excluded:payload.excluded||[]},3500);
   const options=(out.options||[]).slice(0,3).map(normalizeDish);if(options.length!==3)throw Error('Incomplete options');return json({options});
  }
  if(route==='/api/chat'){
   const out=await model(env,prompts.chat,{request:String(payload.message||'').slice(0,3000),household_context:context,history:payload.history?.slice(-8)||[]});
   return json({reply:String(out.reply||'好的，我记下了。').slice(0,400),ready_for_menu:!!out.ready_for_menu,missing:Array.isArray(out.missing)?out.missing.slice(0,3):[]});
  }
  if(route==='/api/vision')return json({error:'当前对话服务暂不支持照片识别，你可以先手动填写已有食材。'},503);
  return json({error:'暂时找不到这个功能。'},404);
 }catch{return json({error:'厨房助手这次没接稳，请稍后再试。'},503);}
}
