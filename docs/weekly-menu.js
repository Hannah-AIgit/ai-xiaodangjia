const weeklyMeals = [
  [['燕麦水果杯','轻松开始'],['鸡蛋吐司','10 分钟'],['温牛奶','长者友好'], ['鸡丝蔬菜汤面','少盐'],['凉拌黄瓜','清爽配菜'],['苹果','饭后水果'], ['清蒸鲈鱼','主菜 · 20 分钟'],['蒜蓉西兰花','配菜 · 10 分钟'],['紫菜豆腐汤','汤品'],['米饭','主食']],
  [['南瓜小米粥','温和易消化'],['煎蛋','10 分钟'],['番茄牛肉饭','家常菜'],['清炒生菜','配菜'],['冬菇蒸鸡','主菜'],['清炒菜心','配菜'],['玉米胡萝卜汤','汤品'],['米饭','主食']],
  [['酸奶水果碗','快手菜'],['全麦面包','主食'],['虾仁蒸蛋','蛋白质'],['蒜蓉油麦菜','配菜'],['番茄豆腐煲','主菜'],['清炒芥兰','配菜'],['莲藕排骨汤','汤品'],['米饭','主食']],
  [['豆浆油条','早餐组合'],['水煮蛋','10 分钟'],['青菜肉丝面','家常菜'],['凉拌番茄','配菜'],['白灼虾','主菜'],['蒜蓉娃娃菜','配菜'],['冬瓜排骨汤','汤品'],['米饭','主食']],
  [['玉米粥','温和易消化'],['香蕉','水果'],['香菇鸡肉饭','午餐'],['清炒西葫芦','配菜'],['番茄炖牛腩','主菜'],['清炒菜心','配菜'],['紫菜蛋花汤','汤品'],['米饭','主食']],
  [['全麦三明治','快手菜'],['热牛奶','早餐'],['三文鱼拌饭','午餐'],['海带豆腐汤','汤品'],['豉汁蒸排骨','主菜'],['蚝油生菜','配菜'],['玉米胡萝卜汤','汤品'],['米饭','主食']],
  [['红薯小米粥','早餐'],['蒸鸡蛋','长者友好'],['云吞面','午餐'],['白灼菜心','配菜'],['香菇滑鸡','主菜'],['清炒时蔬','配菜'],['番茄豆腐汤','汤品'],['米饭','主食']],
];
const WEEKLY_STORAGE_KEY='kitchen-weekly-menu-v1';
const WEEKLY_MESSAGE_KEY='kitchen-weekly-menu-message-v1';
const SHOPPING_STORAGE_KEY='kitchen-shopping-v1';
const PLANNING_CONTEXT_KEY='kitchen-planning-context-v1';
const FALLBACK_DISH_PHOTO='assets/real-food-fallback-v1.png';
const BUILD_VERSION='20261115-5';
const dishPhotoCache=new Map();
const curatedDishPhotos=[
 {test:/酸奶|水果碗/,url:'assets/curated-food/yogurt-fruit.jpg',source:'https://www.pexels.com/photo/a-bowl-with-fruits-and-yogurt-8257438/',credit:'Pexels · Valeriya Kobzar'},
 {test:/燕麦|小米粥|玉米粥|红薯.*粥|南瓜.*粥/,url:'assets/curated-food/oatmeal-fruit.jpg',source:'https://www.pexels.com/photo/healthy-breakfast-bowl-with-oatmeal-and-fruits-4220141/',credit:'Pexels · Javier Disabato'},
 {test:/吐司|三明治|全麦面包|煎蛋/,url:'assets/curated-food/egg-toast.jpg',source:'https://www.pexels.com/photo/close-up-photo-of-toast-with-sunny-side-up-egg-5589041/',credit:'Pexels · Antoni Shkraba'},
 {test:/牛奶|豆浆/,url:'assets/curated-food/milk-breakfast.jpg',source:'https://www.pexels.com/photo/a-jar-of-jam-and-a-glass-of-milk-5590969/',credit:'Pexels · cottonbro studio'},
 {test:/照烧/,url:'assets/curated-food/teriyaki-chicken.jpg',source:'https://www.pexels.com/photo/delicious-teriyaki-chicken-rice-bowl-close-up-28442544/',credit:'Pexels · Nadin Sh'},
 {test:/三文鱼|烤鱼排/,url:'assets/curated-food/salmon-vegetables.jpg',source:'https://www.pexels.com/photo/cooked-meat-with-vegetables-725991/',credit:'Pexels · Daniela Elena Tentis'},
 {test:/鲈鱼|清蒸.*鱼|蒸鱼|白灼鱼/,url:'assets/curated-food/steamed-fish.jpg',source:'https://www.pexels.com/photo/meat-and-rice-on-plate-11830200/',credit:'Pexels · Jana Ohajdova'},
 {test:/牛腩|炖牛肉|牛肉煲|牛肉炖|牛肉饭|豉汁蒸排骨/,url:'assets/curated-food/beef-stew.jpg',source:'https://www.pexels.com/photo/delicious-beef-stew-with-vegetables-on-plate-34636462/',credit:'Pexels · Novkov Visuals'},
 {test:/白灼虾|蒜蓉虾|鲜虾/,url:'assets/dish-photos/e4be116c10b6b4198f39dc3a.jpg',source:'https://commons.wikimedia.org/wiki/File:Steamed_Shrimp_%26_Vermicelli_in_Garlic_Sauce_(6955843275).jpg',credit:'Wikimedia Commons'},
 {test:/意面|意大利面|番茄面/,url:'assets/curated-food/tomato-pasta.jpg',source:'https://www.pexels.com/photo/pasta-with-tomato-sauce-sprinkled-with-parmesan-cheese-17375424/',credit:'Pexels · Gonzalo Acuña'},
 {test:/烤鸡|香草鸡/,url:'assets/curated-food/roast-chicken.jpg',source:'https://www.pexels.com/photo/hand-holding-plate-with-food-and-spoon-18476569/',credit:'Pexels · Karography'},
 {test:/鸡.*饭|蒸鸡|滑鸡|鸡腿饭|鸡肉/,url:'assets/curated-food/chicken-rice.jpg',source:'https://www.pexels.com/photo/rice-bowl-with-cooked-chicken-on-top-12916874/',credit:'Pexels · Denys Gromov'},
 {test:/拉面|汤面|云吞面|肉丝面|面条/,url:'assets/curated-food/ramen.jpg',source:'https://www.pexels.com/photo/soup-in-bowl-16446205/',credit:'Pexels · Nadin Sh'},
 {test:/虾仁蒸蛋/,url:'assets/dish-photos/c94460d2df41afaec7e47096.jpg',source:'https://commons.wikimedia.org/wiki/File:Baby_shrimp_with_scrambled_egg.jpg',credit:'Wikimedia Commons'},
 {test:/豆腐汤|豆腐煲|炖豆腐|味噌汤/,url:'assets/curated-food/tofu-soup.jpg',source:'https://www.pexels.com/photo/vegan-miso-soup-with-tofu-and-mushrooms-35695595/',credit:'Pexels · Paul Seling'},
 {test:/蘑菇汤|菌菇汤/,url:'assets/curated-food/mushroom-soup.jpg',source:'https://www.pexels.com/photo/a-soup-with-mushrooms-served-in-a-restaurant-16077409/',credit:'Pexels · A.V. Phina'},
 {test:/生菜|菜心|油麦菜|芥兰|菠菜|西兰花|西葫芦|青菜|娃娃菜/,url:'assets/curated-food/green-vegetables.jpg',source:'https://www.pexels.com/photo/delicious-stir-fried-chinese-vegetables-on-plate-36108993/',credit:'Pexels · Yuen Tou Zan'},
 {test:/时蔬|烤蔬菜|炒蔬菜|胡萝卜|黄瓜|凉拌番茄|番茄沙拉/,url:'assets/curated-food/vegetable-stir-fry.jpg',source:'https://www.pexels.com/photo/overhead-shot-of-a-dish-with-stir-fried-vegetables-12356565/',credit:'Pexels · Augustinus Martinus Noppé'},
 {test:/^苹果$/,url:'assets/dish-photos/441023d8b98f5a9374e5a4f8.jpg',source:'https://commons.wikimedia.org/wiki/File:Red_Apple.jpg',credit:'Wikimedia Commons'},
 {test:/^香蕉$/,url:'assets/dish-photos/e645754448d0b19a3f42e3dc.jpg',source:'https://commons.wikimedia.org/wiki/File:Cavendish_banana_from_Maracaibo.jpg',credit:'Wikimedia Commons'},
 {test:/^米饭$/,url:'assets/dish-photos/7d312bd6f409dd7cd5c8f6df.jpg',source:'https://commons.wikimedia.org/wiki/File:Steamed_rice_in_bowl_01.jpg',credit:'Wikimedia Commons'},
 {test:/水煮蛋|蒸鸡蛋|蒸蛋|蛋花汤/,url:'assets/dish-photos/39f2061dcde1aebc878bda51.jpg',source:'https://commons.wikimedia.org/wiki/File:Perfectly_Boiled_eggs_picture.JPG',credit:'Wikimedia Commons'},
 {test:/汤|豆腐煲|炖豆腐/,url:'assets/curated-food/vegetable-soup.jpg',source:'https://www.pexels.com/photo/a-soup-in-a-bowl-6978212/',credit:'Pexels · Heather Brock'},
];
const curatedPhotoForDish=name=>curatedDishPhotos.find(item=>item.test.test(String(name||'')))||null;
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dishCost=dish=>(dish.ingredients||[]).reduce((sum,item)=>sum+(Number(item.estimate)||0),0);
function dishMinutes(dish,mealTitle=''){const match=String(dish.note||'').match(/(\d+)\s*分钟/);if(match)return Number(match[1]);if(/粥|奶|水果|面包|吐司|蛋/.test(dish.name))return 15;return mealTitle==='早餐'?20:30;}
function mealMinutes(meal){const values=meal.dishes.filter(dish=>dish.selected!==false).map(dish=>dishMinutes(dish,meal.title));return values.length?Math.max(...values)+Math.max(0,values.length-1)*5:0;}
document.documentElement.dataset.build=BUILD_VERSION;

