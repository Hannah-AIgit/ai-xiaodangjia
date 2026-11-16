(function(){
 const config=window.APP_CONFIG;
 const parse=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key));return value??fallback;}catch(_){return fallback;}};
 const write=(key,value)=>{localStorage.setItem(key,JSON.stringify(value));window.dispatchEvent(new CustomEvent('kitchen-state-change',{detail:{key,value}}));return value;};
 const initialMembership=()=>({plan:'basic',trialStartedAt:new Date().toISOString(),trialDays:config.membership.trialDays,simulated:true});
 const membership=()=>{const key=config.storage.membership;const saved=parse(key,null);return saved||write(key,initialMembership());};
 const setPlan=plan=>write(config.storage.membership,{...membership(),plan,updatedAt:new Date().toISOString(),simulated:true});
 const trialDaysLeft=()=>{const started=new Date(membership().trialStartedAt).getTime(),duration=config.membership.trialDays*86400000,now=Date.now();if(!Number.isFinite(started)||started>now)return 0;return Math.max(0,Math.ceil((started+duration-now)/86400000));};
 const isTrialActive=()=>membership().plan!=='plus'&&trialDaysLeft()>0;
 const hasPlusAccess=()=>membership().plan==='plus'||isTrialActive();
 const isPlus=hasPlusAccess; // Shared entitlement check used by every feature gate, including Home Chef.
 const shopping=()=>parse(config.storage.shopping,{items:[],budget:{currency:config.pricing.defaultCurrency||'HKD',amount:0}});
 const saveShopping=value=>write(config.storage.shopping,value);
 const markPurchased=(ingredient,actualPrice)=>{
  const data=shopping();const key=`${ingredient.name}|${ingredient.unit}`;
  let item=data.items.find(row=>`${row.name}|${row.unit}`===key)||data.items.find(row=>row.name===ingredient.name);
  if(!item){item={id:`recipe-${Date.now()}`,name:ingredient.name,category:ingredient.category||'其他',quantity:Number(ingredient.quantity)||1,unit:ingredient.unit||'份',estimate:Number(ingredient.estimate)||0,actual:null,bought:false,sources:ingredient.sources||[]};data.items.push(item);}
  item.bought=true;item.actual=Number.isFinite(Number(actualPrice))?Number(actualPrice):Number(item.estimate)||Number(ingredient.estimate)||0;
  saveShopping(data);return item;
 };
 const inventory=()=>parse(config.storage.inventory,{items:[
  {id:'milk',name:'牛奶',quantity:'500ml',expiresInDays:2},
  {id:'tomato',name:'番茄',quantity:'3 个',expiresInDays:3},
 ]});
 const saveInventory=value=>write(config.storage.inventory,value);
 const bookings=()=>parse(config.storage.bookings,[]);
 const addBooking=value=>{const next=[value,...bookings()];write(config.storage.bookings,next);return value;};
 const weeklyMenu=()=>parse(config.storage.weeklyMenu,[]);
 const currencySymbol=currency=>currency==='CNY'?'¥':'HK$';
 window.KitchenState={config,membership,isPlus,hasPlusAccess,isTrialActive,setPlan,trialDaysLeft,shopping,saveShopping,markPurchased,inventory,saveInventory,bookings,addBooking,weeklyMenu,currencySymbol,read:parse,write};
})();
