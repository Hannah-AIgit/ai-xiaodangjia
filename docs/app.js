const chat = document.querySelector('#chat');
const form = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const toggle = document.querySelector('#preferenceToggle');
const panel = document.querySelector('#preferencePanel');
const toast = document.querySelector('#toast');
const peopleList = document.querySelector('#peopleList');
const days = ['周一','周二','周三','周四','周五','周六','周日'];
const meals = ['早餐','午餐','晚餐'];
const cuisines = ['粤菜','湘菜','川菜','浙菜','东北菜','日式','韩式','西餐','家常菜'];
const tasteOptions = ['清淡','偏咸','偏甜','偏辣','酸','少油'];
const defaultStaples = ['大米','食用油','酱油','糖','食盐'];
let nextId = 1;
let voiceAssistedPlan = false;
const people = [];
function newPerson() {
  const id=nextId++;
  return {id,name:`用餐人员${id}`,role:'成人',roleCustom:'',tastes:[],cuisines:[],customTaste:'',customCuisine:'',editingTaste:false,editingCuisine:false,avoid:'',notes:'',schedule:days.map(()=>[true,true,true]),scheduleMode:'all',expanded:true};
}
function esc(value) {return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function addMessage(text, role) {
  const conversation=document.querySelector('#assistantConversation');
  if(conversation)conversation.hidden=false;
  const article=document.createElement('article');article.className=`message ${role==='user'?'user-message':'assistant-message'}`;
  const bubble=document.createElement('p');bubble.textContent=text;
  const avatar=document.createElement('span');avatar.className=`avatar ${role==='user'?'user-avatar':'assistant-avatar'}`;
  avatar.textContent=role==='user'?'🙂':'👩🏻‍🍳';
  if(role==='user') article.append(bubble,avatar);else article.append(avatar,bubble);
  chat.append(article);article.scrollIntoView({behavior:'smooth',block:'end'});
}
function showToast(message) {toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2300);}
function getPerson(id) {return people.find(p=>p.id===Number(id));}
function personSummary(p) {const count=p.schedule.flat().filter(Boolean).length;return `${count}/21 餐参与 · ${p.role==='其他'?p.roleCustom||'其他':p.role}`;}
function chipMarkup(p,key,items) {return items.map(value=>`<button type="button" class="person-chip ${p[key].includes(value)?'selected':''}" data-action="chip" data-group="${key}" data-value="${esc(value)}" aria-pressed="${p[key].includes(value)}">${esc(value)}</button>`).join('');}
function customChipMarkup(p,kind) {
  const isTaste=kind==='Taste';const field=isTaste?'customTaste':'customCuisine';const editing=isTaste?p.editingTaste:p.editingCuisine;const label=isTaste?'口味':'菜系';
  if(editing||p[field])return `<span class="custom-chip-editor"><span aria-hidden="true">＋</span><input data-field="${field}" value="${esc(p[field])}" aria-label="编辑自定义${label}" /></span>`;
  return `<button type="button" class="person-chip add-custom-chip" data-action="editCustom${kind}">＋ 自定义</button>`;
}
function renderPeople() {
  peopleList.innerHTML=people.map((p,i)=>`<article class="person-card" data-id="${p.id}">
    <div class="person-bar"><span class="person-number">${i+1}</span><span class="person-head-copy"><input class="person-name-input" data-field="name" maxlength="30" value="${esc(p.name)}" aria-label="编辑用餐人员${i+1}称呼" /><small>${esc(personSummary(p))}</small></span><button type="button" class="person-expand" data-action="expand" aria-expanded="${p.expanded}" aria-label="${p.expanded?'收起':'展开'}${esc(p.name)}"><span class="chevron">${p.expanded?'⌃':'⌄'}</span></button><button type="button" class="remove-person" data-action="remove" aria-label="删除${esc(p.name)}">删除</button></div>
    ${p.expanded?`<div class="person-body">
      <label class="full-field">身份<select data-field="role">${['成人','儿童','长者','学生','上班族','其他'].map(r=>`<option value="${r}" ${p.role===r?'selected':''}>${r}</option>`).join('')}</select></label>
      ${p.role==='其他'?`<label class="full-field">自定义身份<input data-field="roleCustom" value="${esc(p.roleCustom)}" placeholder="例如：访客" /></label>`:''}
      <div class="person-subheading">口味偏好 <small>可多选</small></div><div class="chips">${chipMarkup(p,'tastes',tasteOptions)}${customChipMarkup(p,'Taste')}</div>
      <div class="person-subheading">喜欢的菜系 <small>可多选</small></div><div class="chips">${chipMarkup(p,'cuisines',cuisines)}${customChipMarkup(p,'Cuisine')}</div>
      <label class="full-field">个人忌口 / 过敏原<textarea rows="2" data-field="avoid" placeholder="例如：不吃香菜；花生过敏">${esc(p.avoid)}</textarea></label>
      <label class="full-field">个人补充偏好<input data-field="notes" value="${esc(p.notes)}" placeholder="例如：不喜欢鱼刺、喜欢汤" /></label>
      <div class="schedule-heading"><strong>本周用餐安排</strong><button type="button" class="schedule-preset ${p.scheduleMode==='all'?'selected':''}" data-action="allMeals">全部参加</button><button type="button" class="schedule-preset ${p.scheduleMode==='weekdayLunch'?'selected':''}" data-action="weekdayLunch">工作日午餐不吃</button><button type="button" class="schedule-preset ${p.scheduleMode==='custom'?'selected':''}" data-action="scheduleCustom">自定义</button></div>
      ${p.scheduleMode==='custom'?`<div class="schedule-wrap"><table class="schedule-table"><thead><tr><th scope="col">日期</th>${meals.map(m=>`<th scope="col">${m}</th>`).join('')}</tr></thead><tbody>${days.map((day,d)=>`<tr><th scope="row">${day}</th>${meals.map((meal,m)=>`<td><label class="meal-switch"><input type="checkbox" data-day="${d}" data-meal="${m}" ${p.schedule[d][m]?'checked':''} aria-label="${esc(p.name)}${day}${meal}是否用餐"/><span aria-hidden="true"></span></label></td>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}
    </div>`:''}
  </article>`).join('');
}
people.push(newPerson(),newPerson());renderPeople();
document.querySelector('#addPerson').addEventListener('click',()=>{if(people.length>=12){showToast('最多可添加12位用餐人员');return;}people.forEach(p=>p.expanded=false);people.push(newPerson());renderPeople();});
peopleList.addEventListener('click',event=>{
  const btn=event.target.closest('button[data-action]');if(!btn)return;
  const card=btn.closest('[data-id]');const p=getPerson(card?.dataset.id);if(!p)return;
  const action=btn.dataset.action;
  if(action==='expand'){p.expanded=!p.expanded;renderPeople();}
  if(action==='remove'){if(people.length===1){showToast('请至少保留1位用餐人员');return;}people.splice(people.indexOf(p),1);renderPeople();}
  if(action==='chip'){const key=btn.dataset.group;const val=btn.dataset.value;p[key]=p[key].includes(val)?p[key].filter(x=>x!==val):[...p[key],val];btn.classList.toggle('selected');btn.setAttribute('aria-pressed',String(p[key].includes(val)));}
  if(action==='editCustomTaste'){p.editingTaste=true;p.customTaste='自定义';renderPeople();const input=peopleList.querySelector(`[data-id="${p.id}"] [data-field="customTaste"]`);input?.focus();input?.select();}
  if(action==='editCustomCuisine'){p.editingCuisine=true;p.customCuisine='自定义';renderPeople();const input=peopleList.querySelector(`[data-id="${p.id}"] [data-field="customCuisine"]`);input?.focus();input?.select();}
  if(action==='allMeals'){p.schedule=days.map(()=>[true,true,true]);p.scheduleMode='all';renderPeople();showToast('已设置该人员全部餐次参加');}
  if(action==='weekdayLunch'){p.schedule=days.map(()=>[true,true,true]);for(let d=0;d<5;d++)p.schedule[d][1]=false;p.scheduleMode='weekdayLunch';renderPeople();showToast('已关闭该人员工作日午餐');}
  if(action==='scheduleCustom'){p.scheduleMode='custom';renderPeople();showToast('可直接调整下方每天的早餐、午餐和晚餐');}
});
peopleList.addEventListener('input',event=>{const field=event.target.dataset.field;if(!field)return;const p=getPerson(event.target.closest('[data-id]')?.dataset.id);if(!p)return;p[field]=event.target.value;});
peopleList.addEventListener('keydown',event=>{if((event.target.dataset.field==='customTaste'||event.target.dataset.field==='customCuisine')&&event.key==='Enter'){event.preventDefault();event.target.blur();}});
peopleList.addEventListener('focusout',event=>{const field=event.target.dataset.field;if(field!=='customTaste'&&field!=='customCuisine')return;const p=getPerson(event.target.closest('[data-id]')?.dataset.id);if(!p)return;const clean=event.target.value.trim();p[field]=clean==='自定义'?'':clean;if(field==='customTaste')p.editingTaste=false;else p.editingCuisine=false;renderPeople();});
peopleList.addEventListener('change',event=>{
 const p=getPerson(event.target.closest('[data-id]')?.dataset.id);if(!p)return;
 if(event.target.dataset.day!==undefined){p.schedule[Number(event.target.dataset.day)][Number(event.target.dataset.meal)]=event.target.checked;p.scheduleMode='custom';const summary=event.target.closest('.person-card').querySelector('.person-head-copy small');summary.textContent=personSummary(p);}
 if(event.target.dataset.field==='role'){p.role=event.target.value;renderPeople();}
});
function assemblePlanningContext(){
 const participants=people.map((p,i)=>({number:i+1,name:p.name||`用餐人员${i+1}`,identity:p.role==='其他'?(p.roleCustom||'其他'):p.role,tastePreferences:[...p.tastes,...(p.customTaste.trim()?[p.customTaste.trim()]:[])],preferredCuisines:[...p.cuisines,...(p.customCuisine.trim()?[p.customCuisine.trim()]:[])],avoidIngredients:p.avoid.trim(),otherPreferences:p.notes.trim(),participation:Object.fromEntries(days.map((day,d)=>[day,meals.filter((_,m)=>p.schedule[d][m])]))}));
 const currency=document.querySelector('#budgetCurrency').value;const amount=document.querySelector('#budgetAmount').value.trim();
 return {participants,budget:{currency,amount:amount||null},sharedNotes:document.querySelector('#sharedNotes').value.trim()};
}
const PLANNING_STORAGE_KEY='kitchen-planning-v1';
const WEEKLY_STORAGE_KEY='kitchen-weekly-menu-v1';
const WEEKLY_MESSAGE_KEY='kitchen-weekly-menu-message-v1';
const SHOPPING_STORAGE_KEY='kitchen-shopping-v1';
const PLANNING_CONTEXT_KEY='kitchen-planning-context-v1';
try{const savedPlan=JSON.parse(localStorage.getItem(PLANNING_STORAGE_KEY));if(savedPlan&&['CNY','HKD'].includes(savedPlan.currency)&&Number.isFinite(savedPlan.amount)&&savedPlan.amount>=0){document.querySelector('#budgetCurrency').value=savedPlan.currency;document.querySelector('#budgetAmount').value=String(savedPlan.amount);}}catch(_){}
function savePlanBudget(){const currency=document.querySelector('#budgetCurrency').value;const amount=Number(document.querySelector('#budgetAmount').value);if(!Number.isFinite(amount)||amount<0)return;try{localStorage.setItem(PLANNING_STORAGE_KEY,JSON.stringify({currency,amount}));const raw=localStorage.getItem(SHOPPING_STORAGE_KEY);if(raw){const saved=JSON.parse(raw);saved.budget={currency,amount};localStorage.setItem(SHOPPING_STORAGE_KEY,JSON.stringify(saved));}window.dispatchEvent(new Event('kitchen-shopping-updated'));refreshBudgetLiveSummary();}catch(_){}}
document.querySelector('#budgetCurrency').addEventListener('change',savePlanBudget);
document.querySelector('#budgetAmount').addEventListener('input',savePlanBudget);
function menuForStorage(week){
 if(!Array.isArray(week)||week.length!==7)throw new Error('这周菜单还没整理完整');
 let id=1;
 return week.map((day,dayIndex)=>{
  if(!day||!Array.isArray(day.meals)||day.meals.length!==3)throw new Error('这周菜单还没整理完整');
  return {key:`day-${dayIndex}`,label:days[dayIndex],meals:day.meals.map((meal,mealIndex)=>({title:meals[mealIndex],servings:Number(meal.servings)||0,status:'pending',dishes:Array.isArray(meal.dishes)?meal.dishes.map(dish=>({id:id++,name:String(dish.name||'').trim(),note:String(dish.note||'家常搭配').trim(),photoQuery:String(dish.photo_query||dish.photoQuery||dish.name||'').trim(),ingredients:Array.isArray(dish.ingredients)?dish.ingredients.map(item=>({name:String(item.name||'').trim(),category:String(item.category||'其他'),quantity:Number(item.quantity)||0,unit:String(item.unit||'份').trim()||'份',estimate:Math.max(0,Number(item.estimate)||0)})).filter(item=>item.name&&item.quantity>0):[],selected:true})).filter(dish=>dish.name):[]}))};
 });
}
function shoppingForStorage(items,budgetPlan){
 const allowed=['蔬菜水果','肉蛋海鲜','主食调味','其他'];
 const normalized=Array.isArray(items)?items.map((item,index)=>({id:String(item.id||`generated-${index+1}`),name:String(item.name||'').trim(),category:allowed.includes(item.category)?item.category:'其他',quantity:Number(item.quantity)||1,unit:String(item.unit||'份').trim()||'份',estimate:Math.max(0,Number(item.estimate)||0),sources:Array.isArray(item.sources)?item.sources.map(String).filter(Boolean):[],actual:null,bought:false})).filter(item=>item.name):[];
 const currency=['CNY','HKD'].includes(budgetPlan?.currency)?budgetPlan.currency:document.querySelector('#budgetCurrency').value;
 const amount=Math.max(0,Number(budgetPlan?.budget)||Number(document.querySelector('#budgetAmount').value)||0);
 return {items:normalized,budget:{currency,amount}};
}
async function generateWeeklyPlan(requestText=''){
 if(voiceAssistedPlan&&!appState.isPlus()){
  addMessage('全家的语音需求已经记下了。升级到 Plus 后，我就能按这些需求安排这周菜单。','assistant');
  openLocked('语音录入和补全可以先体验；使用语音补全后的需求生成食谱需要 Plus。Basic 手动填写偏好后可以直接生成基础食谱。');
  return;
 }
 addMessage('好呀，我正在结合全家的口味、餐次和预算安排这周菜单。','assistant');
 const context=assemblePlanningContext();
 const submit=form.querySelector('button[type="submit"]');
 submit.disabled=true;submit.textContent='正在安排…';showToast('正在为全家安排本周菜单');
 try{
  const fullContext={...context,inventory:{...currentPantry(),assumed_staples:defaultStaples},budget_scope:'只计算本周新买的蔬菜、肉、蛋、奶、水产等食材；默认不计大米、食用油、酱油、糖和食盐'};
  const res=await fetch('/api/generate-menu',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request:requestText,context:fullContext})});
  const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'厨房助手这次没接稳，请稍后再试。');
  localStorage.setItem(PLANNING_CONTEXT_KEY,JSON.stringify(fullContext));
  localStorage.setItem(WEEKLY_STORAGE_KEY,JSON.stringify(menuForStorage(data.week)));
  localStorage.setItem(WEEKLY_MESSAGE_KEY,String(data.summary||'这周的菜单已经安排好了。'));
  localStorage.setItem(SHOPPING_STORAGE_KEY,JSON.stringify(shoppingForStorage(data.shopping,data.budget_plan)));
  window.location.href='weekly-menu.html?generated=1';
 }catch(error){addMessage(error instanceof TypeError?localServiceHelp():(error.message||'厨房助手这次没接稳，请稍后再试。'),'assistant');showToast('资料都保留着，稍后再试即可');submit.disabled=false;submit.textContent='生成食谱 ➜';}
}
form.addEventListener('submit',event=>{
 event.preventDefault();
 const text=input.value.trim();
 if(text){
  addMessage(text,'user');
  const notes=document.querySelector('#sharedNotes');notes.value=[notes.value.trim(),text].filter(Boolean).join('；');input.value='';
 }
 generateWeeklyPlan(text);
});
function localServiceHelp(){return '没有连上这台电脑的服务。请双击项目里的「启动应用.command」，等待网页自动打开后再试。';}
async function refreshApiStatus(){const status=document.getElementById('apiStatus');if(location.protocol==='file:'){status.textContent='请双击「启动应用.command」后使用';return null;}try{const res=await fetch('/api/status',{cache:'no-store'});if(!res.ok)throw new Error();const data=await res.json();status.textContent=data.api_configured?'厨房助手已准备好':'厨房助手暂时未连接，请联系维护者检查后端设置';status.classList.toggle('connected',Boolean(data.api_configured));return data;}catch(_){status.textContent=localServiceHelp();status.classList.remove('connected');return null;}}
refreshApiStatus();
document.querySelector('#navPlan').addEventListener('click',()=>{document.querySelector('#budgetSection').scrollIntoView({behavior:'smooth',block:'start'});showToast('已返回计划设置');});
toggle.addEventListener('click',()=>{const expanded=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!expanded));panel.hidden=expanded;});
document.querySelectorAll('[data-coming-soon]').forEach(btn=>btn.addEventListener('click',()=>showToast(btn.dataset.comingSoon)));
// Voice and visual pantry extension: user confirmation is required before applying extracted data.
let liveRecognition = null;
let keepListening = false;
let voiceBaseText = '';
let voiceCommittedText = '';
let photoDataUrl = null;
let voicePending = null;
let savedPantry = {ingredients:[], prepared_dishes:[]};
const el = id => document.getElementById(id);
const appState=window.KitchenState;
const pricing=window.KitchenPricing;
let selectedExpiryItem=null;
function openDialog(id){const dialog=el(id);if(dialog?.showModal)dialog.showModal();else dialog?.setAttribute('open','');}
function closeDialog(id){const dialog=el(id);if(dialog?.close)dialog.close();else dialog?.removeAttribute('open');}
function openLocked(message){el('lockedMessage').textContent=message;openDialog('lockedDialog');}
function requirePlus(message,action){if(appState.isPlus()){action?.();return true;}openLocked(message);return false;}
function refreshMembershipUI(){
 const member=appState.membership(),plus=appState.hasPlusAccess(),trial=appState.isTrialActive();
 el('membershipStatus').textContent=member.plan==='plus'?'Plus 已解锁':trial?`全功能试用 · 剩余 ${appState.trialDaysLeft()} 天`:'Basic · 全功能试用已结束';
 el('membershipOpen').textContent=member.plan==='plus'?'✦ Plus Member':trial?`全功能试用 · 余 ${appState.trialDaysLeft()} 天`:'会员 / Upgrade';
 el('startBasicTrial').textContent=member.plan==='plus'?'已开通 Plus':trial?`体验全部功能 · 剩余 ${appState.trialDaysLeft()} 天`:`Subscribe Basic ${pricing.format(window.APP_CONFIG.membership.basicMonthly)}/month`;
 el('startBasicTrial').disabled=member.plan==='plus';
 el('memberHomeChefOpen').textContent=plus?'选择套餐并预约':'🔒 Plus 解锁预约';
 el('advancedBudget').textContent=plus?'✨ AI 高级预算优化':'🔒 Plus 高级预算优化';
 el('suggestPantry').textContent=plus?'AI 智能补购':'🔒 AI 智能补购';
 el('voiceOpen').classList.remove('locked-feature');el('photoUpload').closest('.file-btn').classList.toggle('locked-feature',!plus);
}
function refreshBudgetLiveSummary(){const data=appState.shopping(),symbol=appState.currencySymbol(data.budget?.currency),spent=(data.items||[]).filter(item=>item.bought).reduce((sum,item)=>sum+Number(item.actual??item.estimate??0),0),budget=Number(data.budget?.amount)||0,remaining=budget-spent;el('budgetLiveSummary').textContent=budget?`实际已支出 ${symbol}${spent.toLocaleString('zh-CN')} · ${remaining>=0?'剩余':'已超出'} ${symbol}${Math.abs(remaining).toLocaleString('zh-CN')}`:'设置预算后，将在这里同步显示实际支出与剩余金额';el('budgetLiveSummary').classList.toggle('over',remaining<0);}
function refreshPrices(){
 document.querySelectorAll('[data-config="basicPrice"]').forEach(node=>node.textContent=pricing.format(window.APP_CONFIG.membership.basicMonthly));
 document.querySelectorAll('[data-config="plusPrice"]').forEach(node=>node.textContent=pricing.format(window.APP_CONFIG.membership.plusMonthly));
 el('membershipChefTiers').innerHTML=Object.values(window.APP_CONFIG.homeChef).map(tier=>`<div><strong>${esc(tier.name)}</strong><span>参考 ${pricing.chefFormat(tier)}${tier.suffix?' '+esc(tier.suffix):''}</span><small>${pricing.chefDescription(tier)}</small></div>`).join('');
 el('membershipPricingNote').textContent=pricing.note();
 el('membershipChefPricingNote').textContent=pricing.chefNote();
 const source=pricing.chefQuote(window.APP_CONFIG.homeChef.monthly).tariff;
 el('membershipChefSource').href=source.sourceUrl;el('membershipChefSource').textContent=`报价依据：${source.sourceName}`;
}
window.addEventListener('kitchen-pricing-ready',()=>{refreshPrices();refreshMembershipUI();});
document.querySelectorAll('[data-dialog-close]').forEach(button=>button.addEventListener('click',()=>closeDialog(button.dataset.dialogClose)));
el('membershipOpen').onclick=()=>{refreshMembershipUI();openDialog('membershipDialog');};
el('startBasicTrial').onclick=()=>{el('paymentDemo').hidden=true;closeDialog('membershipDialog');if(appState.isTrialActive())showToast(`全部功能已开放，还可体验 ${appState.trialDaysLeft()} 天`);else{appState.setPlan('basic');showToast('已选择 Basic 演示方案，暂未接入真实支付');}refreshMembershipUI();};
window.addEventListener('focus',refreshMembershipUI);
window.addEventListener('storage',refreshMembershipUI);
setInterval(refreshMembershipUI,30000);
el('upgradePlus').onclick=()=>{el('paymentDemo').hidden=false;el('paymentDemo').scrollIntoView({behavior:'smooth',block:'nearest'});};
el('simulateUpgrade').onclick=()=>{appState.setPlan('plus');el('paymentDemo').hidden=true;refreshMembershipUI();closeDialog('membershipDialog');showToast('Upgrade successful — Plus features unlocked.');};
el('lockedUpgrade').onclick=()=>{closeDialog('lockedDialog');openDialog('membershipDialog');};
el('preferenceQuick').onclick=()=>{
 const section=el('preferencesSection');
 section.hidden=false;toggle.setAttribute('aria-expanded','true');panel.hidden=false;
 section.scrollIntoView({behavior:'smooth',block:'start'});showToast('可以调整每位用餐人员的计划');
};
el('preferencesClose').onclick=()=>{el('preferencesSection').hidden=true;showToast('计划偏好已收起，填写内容会保留');};
el('advancedBudget').onclick=()=>requirePlus('Advanced budget optimization is available for Plus members.',()=>showToast('高级预算优化已开启，生成菜单时会优先避免超额。'));
refreshPrices();
el('memberHomeChefOpen').onclick=()=>requirePlus('Home Chef booking is available for Plus members.',()=>{window.location.href='home-chef.html';});
function renderExpiry(){
 const items=appState.inventory().items||[];
 el('expiryCount').textContent=items.length;
 el('expiryList').innerHTML=items.map(item=>`<button class="expiry-item" type="button" data-expiry-id="${esc(item.id)}"><span>${item.name.includes('牛奶')?'🥛':item.name.includes('番茄')?'🍅':'🥬'}</span><span><strong>${esc(item.name)}</strong><small>${esc(item.quantity)}</small></span><em>约 ${Number(item.expiresInDays)||1} 天内</em></button>`).join('');
 document.querySelectorAll('[data-expiry-id]').forEach(button=>{
  button.onclick=()=>{
   selectedExpiryItem=items.find(item=>item.id===button.dataset.expiryId);
   el('expiryDialogText').textContent=`${selectedExpiryItem.name}｜${selectedExpiryItem.quantity}｜约 ${selectedExpiryItem.expiresInDays} 天内过期。是否优先使用该食材生成食谱？`;
   openDialog('expiryDialog');
  };
 });
}
el('addExpiryToPlan').onclick=async()=>{if(!selectedExpiryItem)return;closeDialog('expiryDialog');const note=`优先使用临期食材：${selectedExpiryItem.name} ${selectedExpiryItem.quantity}`;el('sharedNotes').value=[el('sharedNotes').value.trim(),note].filter(Boolean).join('；');showToast('已加入本周食谱条件');const status=await refreshApiStatus();if(!status?.api_configured){addMessage('暂时无法生成食谱，请稍后再试。','assistant');return;}generateWeeklyPlan(note);};
renderExpiry();refreshMembershipUI();refreshBudgetLiveSummary();window.addEventListener('kitchen-state-change',refreshBudgetLiveSummary);window.addEventListener('storage',refreshBudgetLiveSummary);
function openTool(id){
 for(const v of ['voicePanel','cameraPanel'])el(v).hidden=v!==id;
 document.getElementById(id).scrollIntoView({behavior:'smooth',block:'nearest'});
}
el('voiceOpen').onclick=()=>openTool('voicePanel');
el('pantryOpen').onclick=()=>{const show=el('cameraPanel').hidden;el('cameraPanel').hidden=!show;el('pantryOpen').setAttribute('aria-expanded',String(show));if(show){el('cameraPanel').scrollIntoView({behavior:'smooth',block:'start'});}else{showToast('已收起库存拍照与补购功能');}};
document.querySelectorAll('[data-hide]').forEach(b=>b.onclick=()=>{el(b.dataset.hide).hidden=true;if(b.dataset.hide==='cameraPanel')el('pantryOpen').setAttribute('aria-expanded','false');if(b.dataset.hide==='voicePanel')stopContinuousVoice(false);});
function setListeningUI(active){el('startListening').disabled=active;el('startListening').textContent=active?'🎙️ 正在聆听…':'● 开始说话';el('stopListening').disabled=!active;}
function combinedVoiceText(interim=''){return [voiceBaseText,voiceCommittedText,interim].map(x=>x.trim()).filter(Boolean).join('，');}
function startRecognitionCycle(){
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){keepListening=false;setListeningUI(false);showToast('当前浏览器不能直接听写，你可以在下方手动输入');return;}
 const rec=new SR();liveRecognition=rec;rec.lang='zh-CN';rec.interimResults=true;rec.continuous=true;
 rec.onresult=event=>{let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const text=event.results[i][0].transcript.trim();if(!text)continue;if(event.results[i].isFinal)voiceCommittedText=[voiceCommittedText,text].filter(Boolean).join('，');else interim+=text;}el('voiceTranscript').value=combinedVoiceText(interim);};
 rec.onerror=event=>{if(['not-allowed','service-not-allowed','audio-capture'].includes(event.error)){keepListening=false;setListeningUI(false);el('voiceReview').hidden=false;el('voiceReview').textContent='我没能使用麦克风。请检查浏览器权限，或者直接在下方输入全家需求。';}};
 rec.onend=()=>{liveRecognition=null;if(keepListening)setTimeout(startRecognitionCycle,180);else setListeningUI(false);};
 try{rec.start();}catch(_){liveRecognition=null;if(keepListening)setTimeout(startRecognitionCycle,300);}
}
function stopContinuousVoice(notify=true,autoFill=false){
 const wasListening=keepListening||Boolean(liveRecognition);keepListening=false;
 if(liveRecognition){try{liveRecognition.stop();}catch(_){}liveRecognition=null;}
 el('voiceTranscript').value=combinedVoiceText();setListeningUI(false);
 if(notify&&wasListening)showToast('已经停下来了，可以检查或修改文字');
 if(autoFill&&el('voiceTranscript').value.trim())setTimeout(processFamilyVoice,260);
}
el('startListening').onclick=()=>{if(keepListening)return;voiceBaseText=el('voiceTranscript').value.trim();voiceCommittedText='';keepListening=true;setListeningUI(true);startRecognitionCycle();};
el('stopListening').onclick=()=>stopContinuousVoice(true,true);
function localParse(text){
 const patch={tastes:[],cuisines:[],avoid:'',notes:'',role:null,weekdayLunchOff:false,weekendLunchOn:false,mealActions:[],exclusiveMeal:null};
 for(const t of tasteOptions)if(text.includes(t))patch.tastes.push(t);
 if(/不太辣|不要辣|不吃辣/.test(text))patch.tastes=patch.tastes.filter(x=>x!=='偏辣');
 if(/(喜欢|爱吃|偏好).{0,4}(辣|辣味)/.test(text)&&!/(不吃辣|不要辣)/.test(text))patch.tastes.push('偏辣');
 if(/口味淡|少盐/.test(text))patch.tastes.push('清淡');
 for(const c of cuisines)if(text.includes(c))patch.cuisines.push(c);
 for(const r of ['儿童','长者','学生','上班族','成人'])if(text.includes(r)){patch.role=r;break;}
 const avoids=[...text.matchAll(/(?:不吃|不能吃|过敏|忌口|不要)([^，。；;、]{1,15})/g)].map(m=>m[0]);
 patch.avoid=avoids.join('；');
 patch.weekdayLunchOff=/(周一到周五|工作日|星期一到星期五).{0,12}(不吃|不在|没有|不参加).{0,6}(午饭|午餐|中饭)|(?:中饭|午餐|午饭).{0,10}(周一到周五|工作日).{0,8}(不吃|不在)|工作日不吃午饭/.test(text);
 patch.weekendLunchOn=/(周末|周六周日).{0,12}(午饭|午餐|中饭).{0,8}(吃|参加)/.test(text);
 for(let d=0;d<7;d++)for(let m=0;m<3;m++){
  const re=new RegExp(`${days[d]}.{0,9}${meals[m]}.{0,7}(不吃|不参加|参加|吃)`);
  const hit=text.match(re);if(hit)patch.mealActions.push({day:d,meal:m,participate:hit[1]==='参加'||hit[1]==='吃'});
 }
 const exclusive=text.match(/(?:只有|只在|仅在)(周[一二三四五六日天]).{0,8}(早餐|早饭|午餐|午饭|中饭|晚餐|晚饭).{0,8}(?:参加|吃|会吃)/);
 if(exclusive){
  const dayLabel=exclusive[1]==='周天'?'周日':exclusive[1];
  const mealLabel=/早/.test(exclusive[2])?'早餐':/(午|中)/.test(exclusive[2])?'午餐':'晚餐';
  patch.exclusiveMeal={day:days.indexOf(dayLabel),meal:meals.indexOf(mealLabel)};
 }
 patch.tastes=[...new Set(patch.tastes)];
 patch.cuisines=[...new Set(patch.cuisines)];
 return patch;
}
function chineseCount(value){const map={一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};if(/^\d+$/.test(value))return Number(value);if(value==='十')return 10;if(value.startsWith('十'))return 10+(map[value[1]]||0);if(value.endsWith('十'))return (map[value[0]]||0)*10;return map[value]||0;}
function syncPeopleFromFamilyText(text){
 const compact=text.replace(/\s+/g,'');
 const countHit=compact.match(/(?:一共|总共|共有|有)([一二两三四五六七八九十\d]+)(?:个|位)?(?:人|成员)/);
 const target=countHit?Math.min(12,chineseCount(countHit[1])):0;
 while(target&&people.length<target)people.push(newPerson());
 while(target&&people.length>target){const last=people.at(-1);if(!/^用餐人员\d+$/.test(last.name)||last.tastes.length||last.cuisines.length||last.avoid||last.notes)break;people.pop();}
 const roles=[];
 for(const [pattern,role] of [[/(?:([一二两三四五六七八九十\d]+)(?:个|位)?)?成人/g,'成人'],[/(?:([一二两三四五六七八九十\d]+)(?:个|位)?)?(?:孩子|儿童|小孩)/g,'儿童'],[/(?:([一二两三四五六七八九十\d]+)(?:个|位)?)?(?:长者|老人|老年人)/g,'长者']]){
  for(const hit of compact.matchAll(pattern)){const count=hit[1]?chineseCount(hit[1]):1;for(let i=0;i<count;i++)roles.push(role);}
 }
 if(/我和(?:老公|老婆).{0,5}(?:都是?|为)成人/.test(compact)){roles.splice(0,roles.length,'成人','成人');if(/(?:一个|1个)?(?:孩子|儿童|小孩)/.test(compact))roles.push('儿童');}
 roles.slice(0,people.length).forEach((role,index)=>{people[index].role=role;});
 return compact;
}
function applyVoice(person,patch){
 if(patch.role)person.role=patch.role;
 person.tastes=[...new Set([...person.tastes,...(patch.tastes||[])])];
 person.cuisines=[...new Set([...person.cuisines,...(patch.cuisines||[])])];
 if(patch.avoid)person.avoid=[person.avoid,patch.avoid].filter(Boolean).join('；');
 if(patch.weekdayLunchOff){for(let d=0;d<5;d++)person.schedule[d][1]=false;person.scheduleMode='weekdayLunch';}
 if(patch.weekendLunchOn)for(let d=5;d<7;d++)person.schedule[d][1]=true;
 if(patch.exclusiveMeal&&patch.exclusiveMeal.day>=0&&patch.exclusiveMeal.meal>=0){person.schedule=days.map(()=>[false,false,false]);person.schedule[patch.exclusiveMeal.day][patch.exclusiveMeal.meal]=true;person.scheduleMode='custom';}
 for(const a of patch.mealActions||[])if(a.day>=0&&a.day<7&&a.meal>=0&&a.meal<3){person.schedule[a.day][a.meal]=Boolean(a.participate);person.scheduleMode='custom';}
 person.expanded=true;
}
function localParseFamily(text){
 const compact=syncPeopleFromFamilyText(text);
 const common=(compact.match(/[^。；;]*(?:全家|大家|我们都|所有人)[^。；;]*/g)||[]).join('，');
 const labels=[...new Set([...people.map(p=>p.name).filter(name=>name&&!/^用餐人员\d+$/.test(name)),...['爸爸','妈妈','爷爷','奶奶','外公','外婆','老公','老婆','哥哥','姐姐','弟弟','妹妹','儿子','女儿','孩子','宝宝','室友','朋友','伴侣'].filter(name=>compact.includes(name)),...(/我(?!们)/.test(compact)?['我']:[])])];
 const hits=labels.map(name=>{const match=name==='我'?compact.match(/我(?!们)/):null;return {name,index:match?.index??compact.indexOf(name)};}).filter(x=>x.index>=0).sort((a,b)=>a.index-b.index);
 if(!hits.length)return people.map(p=>({id:p.id,name:p.name,patch:localParse(compact)}));
 const reserved=new Set();
 return hits.map((hit,i)=>{
  const end=hits[i+1]?.index??compact.length;const segment=[common,compact.slice(hit.index,end)].filter(Boolean).join('，');
  let person=people.find(p=>p.name===hit.name&&!reserved.has(p.id))||people.find(p=>/^用餐人员\d+$/.test(p.name)&&!reserved.has(p.id));
  if(!person){person=newPerson();people.push(person);}
  if(/^用餐人员\d+$/.test(person.name))person.name=hit.name;
  reserved.add(person.id);
  return {id:person.id,name:person.name,patch:localParse(segment)};
 });
}
function normalizeFamilyResult(data,text){
 if(!Array.isArray(data?.people)||!data.people.length)return localParseFamily(text);
 return data.people.map((item,i)=>{
  let person=getPerson(item.id)||people.find(p=>item.name&&p.name===item.name)||people[item.index]||people[i];
  if(!person){person=newPerson();people.push(person);}
  if(item.name&&(/^用餐人员\d+$/.test(person.name)||!person.name))person.name=String(item.name).slice(0,30);
  return {id:person.id,name:person.name,patch:item.patch||{}};
 });
}
async function processFamilyVoice(){
 const transcript=el('voiceTranscript').value.trim();if(!transcript){showToast('请先说出或写下全家需求');return;}
 const box=el('voiceReview');box.hidden=false;box.textContent='我在帮你整理每个人的需求…';
 const localUpdates=localParseFamily(transcript);
 let updates=localUpdates;
 try{
  const res=await fetch('/api/parse-voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:transcript,people:people.map((p,index)=>({id:p.id,index,name:p.name}))})});
  if(res.ok)updates=normalizeFamilyResult(await res.json(),transcript);
 }catch(_){ /* file:// preview mode */ }
 for(const item of updates){const local=localUpdates.find(candidate=>candidate.id===item.id||candidate.name===item.name);if(local?.patch?.exclusiveMeal)item.patch={...item.patch,exclusiveMeal:local.patch.exclusiveMeal};}
 const updated=[];
 for(const item of updates){const person=getPerson(item.id);if(person){applyVoice(person,item.patch||{});updated.push(person.name);}}
 const budgetHit=transcript.replace(/\s+/g,'').match(/(?:预算|每周预算|一周)(?:是|为|大约|约)?(?:人民币|港币|HKD|CNY|¥|￥|HK\$)?(\d+(?:\.\d+)?)/i);
 if(budgetHit){el('budgetAmount').value=budgetHit[1];if(/港币|HKD|HK\$/i.test(transcript))el('budgetCurrency').value='HKD';else if(/人民币|CNY|¥|￥/i.test(transcript))el('budgetCurrency').value='CNY';savePlanBudget();}
 renderPeople();
 const names=[...new Set(updated)];box.textContent=names.length?`好的，${names.join('、')}的需求都填好了。需要检查时，点击上方「我的计划偏好」即可修改。`:'这段话里还没有分清每位成员，请加上称呼再说一次，例如“爸爸……；妈妈……”。';
 if(names.length)voiceAssistedPlan=true;
 showToast(names.length?`已补全 ${names.length} 位用餐人员`:'请补充每位成员的称呼');
}
el('parseVoice').onclick=processFamilyVoice;
function showCaptured(data){photoDataUrl=data;el('photoPreview').src=data;el('photoPreview').hidden=false;el('recognizePhoto').disabled=false;el('visionStatus').textContent='已准备照片，点击「AI 识别这张照片」。';}
function canvasToJpg(source,w,h){const max=1100;const factor=Math.min(1,max/Math.max(w,h));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*factor));c.height=Math.max(1,Math.round(h*factor));c.getContext('2d').drawImage(source,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.78);}
el('photoUpload').onchange=event=>{if(!appState.isPlus()){event.target.value='';openLocked('Camera-based ingredient recognition is available for Plus members.');return;}const f=event.target.files?.[0];if(!f)return;if(f.size>15e6){showToast('图片请小于15 MB');return;}const url=URL.createObjectURL(f);const im=new Image();im.onload=()=>{showCaptured(canvasToJpg(im,im.naturalWidth,im.naturalHeight));URL.revokeObjectURL(url);};im.onerror=()=>{showToast('图片读取失败');URL.revokeObjectURL(url);};im.src=url;};
el('recognizePhoto').onclick=async()=>{
 if(!appState.isPlus()){openLocked('Camera-based ingredient recognition is available for Plus members.');return;}
 if(!photoDataUrl){showToast('请先拍照或上传照片');return;}el('visionStatus').textContent='正在识别图片…';el('recognizePhoto').disabled=true;
 try{const res=await fetch('/api/vision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:photoDataUrl})});const data=await res.json();if(!res.ok)throw new Error(data.error||'识别失败');
  el('pantryIngredients').value=(data.ingredients||[]).map(i=>[i.name,i.quantity].filter(Boolean).join(' ')).join('，');el('preparedDishes').value=(data.prepared_dishes||[]).join('，');el('visionStatus').textContent='识别完毕，请核对名称和数量后点击保存。'+(data.notes?' '+data.notes:'');
 }catch(_){el('visionStatus').textContent='这张照片暂时没认出来。你可以换一张更清楚的照片，或直接在下方填写现有食材。';}
 finally{el('recognizePhoto').disabled=false;}
};
function splitItems(s){return s.split(/[，,\n、；;]/).map(x=>x.trim()).filter(Boolean);}
function currentPantry(){return {ingredients:splitItems(el('pantryIngredients').value),prepared_dishes:splitItems(el('preparedDishes').value)};}
el('savePantry').onclick=()=>{savedPantry=currentPantry();const n=savedPantry.ingredients.length+savedPantry.prepared_dishes.length;if(!n){showToast('请先识别或填写已有食物');return;}const box=el('pantryResult');box.hidden=false;box.textContent=`已保存 ${n} 项现有食物。生成食谱时会优先考虑这些食材；请核实保质期和过敏原。`;showToast('已有食物清单已保存');};
const recipeIdeas=[
 {name:'番茄炒蛋',aliases:['番茄','西红柿','鸡蛋','蛋'],requires:['番茄','鸡蛋','食用油'],hint:'适合搭配米饭'},
 {name:'青菜鸡蛋汤',aliases:['青菜','生菜','鸡蛋','蛋'],requires:['青菜','鸡蛋','盐'],hint:'清淡汤品'},
 {name:'土豆炖鸡',aliases:['土豆','马铃薯','鸡肉'],requires:['土豆','鸡肉','生姜'],hint:'主菜'},
 {name:'香菇炒青菜',aliases:['香菇','蘑菇','青菜'],requires:['香菇','青菜','食用油'],hint:'素菜'},
 {name:'蛋炒饭',aliases:['米饭','剩米饭','鸡蛋'],requires:['米饭','鸡蛋','葱'],hint:'熟饭须妥善保存和彻底加热'},
 {name:'番茄鸡蛋面',aliases:['番茄','西红柿','鸡蛋','面条'],requires:['番茄','鸡蛋','面条'],hint:'简单主食'}
];
function pantrySuggestion(){const pantry=currentPantry();savedPantry=pantry;const have=[...pantry.ingredients,...pantry.prepared_dishes,...defaultStaples].join('、');const synonyms={番茄:['番茄','西红柿'],鸡蛋:['鸡蛋','蛋'],青菜:['青菜','生菜','小白菜'],土豆:['土豆','马铃薯'],鸡肉:['鸡肉','鸡胸','鸡腿'],米饭:['大米','米饭','剩饭'],食用油:['食用油','油'],盐:['食盐','盐'],香菇:['香菇','蘑菇'],面条:['面条','面']};
 const has=needed=>(synonyms[needed]||[needed]).some(w=>have.includes(w));
 const scored=recipeIdeas.map(r=>({...r,found:r.requires.filter(has),missing:r.requires.filter(x=>!has(x))})).sort((a,b)=>b.found.length-a.found.length||a.missing.length-b.missing.length).slice(0,4);
 const allmissing=[...new Set(scored.flatMap(r=>r.missing))];return {pantry,scored,allmissing};}
function displayPantrySuggestions(){const pantryNow=currentPantry();const box=el('pantryResult');box.hidden=false;if(!pantryNow.ingredients.length&&!pantryNow.prepared_dishes.length){box.textContent='无法生成建议：请先拍照识别食材，或手动填写至少一种已有食材／菜品。';showToast('请先填写库存');return;}const {pantry,scored,allmissing}=pantrySuggestion();
 box.textContent=`家里现有：${[...pantry.ingredients,...pantry.prepared_dishes].join('、')||'还没填写'}\n\n可以先考虑：\n${scored.map(x=>`• ${x.name}：已有 ${x.found.join('、')||'部分食材'}；还可补 ${x.missing.join('、')||'暂时不用补'}`).join('\n')}\n\n建议补购：${allmissing.join('、')||'暂时不用补'}\n\n我会在安排菜单时继续照顾每个人的忌口和用餐人数。`;
}
el('suggestPantry').onclick=()=>requirePlus('AI automatic replenishment is available for Plus members.',displayPantrySuggestions);