const weekdayLabels = ['周一','周二','周三','周四','周五','周六','周日'];
function localMonday() {
  const today = new Date();
  const shift = today.getDay() === 0 ? -6 : 1 - today.getDay();
  const monday = new Date(today); monday.setDate(today.getDate() + shift); return monday;
}
const monday = localMonday();
const week = weekdayLabels.map((label, index) => {
  const date = new Date(monday); date.setDate(monday.getDate() + index);
  const dishes = weeklyMeals[index];
  return { key:`day-${index}`, label, date:`${date.getMonth() + 1}/${date.getDate()}`, meals:[
    { title:'早餐', servings:3, status:'pending', dishes:dishes.slice(0, index === 0 ? 3 : 2) },
    { title:'午餐', servings:3, status:'pending', dishes:dishes.slice(index === 0 ? 3 : 2, index === 0 ? 6 : 4) },
    { title:'晚餐', servings:3, status:'pending', dishes:dishes.slice(index === 0 ? 6 : 4) },
  ]};
});

let activeDay = 0;
let nextId = 1;
week.forEach((day) => day.meals.forEach((meal) => { meal.dishes = meal.dishes.map(([name, note]) => ({ id:nextId++, name, note, selected:true })); }));
try{
  const saved=JSON.parse(localStorage.getItem(WEEKLY_STORAGE_KEY));
  if(Array.isArray(saved)&&saved.length===7&&saved.every(day=>Array.isArray(day.meals)))saved.forEach((day,index)=>{week[index].meals=day.meals.map(meal=>({...meal,status:['pending','completed','skipped'].includes(meal.status)?meal.status:'pending'}));});
}catch(_){ /* Keep the sample week. */ }
function linkedShoppingReady(){
 const dishes=week.flatMap(day=>day.meals.flatMap(meal=>meal.dishes));
 return dishes.length>0&&dishes.every(dish=>Array.isArray(dish.ingredients));
}
function syncShoppingFromWeek(){
 if(!linkedShoppingReady())return;
 let previous={items:[],budget:{currency:'HKD',amount:0}};
 try{const saved=JSON.parse(localStorage.getItem(SHOPPING_STORAGE_KEY));if(saved?.budget)previous=saved;}catch(_){}
 const oldByKey=new Map((previous.items||[]).map(item=>[`${item.name}|${item.unit}`,item]));
 const merged=new Map();
 week.forEach(day=>day.meals.filter(meal=>meal.status!=='skipped').forEach(meal=>meal.dishes.filter(dish=>dish.selected!==false).forEach(dish=>(dish.ingredients||[]).forEach(item=>{
  const key=`${item.name}|${item.unit}`;
  if(!merged.has(key))merged.set(key,{name:item.name,category:item.category||'其他',quantity:0,unit:item.unit||'份',estimate:0,sources:[],sourceBreakdown:[]});
  const target=merged.get(key);target.quantity+=Number(item.quantity)||0;target.estimate+=Number(item.estimate)||0;
  const source=`${day.label}${meal.title}·${dish.name}`;if(!target.sources.includes(source))target.sources.push(source);const breakdown=target.sourceBreakdown.find(row=>row.source===source);if(breakdown){breakdown.quantity+=Number(item.quantity)||0;breakdown.estimate+=Number(item.estimate)||0;}else target.sourceBreakdown.push({source,quantity:Number(item.quantity)||0,estimate:Number(item.estimate)||0});
 }))));
 const items=[...merged.entries()].map(([key,item],index)=>{const old=oldByKey.get(key);return {id:old?.id||`menu-${index+1}`,name:item.name,category:item.category,quantity:Number(item.quantity.toFixed(2)),unit:item.unit,estimate:Number(item.estimate.toFixed(2)),sources:item.sources,sourceBreakdown:item.sourceBreakdown.map(row=>({...row,quantity:Number(row.quantity.toFixed(2)),estimate:Number(row.estimate.toFixed(2))})),actual:old?.actual??null,bought:old?.bought??false};});
 const itemKeys=new Set(items.map(item=>`${item.name}|${item.unit}`));
 (previous.items||[]).filter(item=>item.bought&&!itemKeys.has(`${item.name}|${item.unit}`)).forEach(item=>items.push(item));
 localStorage.setItem(SHOPPING_STORAGE_KEY,JSON.stringify({items,budget:previous.budget}));
}
function saveWeek(){try{localStorage.setItem(WEEKLY_STORAGE_KEY,JSON.stringify(week.map(({key,label,meals})=>({key,label,meals}))));syncShoppingFromWeek();}catch(_){}}

