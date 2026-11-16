const chat = document.querySelector('#chat');
const form = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const toggle = document.querySelector('#preferenceToggle');
const panel = document.querySelector('#preferencePanel');
const toast = document.querySelector('#toast');
const memberCounts = document.querySelector('#memberCounts');
const avoidButton = document.querySelector('#avoidButton');
const avoidField = document.querySelector('#avoidField');

function addMessage(text, role) {
  const article = document.createElement('article');
  article.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
  const bubble = document.createElement('p');
  bubble.textContent = text;
  const avatar = document.createElement('span');
  avatar.className = `avatar ${role === 'user' ? 'user-avatar' : 'assistant-avatar'}`;
  avatar.textContent = role === 'user' ? '🙂' : '👩🏻‍🍳';
  if (role === 'user') article.append(bubble, avatar); else article.append(avatar, bubble);
  chat.append(article);
  article.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function replyTo(text) {
  const lower = text.toLowerCase();
  let reply = '收到！我会把这些想法记进你的本周菜单里。你还想补充预算、口味或家人的需要吗？';
  if (lower.includes('食材') || lower.includes('ingredients')) reply = '没问题，把家里现有的食材告诉我，我会优先用它们来搭配菜单。';
  if (lower.includes('预算') || lower.includes('budget')) reply = '好的，我会优先安排性价比高的菜，并在采购清单中帮你核算预算。';
  if (lower.includes('食谱') || lower.includes('菜单') || lower.includes('menu')) reply = '太好了！请再告诉我家庭人数、预算或想吃的菜系，我就可以为你规划一周食谱。';
  window.setTimeout(() => addMessage(reply, 'assistant'), 450);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  input.value = '';
  replyTo(text);
});

document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => {
  input.value = button.dataset.prompt;
  input.focus();
}));

toggle.addEventListener('click', () => {
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!expanded));
  panel.hidden = expanded;
});

document.querySelectorAll('.chips button').forEach((button) => button.addEventListener('click', () => {
  button.classList.toggle('selected');
  if (button.dataset.member) renderMemberCounts();
  if (button === avoidButton) avoidField.hidden = !button.classList.contains('selected');
}));

function renderMemberCounts() {
  const selectedMembers = [...document.querySelectorAll('[data-member].selected')].map((button) => button.dataset.member);
  memberCounts.replaceChildren();
  selectedMembers.forEach((member) => {
    const label = document.createElement('label');
    label.className = 'member-count';
    label.innerHTML = `<span>${member}人数</span><input aria-label="${member}人数" type="number" min="1" value="1" />`;
    memberCounts.append(label);
  });
}
document.querySelectorAll('[data-coming-soon]').forEach((button) => button.addEventListener('click', () => {
  toast.textContent = button.dataset.comingSoon;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 1800);
}));

