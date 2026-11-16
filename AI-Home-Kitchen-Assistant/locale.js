(function(){
 let cached=null,pending=null;
 function fallbackRegion(){const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'',language=navigator.language||'';if(zone==='Asia/Hong_Kong'||language.toLowerCase().includes('zh-hk'))return {market:'HK',country_code:'HK',city:'香港',source:'device'};if(zone==='Asia/Shanghai'||language.toLowerCase()==='zh-cn')return {market:'CN',country_code:'CN',city:'',source:'device'};return {market:window.APP_CONFIG.pricing.defaultMarket||'HK',country_code:'HK',city:'香港',source:'default'};}
 async function resolveRegion(){
  for(const url of ['/api/locale','https://ipapi.co/json/']){
   try{
    const response=await fetch(url,{cache:'no-store',credentials:url.startsWith('https:')?'omit':'same-origin',signal:AbortSignal.timeout(url.startsWith('https:')?3500:2500)});
    const data=response.ok?await response.json():{},code=String(data.country_code||data.country||'').toUpperCase();
    if(!data.error&&/^[A-Z]{2}$/.test(code)){cached={country_code:code,city:String(data.city||'').slice(0,80),market:code==='HK'?'HK':code==='CN'?'CN':'GLOBAL',source:'ip'};return cached;}
   }catch(_){}
  }
  cached=fallbackRegion();return cached;
 }
 function detect(){if(cached)return Promise.resolve(cached);if(!pending)pending=resolveRegion();return pending;}
 function videoSearch(platform,query){const q=encodeURIComponent(`${query} 做法 教学`);return ({xiaohongshu:`https://www.xiaohongshu.com/search_result?keyword=${q}`,bilibili:`https://search.bilibili.com/all?keyword=${q}`,douyin:`https://www.douyin.com/search/${q}`,youtube:`https://www.youtube.com/results?search_query=${q}`,instagram:`https://www.instagram.com/explore/search/keyword/?q=${q}`,tiktok:`https://www.tiktok.com/search?q=${q}`})[platform]||`https://www.youtube.com/results?search_query=${q}`;}
 window.KitchenLocale={detect,videoSearch};
})();