const fallbackReplacementOptions={
 '日式':[
  {name:'照烧鸡肉',note:'日式甜咸口',photo_query:'Japanese teriyaki chicken food photograph',ingredients:[{name:'鸡腿肉',category:'肉蛋海鲜',quantity:600,unit:'克',estimate:48},{name:'西兰花',category:'蔬菜水果',quantity:300,unit:'克',estimate:15}]},
  {name:'日式蒸蛋',note:'温和细腻',photo_query:'Japanese chawanmushi food photograph',ingredients:[{name:'鸡蛋',category:'肉蛋海鲜',quantity:4,unit:'个',estimate:12},{name:'香菇',category:'蔬菜水果',quantity:120,unit:'克',estimate:10}]},
  {name:'胡麻菠菜',note:'清爽日式小菜',photo_query:'Japanese spinach goma ae food photograph',ingredients:[{name:'菠菜',category:'蔬菜水果',quantity:500,unit:'克',estimate:20},{name:'芝麻酱',category:'主食调味',quantity:1,unit:'瓶',estimate:22}]},
  {name:'味噌烤三文鱼',note:'日式鲜香主菜',photo_query:'Japanese miso glazed salmon food photograph',ingredients:[{name:'三文鱼',category:'肉蛋海鲜',quantity:500,unit:'克',estimate:120},{name:'味噌',category:'主食调味',quantity:1,unit:'盒',estimate:28}]},
 ],
 '西餐':[
  {name:'香草烤鸡',note:'西式香草风味',photo_query:'Western herb roasted chicken food photograph',ingredients:[{name:'鸡腿肉',category:'肉蛋海鲜',quantity:700,unit:'克',estimate:56},{name:'新鲜香草',category:'蔬菜水果',quantity:1,unit:'份',estimate:15}]},
  {name:'番茄意面',note:'简单经典西餐',photo_query:'tomato pasta food photograph',ingredients:[{name:'意大利面',category:'主食调味',quantity:500,unit:'克',estimate:22},{name:'番茄',category:'蔬菜水果',quantity:700,unit:'克',estimate:21}]},
  {name:'地中海烤时蔬',note:'西式清爽配菜',photo_query:'Mediterranean roasted vegetables food photograph',ingredients:[{name:'彩椒',category:'蔬菜水果',quantity:3,unit:'个',estimate:24},{name:'西葫芦',category:'蔬菜水果',quantity:500,unit:'克',estimate:16}]},
  {name:'奶油蘑菇汤',note:'浓香西式汤品',photo_query:'cream of mushroom soup food photograph',ingredients:[{name:'鲜蘑菇',category:'蔬菜水果',quantity:500,unit:'克',estimate:35},{name:'淡奶油',category:'其他',quantity:250,unit:'毫升',estimate:28}]},
 ],
 '默认':[
  {name:'番茄炖豆腐',note:'家常温和',photo_query:'tomato tofu stew food photograph',ingredients:[{name:'番茄',category:'蔬菜水果',quantity:500,unit:'克',estimate:15},{name:'嫩豆腐',category:'其他',quantity:400,unit:'克',estimate:12}]},
  {name:'香菇蒸鸡',note:'家常鲜香',photo_query:'steamed chicken mushroom Chinese food photograph',ingredients:[{name:'鸡腿肉',category:'肉蛋海鲜',quantity:600,unit:'克',estimate:42},{name:'鲜香菇',category:'蔬菜水果',quantity:200,unit:'克',estimate:16}]},
  {name:'莲藕排骨汤',note:'温暖汤品',photo_query:'lotus root pork rib soup food photograph',ingredients:[{name:'排骨',category:'肉蛋海鲜',quantity:700,unit:'克',estimate:55},{name:'莲藕',category:'蔬菜水果',quantity:600,unit:'克',estimate:18}]},
  {name:'清蒸鲈鱼',note:'清淡主菜',photo_query:'Chinese steamed fish food photograph',ingredients:[{name:'鲈鱼',category:'肉蛋海鲜',quantity:1,unit:'条',estimate:68},{name:'香葱',category:'蔬菜水果',quantity:1,unit:'把',estimate:6}]},
 ]
};
function fitReplacementIngredients(option,servings,previousTotal){
 const base=(option.ingredients||[]).map(item=>({...item}));const servingFactor=Math.max(1,Number(servings)||1)/3;
 base.forEach(item=>{item.quantity=Number(((Number(item.quantity)||1)*servingFactor).toFixed(2));item.estimate=Number(((Number(item.estimate)||0)*servingFactor).toFixed(2));});
 const raw=base.reduce((sum,item)=>sum+item.estimate,0);const costFactor=raw&&previousTotal>0?previousTotal/raw:1;base.forEach(item=>{item.estimate=Number((item.estimate*costFactor).toFixed(2));});return base;
}