// Local prototype data. One selected currency; no currency conversion.
const STORAGE_KEY = 'kitchen-shopping-v1';
const PLANNING_STORAGE_KEY = 'kitchen-planning-v1';
const exampleItems = [
  {id:'tomato',name:'番茄',category:'蔬菜水果',quantity:500,unit:'克',estimate:18,actual:null,bought:false},
  {id:'broccoli',name:'西兰花',category:'蔬菜水果',quantity:2,unit:'颗',estimate:30,actual:null,bought:false},
  {id:'chicken',name:'鸡胸肉',category:'肉蛋海鲜',quantity:600,unit:'克',estimate:42,actual:null,bought:false},
  {id:'egg',name:'鸡蛋',category:'肉蛋海鲜',quantity:6,unit:'个',estimate:18,actual:null,bought:true},
  {id:'shrimp',name:'鲜虾',category:'肉蛋海鲜',quantity:400,unit:'克',estimate:60,actual:null,bought:false}
];
let shopping = {items:exampleItems,budget:{currency:'HKD',amount:500}};
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved?.budget && !saved.budget.currency && Number.isFinite(saved.budget.hkd)) {
    saved.budget = {currency:'HKD',amount:saved.budget.hkd};
  }
  const validAmount = n => Number.isFinite(n) && n >= 0;
  if (saved && Array.isArray(saved.items) && saved.budget && ['CNY','HKD'].includes(saved.budget.currency) && validAmount(saved.budget.amount) && saved.items.every(i => i && typeof i.id === 'string' && typeof i.name === 'string' && typeof i.unit === 'string' && ['蔬菜水果','肉蛋海鲜','主食调味','其他'].includes(i.category) && Number.isFinite(i.quantity) && i.quantity > 0 && validAmount(i.estimate) && (i.actual === null || validAmount(i.actual)) && typeof i.bought === 'boolean')) shopping = saved;
} catch { /* Storage may be unavailable for local files. */ }
try {
  const plan=JSON.parse(localStorage.getItem(PLANNING_STORAGE_KEY));
  if(plan && ['CNY','HKD'].includes(plan.currency) && Number.isFinite(plan.amount) && plan.amount>=0)shopping.budget={currency:plan.currency,amount:plan.amount};
} catch { /* Use the shopping page defaults. */ }
// Remove the legacy demo rice row. The default pantry already includes rice,
// oil, soy sauce, sugar and salt. A user can still add a missing staple; those
// manually added rows use generated item-* ids and remain untouched.
shopping.items = shopping.items.filter(item => item.id !== 'rice');
let shoppingFilter = 'pending';
let editingId = null;
let activeMealScope='all';
const purchaseSelections=new Set();
const byId = id => document.getElementById(id);
const money = value => `${shopping.budget.currency === 'CNY' ? '¥' : 'HK$'}${value.toLocaleString('zh-CN',{maximumFractionDigits:2})}`;
function notifyShopping(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'),2500);
}
function saveShopping() {
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(shopping)); }
  catch { notifyShopping('当前浏览器无法保存，刷新后可能丢失本次修改。'); }
}
function budgetMetrics(state) {
  const budget = state.budget.amount;
  const total = state.items.reduce((sum,i) => sum + (i.bought && i.actual !== null ? i.actual : i.estimate),0);
  const bought = state.items.filter(i => i.bought);
  const spent = bought.reduce((sum,i) => sum + (i.actual === null ? i.estimate : i.actual),0);
  return {budget,total,spent,bought,remaining:budget-spent,projectedRemaining:budget-total,estimatedBought:bought.filter(i => i.actual === null).length};
}
function sourceMeal(source){const match=String(source||'').match(/^(周[一二三四五六日](?:早餐|午餐|晚餐))/);return match?match[1]:'';}
function availableMealScopes(){const values=new Set();shopping.items.filter(item=>!item.bought).forEach(item=>(item.sources||[]).forEach(source=>{const value=sourceMeal(source);if(value)values.add(value);}));const dayOrder=['周一','周二','周三','周四','周五','周六','周日'],mealOrder=['早餐','午餐','晚餐'];return [...values].sort((a,b)=>{const da=dayOrder.findIndex(day=>a.startsWith(day)),db=dayOrder.findIndex(day=>b.startsWith(day));return da!==db?da-db:mealOrder.findIndex(meal=>a.endsWith(meal))-mealOrder.findIndex(meal=>b.endsWith(meal));});}
function scopeMatches(item){return activeMealScope==='all'||(item.sources||[]).some(source=>sourceMeal(source)===activeMealScope);}
function scopedPart(item){if(activeMealScope==='all')return {quantity:Number(item.quantity)||0,estimate:Number(item.estimate)||0,sources:item.sources||[]};const breakdown=Array.isArray(item.sourceBreakdown)?item.sourceBreakdown.filter(row=>sourceMeal(row.source)===activeMealScope):[];if(breakdown.length)return {quantity:breakdown.reduce((sum,row)=>sum+(Number(row.quantity)||0),0),estimate:breakdown.reduce((sum,row)=>sum+(Number(row.estimate)||0),0),sources:breakdown.map(row=>row.source)};const sources=item.sources||[],matched=sources.filter(source=>sourceMeal(source)===activeMealScope),ratio=sources.length?matched.length/sources.length:1;return {quantity:Number(((Number(item.quantity)||0)*ratio).toFixed(2)),estimate:Number(((Number(item.estimate)||0)*ratio).toFixed(2)),sources:matched};}
function renderScopeControls(){const scopes=availableMealScopes(),pending=shopping.items.filter(item=>!item.bought),allSelected=pending.length>0&&pending.every(item=>purchaseSelections.has(item.id));byId('mealScopeList').innerHTML=scopes.length?scopes.map(scope=>`<button type="button" class="${scope===activeMealScope?'selected':''}" data-meal-scope="${scope}">${scope}</button>`).join(''):'<small>生成食谱后，会在这里显示每一顿。</small>';byId('wholeWeekScope').classList.toggle('selected',activeMealScope==='all');byId('selectAllShoppingItems').textContent=allSelected?'取消全部勾选':'✓ 一键全部勾选';byId('selectAllShoppingItems').classList.toggle('selected',allSelected);document.querySelectorAll('[data-meal-scope]').forEach(button=>button.onclick=()=>{activeMealScope=button.dataset.mealScope;purchaseSelections.clear();renderShopping();});}
function selectedPurchaseMetrics(){const items=shopping.items.filter(item=>!item.bought&&purchaseSelections.has(item.id)&&scopeMatches(item));return {items,total:items.reduce((sum,item)=>sum+scopedPart(item).estimate,0)};}
function renderSelectedPurchase(){const selected=selectedPurchaseMetrics();byId('selectedPurchaseCount').textContent=selected.items.length;byId('selectedPurchaseTotal').textContent=money(selected.total);byId('buySelected').disabled=!selected.items.length;byId('selectedPurchaseBar').hidden=shoppingFilter==='bought';byId('purchaseScope').hidden=shoppingFilter==='bought';}
function renderShopping() {
  const m = budgetMetrics(shopping);
  byId('budgetTotal').textContent = money(m.budget);
  byId('projectedTotal').textContent = money(m.total);
  byId('actualSpent').textContent = money(m.spent);
  byId('remainingLabel').textContent = m.remaining < 0 ? '实际超出' : '剩余预算';
  byId('budgetRemaining').textContent = money(Math.abs(m.remaining));
  byId('budgetProgress').value = m.budget > 0 ? Math.min(100,m.spent/m.budget*100) : (m.spent > 0 ? 100 : 0);
  byId('budgetStatus').textContent = m.budget > 0 ? (m.projectedRemaining<0?`预计超出预算 ${money(Math.abs(m.projectedRemaining))}`:`预计还可安排 ${money(m.projectedRemaining)} · 已购后从剩余预算扣除`) : '请先设置本周预算';
  byId('budgetTotal').closest('.budget-card').classList.toggle('over-budget',m.projectedRemaining < -0.005||m.remaining<0);
  byId('optimizeBudget').hidden=m.projectedRemaining>=-0.005;
  const currencyName = shopping.budget.currency === 'CNY' ? '人民币' : '港币';
  byId('currencyNote').textContent = `当前计价：${currencyName} · 预算与采购金额统一使用此币种`;
  byId('estimateLabel').textContent = `预计总价（${currencyName}）`;
  byId('actualLabel').textContent = `实际总价（${currencyName}，可留空）`;
  byId('pendingCount').textContent = shopping.items.length-m.bought.length;
  byId('boughtCount').textContent = m.bought.length;
  ['pending','bought'].forEach(filter => {
    byId(filter+'Tab').classList.toggle('selected',shoppingFilter === filter);
    byId(filter+'Tab').setAttribute('aria-pressed',String(shoppingFilter === filter));
  });
  byId('purchaseCount').textContent = `已购买 ${m.bought.length} / ${shopping.items.length} 项`;
  byId('spentTotal').textContent = money(m.spent);
  byId('estimateNote').textContent = m.estimatedBought ? `已购合计中有 ${m.estimatedBought} 项尚未填写实际价格，暂按预计价格计算。` : '已购合计按实际价格计算；待采购部分仍为估算。';
  renderScopeControls();renderSelectedPurchase();
  const list = byId('shoppingList');
  list.replaceChildren();
  const visible = shopping.items.filter(i => i.bought === (shoppingFilter === 'bought')&&(shoppingFilter==='bought'||scopeMatches(i)));
  if (!visible.length) {
    const empty = document.createElement('p'); empty.className = 'empty-list';
    empty.textContent = shoppingFilter === 'bought' ? '还没有已购食材，买好后勾选一下吧。' : '清单都买好啦！也可以添加其他需要的食材。';
    list.append(empty);
  }
  const icons = {'蔬菜水果':'🥬','肉蛋海鲜':'🥚','主食调味':'🍚','其他':'🧺'};
  for (const category of Object.keys(icons)) {
    const items = visible.filter(i => i.category === category);
    if (!items.length) continue;
    const section = document.createElement('section');section.className='food-group';
    const heading = document.createElement('h3');heading.textContent=`${icons[category]} ${category}`;section.append(heading);
    for (const item of items) {
      const row = document.createElement('div');row.className=`food-row ${item.bought?'is-bought':''}`;
      const checkLabel = document.createElement('label');checkLabel.className='food-check';
      const check = document.createElement('input');check.type='checkbox';check.checked=item.bought||purchaseSelections.has(item.id);
      check.setAttribute('aria-label',item.bought?`${item.name}已购买`:`选择购买${item.name}`);
      check.addEventListener('change',() => {if(item.bought){item.bought=false;item.actual=null;}else if(check.checked)purchaseSelections.add(item.id);else purchaseSelections.delete(item.id);saveShopping();renderShopping();});
      checkLabel.append(check);
      const edit = document.createElement('button');edit.type='button';edit.className='food-edit';
      edit.setAttribute('aria-label',`编辑${item.name}`);
      const name = document.createElement('span');name.className='food-name';
      const title = document.createElement('strong');title.textContent=item.name;
      const portion=scopedPart(item);const quantity = document.createElement('small');quantity.textContent=`${portion.quantity} ${item.unit}`;name.append(title,quantity);
      if(Array.isArray(item.sources)&&item.sources.length){const sources=document.createElement('small');sources.className='food-sources';const shown=item.sources.slice(0,2);sources.textContent=`用于：${shown.join('、')}${item.sources.length>2?` 等${item.sources.length}顿`:''}`;name.append(sources);}
      const price = document.createElement('span');price.className='food-price';
      price.append(document.createTextNode(money(item.bought && item.actual !== null ? item.actual : portion.estimate)));
      const priceLabel = document.createElement('small');priceLabel.textContent=item.bought && item.actual !== null?'实际价格':'预计价格';price.append(priceLabel);
      const arrow = document.createElement('span');arrow.className='food-arrow';arrow.textContent='›';
      const icon = document.createElement('span');icon.className='food-icon';icon.setAttribute('aria-hidden','true');
      icon.textContent = ({tomato:'🍅',broccoli:'🥦',chicken:'🍗',egg:'🥚',shrimp:'🦐',rice:'🍚'})[item.id] || icons[category];
      edit.append(icon,name,price,arrow);edit.addEventListener('click',() => openItem(item));
      const quantityControl=document.createElement('div');quantityControl.className='quantity-control';
      const minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.setAttribute('aria-label',`减少${item.name}`);
      const plus=document.createElement('button');plus.type='button';plus.textContent='＋';plus.setAttribute('aria-label',`增加${item.name}`);
      const amount=document.createElement('span');amount.textContent=String(item.quantity);
      const adjust=direction=>{const old=Math.max(.01,Number(item.quantity)||1),step=old>=100?100:1,next=Math.max(step,old+direction*step),ratio=next/old;item.quantity=Number(next.toFixed(2));item.estimate=Number((item.estimate*ratio).toFixed(2));if(item.actual!==null)item.actual=Number((item.actual*ratio).toFixed(2));saveShopping();renderShopping();};
      minus.onclick=()=>adjust(-1);plus.onclick=()=>adjust(1);quantityControl.append(minus,amount,plus);
      if(activeMealScope!=='all'&&!item.bought)quantityControl.hidden=true;row.append(checkLabel,edit,quantityControl);section.append(row);
    }
    list.append(section);
  }
}
function openItem(item) {
  editingId = item ? item.id : null;
  byId('itemDialogTitle').textContent=item?'编辑食材':'添加食材';
  byId('itemName').value=item?.name ?? '';
  byId('itemCategory').value=item?.category ?? '蔬菜水果';
  byId('itemQuantity').value=item?.quantity ?? 1;
  byId('itemUnit').value=item?.unit ?? '份';
  byId('itemEstimate').value=item?.estimate ?? '';
  byId('itemActual').value=item?.actual ?? '';
  byId('deleteItem').hidden=!item;
  byId('itemDialog').showModal();
}
byId('itemForm').addEventListener('submit',event => {
  event.preventDefault();
  const name=byId('itemName').value.trim(),unit=byId('itemUnit').value.trim();
  if (!name || !unit) {notifyShopping('请填写食材名称和单位。');return;}
  const values={name,unit,category:byId('itemCategory').value,quantity:Number(byId('itemQuantity').value),estimate:Number(byId('itemEstimate').value),actual:byId('itemActual').value===''?null:Number(byId('itemActual').value)};
  if(editingId) Object.assign(shopping.items.find(i => i.id===editingId),values);
  else {shopping.items.push({id:`item-${Date.now()}-${Math.random().toString(36).slice(2)}`,bought:false,...values});shoppingFilter='pending';}
  saveShopping();renderShopping();byId('itemDialog').close();
});
byId('deleteItem').addEventListener('click',() => {
  shopping.items=shopping.items.filter(i => i.id!==editingId);saveShopping();renderShopping();byId('itemDialog').close();
});
byId('addItem').addEventListener('click',() => openItem(null));
['pending','bought'].forEach(filter => byId(filter+'Tab').addEventListener('click',() => {shoppingFilter=filter;purchaseSelections.clear();renderShopping();}));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click',() => byId(button.dataset.close).close()));
const currencyInput=byId('budgetCurrency'),amountInput=byId('budgetAmount');
currencyInput.value=shopping.budget.currency;amountInput.value=shopping.budget.amount;
function syncPlanningBudget() {
  const amount=Number(amountInput.value),currency=currencyInput.value;
  if (!Number.isFinite(amount) || amount < 0 || !['CNY','HKD'].includes(currency)) return;
  const changedCurrency=shopping.budget.currency !== currency;
  shopping.budget={currency,amount};saveShopping();
  try { localStorage.setItem(PLANNING_STORAGE_KEY,JSON.stringify({currency,amount})); } catch {}
  renderShopping();
  if (changedCurrency) notifyShopping('计价币种已更新，已有金额未换算，请核对食材价格。');
}
currencyInput.addEventListener('change',syncPlanningBudget);
amountInput.addEventListener('input',syncPlanningBudget);
byId('budgetHint').textContent='默认家里已有大米、食用油、酱油、糖和食盐；预算只计本周新买的菜、肉、蛋、奶和水产等食材。';
byId('editBudget').addEventListener('click',() => {
  byId('shoppingCurrency').value=shopping.budget.currency;byId('shoppingBudget').value=shopping.budget.amount;byId('budgetDialog').showModal();
});
byId('budgetForm').addEventListener('submit',event => {
  event.preventDefault();currencyInput.value=byId('shoppingCurrency').value;amountInput.value=byId('shoppingBudget').value;
  syncPlanningBudget();byId('budgetDialog').close();
});
byId('optimizeBudget').addEventListener('click',()=>{if(!window.KitchenState.isPlus()){byId('shoppingLockedDialog').showModal();return;}const button=byId('optimizeBudget');button.disabled=true;button.textContent='正在整理预算…';setTimeout(()=>{button.disabled=false;button.textContent='✨ AI 帮我优化';notifyShopping('Budget optimization is temporarily unavailable.');},650);});
byId('wholeWeekScope').addEventListener('click',()=>{activeMealScope='all';purchaseSelections.clear();renderShopping();});
byId('selectAllShoppingItems').addEventListener('click',()=>{const pending=shopping.items.filter(item=>!item.bought),allSelected=pending.length>0&&pending.every(item=>purchaseSelections.has(item.id));activeMealScope='all';purchaseSelections.clear();if(!allSelected)pending.forEach(item=>purchaseSelections.add(item.id));renderShopping();notifyShopping(allSelected?'已取消全部勾选':`已勾选本周全部 ${pending.length} 项待购食材`);});
async function openPurchasePlatforms(){const region=await window.KitchenLocale.detect(),services=window.APP_CONFIG.regionalServices[region.market]||window.APP_CONFIG.regionalServices.GLOBAL;byId('purchaseRegionStatus').textContent=`${region.city||region.country_name||'当前地区'}推荐 · 已选 ${selectedPurchaseMetrics().items.length} 项，共 ${money(selectedPurchaseMetrics().total)}`;byId('groceryPartnerList').innerHTML=services.grocery.map(partner=>`<a href="${partner.url}" target="_blank" rel="noopener"><strong>${partner.name}</strong><small>前往第三方平台</small></a>`).join('');byId('offlineMarketMap').href=services.map;byId('purchasePlatformDialog').showModal();}
byId('buySelected').addEventListener('click',openPurchasePlatforms);
byId('simulatePurchase').addEventListener('click',()=>{const selected=selectedPurchaseMetrics();const purchased=[];selected.items.forEach(item=>{if(activeMealScope==='all'){item.bought=true;item.actual=item.estimate;purchased.push(item);return;}const part=scopedPart(item),copy={...item,id:`purchase-${Date.now()}-${Math.random().toString(36).slice(2)}`,quantity:part.quantity,estimate:part.estimate,actual:part.estimate,bought:true,sources:part.sources,sourceBreakdown:(item.sourceBreakdown||[]).filter(row=>sourceMeal(row.source)===activeMealScope)};item.quantity=Number(Math.max(0,(Number(item.quantity)||0)-part.quantity).toFixed(2));item.estimate=Number(Math.max(0,(Number(item.estimate)||0)-part.estimate).toFixed(2));item.sources=(item.sources||[]).filter(source=>sourceMeal(source)!==activeMealScope);item.sourceBreakdown=(item.sourceBreakdown||[]).filter(row=>sourceMeal(row.source)!==activeMealScope);purchased.push(copy);});shopping.items=shopping.items.filter(item=>item.bought||item.quantity>0.001||item.estimate>0.001).concat(purchased.filter(item=>!shopping.items.includes(item)));purchaseSelections.clear();saveShopping();byId('purchasePlatformDialog').close();shoppingFilter='bought';renderShopping();notifyShopping(`已模拟购买 ${selected.items.length} 项，预算已同步更新`);});
function showPage(page) {
  const isShopping=page==='shopping';
  byId('planningPage').hidden=isShopping;byId('shoppingPage').hidden=!isShopping;
  document.body.classList.toggle('shopping-view',isShopping);
  for(const id of ['planningNav','shoppingNav']) {
    const active=id===(isShopping?'shoppingNav':'planningNav');
    byId(id).classList.toggle('active',active);
    if(active) byId(id).setAttribute('aria-current','page');else byId(id).removeAttribute('aria-current');
  }
  window.scrollTo(0,0);
}
byId('shoppingNav').addEventListener('click',() => showPage('shopping'));
byId('planningNav').addEventListener('click',() => {window.location.href='index.html';});
renderShopping();
showPage('shopping');
