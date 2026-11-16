(function(){
 const config=window.APP_CONFIG.pricing;
 let current={currency:config.defaultCurrency||'HKD',market:config.defaultMarket||'HK',rates:config.fallbackRates,source:'demo',date:null,regionSource:'default'};
 const symbols={CNY:'¥',HKD:'HK$',USD:'US$'};
 const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
 const convert=n=>round(Number(n)*Number(current.rates[current.currency]||1));
 function formatRecorded(amount,currency='CNY'){return `${symbols[currency]||currency}${Number(amount).toLocaleString('zh-CN',{minimumFractionDigits:currency==='CNY'?0:2,maximumFractionDigits:2})}`;}
 const format=n=>formatRecorded(convert(n),current.currency);
 function chefQuote(tier){
  const market=current.market==='HK'?'HK':'CN',tariff=window.APP_CONFIG.homeChefMarkets[market],nativeCurrency=market==='HK'?'HKD':'CNY',nativeAmount=tariff.prices?.[tier.id]??tier.price;
  const amount=current.currency===nativeCurrency?nativeAmount:round(nativeAmount/Number(current.rates[nativeCurrency])*Number(current.rates[current.currency]));
  return {amount,currency:current.currency,nativeAmount,nativeCurrency,hoursPerVisit:tariff.hoursPerVisit,visits:tier.visits,market,isLocal:current.market!=='GLOBAL',tariff};
 }
 const chefFormat=tier=>{const q=chefQuote(tier);return formatRecorded(q.amount,q.currency);};
 const chefDescription=tier=>`${tier.visits}${tier.id==='monthly'?' 次/月（每周 5 天）':' 次'} · 每次约 ${chefQuote(tier).hoursPerVisit} 小时`;
 const savings=tier=>Math.max(0,round(chefQuote(window.APP_CONFIG.homeChef.payPerVisit).amount*tier.visits-chefQuote(tier).amount));
 function chefNote(){const q=chefQuote(window.APP_CONFIG.homeChef.monthly);return `${q.isLocal?q.tariff.name+'参考价':'当地暂无报价；以下为上海参考价换算，非当地市场价'}。包月为工作日做一顿饭及简单厨房收拾，约 22 次/月；${q.market==='HK'?'按 HK$115/小时估算，参考区间 HK$7,260–7,920/月；':'上海机构公布的双休包月价，其他城市需询价；'}不含食材，交通和节假日加费需另确认。最终费用由服务方报价，当前仅 Demo 预约。`;}
 function note(){const label={CNY:'人民币',HKD:'港币',USD:'美元'}[current.currency];return `${current.regionSource==='fixed'?'统一使用':current.regionSource==='ip'?'按 IP 地区':current.regionSource==='default'?'默认':'按设备地区'}${label}；${current.source==='ecb'?`ECB 参考汇率 ${current.date}`:current.source==='cached'?`缓存参考汇率 ${current.date||''}`:'使用 Demo 估算汇率'}。当前为演示价格，暂不扣款。`;}
 async function rates(){
  try{
   const response=await fetch('/api/exchange-rates',{signal:AbortSignal.timeout(6000)}),data=await response.json();
   if(response.ok&&data.base==='CNY'&&['CNY','HKD','USD'].every(k=>Number(data.rates?.[k])>0)){
    try{localStorage.setItem('kitchen-display-rates-v1',JSON.stringify(data));}catch(_){}return data;
   }
  }catch(_){}
  try{const saved=JSON.parse(localStorage.getItem('kitchen-display-rates-v1'));if(saved?.rates&&['CNY','HKD','USD'].every(k=>Number(saved.rates[k])>0))return {...saved,source:'cached'};}catch(_){}
  return {rates:config.fallbackRates,source:'demo',date:null};
 }
 const ready=Promise.all([window.KitchenLocale.detect(),rates()]).then(([region,fx])=>{
  const fixed=config.followIpCurrency===false;
  current={currency:fixed?(config.defaultCurrency||'HKD'):region.market==='HK'?'HKD':region.market==='CN'?'CNY':'USD',market:fixed?(config.defaultMarket||'HK'):region.market,rates:fx.rates,source:fx.source,date:fx.date||null,regionSource:fixed?'fixed':region.source};
  window.dispatchEvent(new Event('kitchen-pricing-ready'));return {...current};
 });
 window.KitchenPricing={ready,format,convert,formatRecorded,savings,note,chefQuote,chefFormat,chefDescription,chefNote,currency:()=>current.currency,rate:()=>current.rates[current.currency]||1,snapshot:()=>({...current})};
})();