const tabs = document.querySelector('#dayTabs');
const hint = document.querySelector('#dayHint');
const mealSections = document.querySelector('#mealSections');
const panel = document.querySelector('#replacePanel');
const toast = document.querySelector('#toast');
const intro = document.querySelector('#menuIntro');
try{const message=localStorage.getItem(WEEKLY_MESSAGE_KEY);if(message){intro.textContent=message;intro.hidden=false;}}catch(_){}
let isDraggingDays = false;
let lastDayPointerX = 0;
let suppressDayClick = false;

tabs.addEventListener('wheel', (event) => {
  if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
    event.preventDefault();
    tabs.scrollLeft += event.deltaY;
  }
}, { passive:false });
tabs.addEventListener('pointerdown', (event) => {
  isDraggingDays = true;
  lastDayPointerX = event.clientX;
});
tabs.addEventListener('pointermove', (event) => {
  if (!isDraggingDays) return;
  const distance = lastDayPointerX - event.clientX;
  if (Math.abs(distance) < 4) return;
  suppressDayClick = true;
  tabs.scrollLeft += distance;
  lastDayPointerX = event.clientX;
});
tabs.addEventListener('pointerup', () => {
  isDraggingDays = false;
  window.setTimeout(() => { suppressDayClick = false; }, 0);
});
tabs.addEventListener('pointercancel', () => { isDraggingDays = false; suppressDayClick = false; });

