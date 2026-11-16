(function(){
 const state=window.KitchenState,pricing=window.KitchenPricing,config=window.APP_CONFIG;
 const badge=document.getElementById('membershipOpen');
 if(!badge||document.getElementById('membershipDialog'))return;
 document.body.insertAdjacentHTML('beforeend',`<dialog id="membershipDialog" class="km-membership" aria-labelledby="membershipTitle">
 <div class="km-header"><div><strong id="membershipTitle">Membership</strong><small id="membershipStatus"></small></div><button type="button" id="membershipClose" aria-label="关闭会员面板">×</button></div>
 <p>首次使用可享 7 天全功能试用，包含全部 Plus 功能和 Home Chef 预约体验。实际厨师服务另收费，当前支付和预约均为 Demo。</p><p id="membershipPricingNote"></p>
 <div class="km-plan"><strong>Basic</strong><h2><span data-config="basicPrice"></span><small> / month</small></h2><b>7-Day All-Features Free Trial</b><ul><li>基础个性化食谱</li><li>用餐人员、偏好与忌口</li><li>一周食谱与基础清单</li><li>手动库存和每周预算</li></ul><button id="startBasicTrial" type="button"></button></div>
 <div class="km-plan km-plus"><strong>Plus</strong><h2><span data-config="plusPrice"></span><small> / month</small></h2><b>Basic 全部功能＋</b><ul><li>语音需求生成、库存拍照</li><li>临期食材优先、智能补购</li><li>高级预算优化与超额提醒</li><li>Home Chef 预约入口</li></ul><button id="upgradePlus" type="button">Upgrade to Plus</button></div>
 <div id="paymentDemo" class="km-payment" hidden><p>Demo only — real payment is not connected.</p><button id="simulateUpgrade" type="button">Simulate Upgrade</button></div>
 <section class="km-chef"><strong>🧑‍🍳 Home Chef 上门厨师</strong><p>全功能试用及 Plus 会员可预约；实际服务另收费。</p><p id="membershipChefPricingNote"></p><a id="membershipChefSource" target="_blank" rel="noreferrer"></a><div id="membershipChefTiers" class="km-tiers"></div><button id="memberHomeChefOpen" type="button">选择套餐并预约</button></section>
 </dialog><div id="membershipToast" class="km-toast" role="status"></div>`);
 const el=id=>document.getElementById(id),dialog=el('membershipDialog');
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function notify(message){const box=el('membershipToast');box.textContent=message;box.classList.add('show');setTimeout(()=>box.classList.remove('show'),2500);}
 function refresh(){
  const member=state.membership(),trial=state.isTrialActive();
  badge.textContent=member.plan==='plus'?'✦ Plus Member':trial?`全功能试用 · 余 ${state.trialDaysLeft()} 天`:'会员 / Upgrade';
  el('membershipStatus').textContent=member.plan==='plus'?'Plus 已解锁':trial?`全功能试用 · 剩余 ${state.trialDaysLeft()} 天`:'Basic · 全功能试用已结束';
  el('startBasicTrial').textContent=member.plan==='plus'?'已开通 Plus':trial?`体验全部功能 · 剩余 ${state.trialDaysLeft()} 天`:`Subscribe Basic ${pricing.format(config.membership.basicMonthly)}/month`;
  el('startBasicTrial').disabled=member.plan==='plus';el('memberHomeChefOpen').textContent=state.hasPlusAccess()?'选择套餐并预约':'🔒 Plus 解锁预约';
  el('membershipPricingNote').textContent=pricing.note();el('membershipChefPricingNote').textContent=pricing.chefNote();
  el('membershipDialog').querySelector('[data-config="basicPrice"]').textContent=pricing.format(config.membership.basicMonthly);
  el('membershipDialog').querySelector('[data-config="plusPrice"]').textContent=pricing.format(config.membership.plusMonthly);
  const source=pricing.chefQuote(config.homeChef.monthly).tariff;el('membershipChefSource').href=source.sourceUrl;el('membershipChefSource').textContent=`报价依据：${source.sourceName}`;
  el('membershipChefTiers').innerHTML=Object.values(config.homeChef).map(tier=>`<div><strong>${esc(tier.name)}</strong><span>参考 ${pricing.chefFormat(tier)}${tier.suffix?' '+esc(tier.suffix):''}</span><small>${pricing.chefDescription(tier)}</small></div>`).join('');
 }
 badge.setAttribute('aria-haspopup','dialog');badge.setAttribute('aria-controls','membershipDialog');badge.onclick=()=>{refresh();dialog.showModal();};
 el('membershipClose').onclick=()=>dialog.close();
 el('startBasicTrial').onclick=()=>{dialog.close();if(state.isTrialActive())notify(`全部功能已开放，还可体验 ${state.trialDaysLeft()} 天`);else{state.setPlan('basic');notify('已选择 Basic 演示方案，暂未接入真实支付');}refresh();};
 el('upgradePlus').onclick=()=>{el('paymentDemo').hidden=false;el('paymentDemo').scrollIntoView({block:'nearest',behavior:'smooth'});};
 el('simulateUpgrade').onclick=()=>{state.setPlan('plus');el('paymentDemo').hidden=true;dialog.close();refresh();notify('Plus 演示功能已解锁');};
 el('memberHomeChefOpen').onclick=()=>{if(state.hasPlusAccess())window.location.href='home-chef.html';else{notify('全功能试用已结束，升级 Plus 后可继续预约');el('upgradePlus').scrollIntoView({block:'center',behavior:'smooth'});}};
 for(const event of ['focus','storage','kitchen-state-change','kitchen-pricing-ready'])window.addEventListener(event,refresh);
 setInterval(refresh,30000);refresh();
})();