function render() {
  const day = week[activeDay];
  tabs.innerHTML = week.map((item, index) => `<button class="day-tab ${index === activeDay ? 'active' : ''}" type="button" data-day="${index}"><strong>${item.label}</strong><small>${item.date}</small></button>`).join('');
  tabs.querySelectorAll('[data-day]').forEach((button) => button.addEventListener('click', () => {
    if (suppressDayClick) return;
    activeDay = Number(button.dataset.day);
    render();
    document.querySelector('.day-tab.active').scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
  }));
  hint.textContent = `${day.label}的三餐会依序向下显示 · 默认菜品已加入采购统计 · 真实餐图版`;
  mealSections.innerHTML = day.meals.map((meal, mealIndex) => renderMeal(meal, mealIndex)).join('');
  bindMealActions();
  hydrateDishPhotos();
}

function renderMeal(meal, mealIndex) {
  const status=['pending','completed','skipped'].includes(meal.status)?meal.status:'pending';
  const selectedCount = meal.dishes.filter((dish) => dish.selected!==false).length;
  const statusBadge=status==='completed'?'<b class="meal-status-badge completed">✓ 已完成</b>':status==='skipped'?'<b class="meal-status-badge skipped">已跳过</b>':'';
  const statusActions=status==='pending'?'<button type="button" data-meal-action="completed">✓ 完成这顿</button><button type="button" data-meal-action="skipped">跳过</button>':'<button type="button" data-meal-action="pending">恢复待进行</button>';
  return `<section class="meal status-${status}" data-meal-section="${mealIndex}"><header class="meal-heading"><div><h2>${escapeHtml(meal.title)}</h2>${statusBadge}<small class="meal-duration">⏱ 制作约 ${mealMinutes(meal)} 分钟</small></div><span>${meal.servings} 人份 · ${meal.dishes.length} 道菜</span></header><div class="meal-state-actions">${statusActions}</div><div class="dish-grid">${meal.dishes.map((dish) => {const name=escapeHtml(dish.name),note=escapeHtml(dish.note),query=escapeHtml(dish.photoQuery||dish.photo_query||dish.name),cost=dishCost(dish),stock=cost<=0,minutes=dishMinutes(dish,meal.title);return `<article class="dish-card ${dish.selected!==false ? '' : 'unselected'}" data-meal="${mealIndex}" data-dish="${dish.id}"><div class="dish-image"><img class="dish-photo" src="${FALLBACK_DISH_PHOTO}" data-dish-name="${name}" data-photo-query="${query}" alt="${name}的真实餐图" loading="eager" referrerpolicy="no-referrer"/><a class="photo-credit" href="#" target="_blank" rel="noreferrer" hidden>图源</a><button class="check" type="button" aria-label="切换是否选中">${dish.selected!==false ? '✓' : '+'}</button><button class="dish-action delete" type="button" aria-label="删除菜品">×</button></div><div class="dish-body"><h3>${name}</h3><p>${note}</p><small class="dish-duration">⏱ ${minutes} 分钟</small><div class="dish-cost"><b>预计 ${money(cost)}</b><span class="${stock?'stock':'buy'}">${stock?'使用库存':`需补购 ${money(cost)}`}</span></div><div class="dish-buttons"><button class="replace" type="button">更换</button><button class="recipe-open" type="button">查看做法</button></div></div></article>`;}).join('')}</div><div class="meal-summary"><strong>${status==='completed'?'✅':status==='skipped'?'⏭️':'🍽️'}</strong><span>${status==='completed'?'这顿已完成，记录和预算都会保留':status==='skipped'?'未购买的专属食材已从清单移除':`${selectedCount} 道菜已选中`}</span></div><p class="grocery-note">${status==='pending'?'取消勾选会同步更新采购清单。':'已购买食材的实际支出不会因完成或跳过餐次而消失。'}</p></section>`;
}

function currency(){try{return JSON.parse(localStorage.getItem(SHOPPING_STORAGE_KEY))?.budget?.currency||'HKD';}catch(_){return 'HKD';}}
function money(value){return `${currency()==='HKD'?'HK$':'¥'}${Number(value||0).toLocaleString('zh-CN',{maximumFractionDigits:2})}`;}

async function hydrateDishPhotos(){
 await Promise.all([...document.querySelectorAll('.dish-photo')].map(async image=>{
  const name=image.dataset.dishName,query=image.dataset.photoQuery||name;if(!name)return;
  const curated=curatedPhotoForDish(name);
  if(curated){const credit=image.parentElement.querySelector('.photo-credit');image.src=curated.url;credit.href=curated.source;credit.textContent='图源';credit.title=curated.credit;credit.hidden=false;image.onerror=()=>{image.onerror=null;image.src=FALLBACK_DISH_PHOTO;credit.hidden=true;};return;}
  const cacheKey=`${name}|${query}`;let photo=dishPhotoCache.get(cacheKey);
  if(photo===undefined){
   try{const response=await fetch(`/api/dish-image?name=${encodeURIComponent(name)}&query=${encodeURIComponent(query)}`);photo=response.ok?await response.json():null;}catch(_){photo=null;}
   dishPhotoCache.set(cacheKey,photo);
  }
  if(photo?.url){image.src=photo.url;const credit=image.parentElement.querySelector('.photo-credit');credit.href=photo.source_url||photo.url;credit.textContent='图源';credit.title=photo.credit||'图片来源';credit.hidden=false;}
  image.onerror=()=>{image.onerror=null;image.src=FALLBACK_DISH_PHOTO;image.parentElement.querySelector('.photo-credit').hidden=true;};
 }));
}

function bindMealActions() {
  document.querySelectorAll('[data-meal-section]').forEach(section=>section.querySelectorAll('[data-meal-action]').forEach(button=>button.addEventListener('click',()=>{
    const meal=week[activeDay].meals[Number(section.dataset.mealSection)];meal.status=button.dataset.mealAction;saveWeek();showToast(meal.status==='completed'?'这顿已记为完成':meal.status==='skipped'?'已跳过这顿，采购清单已重算':'已恢复为待进行');render();
  })));
  document.querySelectorAll('.dish-card').forEach((card) => {
    const meal = week[activeDay].meals[Number(card.dataset.meal)];
    const dish = meal.dishes.find((item) => item.id === Number(card.dataset.dish));
    card.querySelector('.check').addEventListener('click', () => { dish.selected = !dish.selected;saveWeek();render(); });
    card.querySelector('.delete').addEventListener('click', () => deleteDish(meal, dish));
    card.querySelector('.replace').addEventListener('click', () => showReplaceOptions(meal, dish));
    card.querySelector('.recipe-open').addEventListener('click',()=>openRecipe(meal,dish,card.querySelector('.dish-photo').src));
  });
}

const recipeDialog=document.querySelector('#recipeDialog');
const partnerDialog=document.querySelector('#partnerDialog');
const videoDialog=document.querySelector('#videoDialog');
let openRecipeDish=null;
let videoDish=null,selectedVideoPlatform=localStorage.getItem('kitchen-video-platform-v1')||'';
function closeNativeDialog(dialog){if(dialog?.open)dialog.close();}
document.querySelector('[data-close-recipe]').onclick=()=>closeNativeDialog(recipeDialog);
document.querySelector('[data-close-partner]').onclick=()=>closeNativeDialog(partnerDialog);
document.querySelector('[data-close-video]').onclick=()=>closeNativeDialog(videoDialog);
document.querySelector('#sampleProduct').onclick=()=>showToast('这是示例商品页，Demo 暂不跳转第三方平台');
async function openVideoDialog(dish){videoDish=dish;document.querySelector('#videoDishTitle').textContent=`${dish.name} · 视频教学`;videoDialog.showModal();const region=await window.KitchenLocale.detect(),services=window.APP_CONFIG.regionalServices[region.market]||window.APP_CONFIG.regionalServices.GLOBAL,stored=localStorage.getItem('kitchen-video-platform-v1');selectedVideoPlatform=services.video.some(item=>item.id===stored)?stored:(services.video[0]?.id||'youtube');document.querySelector('#videoRegionStatus').textContent=`${region.city||region.country_name||'当前地区'}推荐 · 请选择常用视频平台`;document.querySelector('#videoPlatformList').innerHTML=services.video.map(item=>`<button type="button" class="${item.id===selectedVideoPlatform?'selected':''}" data-video-platform="${item.id}">${escapeHtml(item.name)}</button>`).join('');document.querySelectorAll('[data-video-platform]').forEach(button=>button.onclick=()=>{selectedVideoPlatform=button.dataset.videoPlatform;document.querySelectorAll('[data-video-platform]').forEach(node=>node.classList.toggle('selected',node===button));});}
document.querySelector('#openVideoTutorial').onclick=()=>{if(!videoDish)return;if(document.querySelector('#rememberVideoPlatform').checked)localStorage.setItem('kitchen-video-platform-v1',selectedVideoPlatform);const url=window.KitchenLocale.videoSearch(selectedVideoPlatform,videoDish.name);window.open(url,'_blank','noopener');showToast(`正在打开${document.querySelector('[data-video-platform].selected')?.textContent||'视频平台'}搜索教学`);};
document.querySelector('#recipeVideoOpen').onclick=()=>{if(openRecipeDish)openVideoDialog(openRecipeDish.dish);};
function ingredientPurchased(item){const state=window.KitchenState.shopping();return state.items.some(row=>row.name===item.name&&row.bought);}
function recipeSteps(dish){return [
 `准备并清洗${dish.name}所需食材，按食用大小切好。`,
 '锅具预热，加入少量食用油，将主要食材煎炒至表面熟透。',
 '加入家中已有的酱油、盐或糖调味，中小火继续烹煮。',
 '确认食材完全熟透后装盘，趁热享用。'
 ];}
function renderRecipeIngredients(dish){
 const host=document.querySelector('#recipeIngredients');const items=dish.ingredients||[];
 host.innerHTML=items.length?items.map((item,index)=>{const purchased=ingredientPurchased(item);return `<div class="recipe-ingredient" data-ingredient="${index}"><div><strong>${escapeHtml(item.name)}</strong><small>${Number(item.quantity)||1} ${escapeHtml(item.unit||'份')} · ${money(item.estimate)}</small></div><div><button class="purchased ${purchased?'done':''}" type="button">${purchased?'✓ 已购买':'已购买'}</button><button class="go-buy" type="button">去购买</button></div></div>`;}).join(''):'<p class="empty-recipe">食材均可使用现有库存，无需补购。</p>';
 host.querySelectorAll('[data-ingredient]').forEach(row=>{const item=items[Number(row.dataset.ingredient)];row.querySelector('.purchased').onclick=()=>{window.KitchenState.markPurchased({...item,sources:[`${week[activeDay].label}${openRecipeDish.meal.title}·${dish.name}`]},item.estimate);syncShoppingFromWeek();renderRecipeIngredients(dish);showToast(`${item.name}已计入本周实际支出`);};row.querySelector('.go-buy').onclick=()=>{document.querySelector('#partnerList').innerHTML=window.APP_CONFIG.demoPartners.map(name=>`<span>${escapeHtml(name)}</span>`).join('');partnerDialog.showModal();};});
}
function openRecipe(meal,dish,photo){
 openRecipeDish={meal,dish};document.querySelector('#recipeTitle').textContent=dish.name;document.querySelector('#recipePhoto').src=photo||FALLBACK_DISH_PHOTO;
 document.querySelector('#recipeMeta').innerHTML=`<span>⏱️ 约 25 min</span><span>💰 Estimated Cost ${money(dishCost(dish))}</span><span>👥 ${meal.servings} Diners</span>`;
 renderRecipeIngredients(dish);document.querySelector('#recipeSteps').innerHTML=recipeSteps(dish).map((text,index)=>`<article><span>Step ${index+1}</span><div class="step-placeholder">🍳</div><p>${escapeHtml(text)}</p></article>`).join('');recipeDialog.showModal();
}

function deleteDish(meal, dish) {
  meal.dishes = meal.dishes.filter((item) => item.id !== dish.id);
  saveWeek();
  showToast(`已删除「${dish.name}」`);
  render();
}

const shownReplacementNames=new Map();
function planningContext(){try{return JSON.parse(localStorage.getItem(PLANNING_CONTEXT_KEY))||{};}catch(_){return {};}}
function fallbackOptions(currentDish,excluded){
 const context=planningContext();const cuisines=(context.participants||[]).flatMap(person=>person.preferredCuisines||[]);
 const pools=[];if(cuisines.includes('日式'))pools.push(...fallbackReplacementOptions['日式']);if(cuisines.includes('西餐'))pools.push(...fallbackReplacementOptions['西餐']);pools.push(...fallbackReplacementOptions['默认'],...fallbackReplacementOptions['日式'],...fallbackReplacementOptions['西餐']);
 const unique=[];for(const option of pools)if(option.name!==currentDish&&!excluded.includes(option.name)&&!unique.some(item=>item.name===option.name))unique.push(option);
 return unique.slice(0,3).length===3?unique.slice(0,3):[...unique,...fallbackReplacementOptions['默认'].filter(option=>!unique.some(item=>item.name===option.name))].slice(0,3);
}
async function requestReplacementOptions(meal,dish,excluded){
 try{
  const response=await fetch('/api/recommend-replacements',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({context:planningContext(),dish:{name:dish.name,meal:meal.title,servings:meal.servings},excluded})});
  const data=await response.json();if(response.ok&&Array.isArray(data.options)&&data.options.length===3)return data.options;
 }catch(_){}
 return fallbackOptions(dish.name,excluded);
}
function bindReplacementPanel(meal,dish,options){
 panel.querySelector('.close-panel').addEventListener('click',()=>{panel.hidden=true;});
 panel.querySelector('.refresh-replacements').addEventListener('click',()=>loadReplacementPanel(meal,dish,true));
 panel.querySelectorAll('[data-option-index]').forEach(button=>button.addEventListener('click',()=>{
  const option=options[Number(button.dataset.optionIndex)];const previousTotal=(dish.ingredients||[]).reduce((sum,item)=>sum+(Number(item.estimate)||0),0);
  dish.name=option.name;dish.note=option.note||'符合家庭偏好';dish.photoQuery=option.photo_query||option.name;dish.ingredients=fitReplacementIngredients(option,meal.servings,previousTotal);dish.selected=true;meal.status='pending';saveWeek();panel.hidden=true;showToast('菜品和采购清单都更新了');render();
 }));
}
async function loadReplacementPanel(meal,dish,refresh=false){
 const key=String(dish.id);const excluded=[...(shownReplacementNames.get(key)||[])];if(refresh)showToast('正在换一批更合适的菜');
 panel.hidden=false;panel.innerHTML=`<button class="close-panel" type="button">关闭</button><h3>想把「${escapeHtml(dish.name)}」换成什么？</h3><p class="replacement-loading">正在按家人的菜系、口味和忌口挑选…</p>`;panel.querySelector('.close-panel').addEventListener('click',()=>{panel.hidden=true;});
 const options=await requestReplacementOptions(meal,dish,excluded);shownReplacementNames.set(key,[...new Set([...excluded,...options.map(option=>option.name)])]);
 panel.innerHTML=`<button class="close-panel" type="button">关闭</button><h3>想把「${escapeHtml(dish.name)}」换成什么？</h3><p class="replacement-note">已结合家庭偏好与本餐预算</p><div class="replace-options">${options.map((option,index)=>`<button type="button" data-option-index="${index}"><strong>${escapeHtml(option.name)}</strong><small>${escapeHtml(option.note||'点击更换')}</small></button>`).join('')}</div><button class="refresh-replacements" type="button">↻ 这批不喜欢，换一批</button>`;bindReplacementPanel(meal,dish,options);
}
function showReplaceOptions(meal,dish){loadReplacementPanel(meal,dish,false);}

function showToast(message) { toast.textContent = message; toast.classList.add('show'); window.setTimeout(() => toast.classList.remove('show'), 1900); }
render();
