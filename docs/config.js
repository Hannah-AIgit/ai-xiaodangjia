window.APP_CONFIG=Object.freeze({
 pricing:{baseCurrency:'CNY',defaultCurrency:'HKD',defaultMarket:'HK',followIpCurrency:false,fallbackRates:{CNY:1,HKD:1.1,USD:0.14}},
 membership:{
  basicMonthly:8,
  plusMonthly:12,
  trialDays:7,
 },
 homeChef:{
  payPerVisit:{id:'single',name:'单次上门做饭',price:100,visits:1,suffix:'/ 次'},
  threeVisits:{id:'three',name:'3 次上门套餐',price:300,visits:3},
  fiveVisits:{id:'five',name:'5 次上门套餐',price:500,visits:5},
  monthly:{id:'monthly',name:'做饭阿姨包月',price:2200,visits:22,suffix:'/ 月'},
 },
 homeChefMarkets:{
  CN:{name:'上海',hoursPerVisit:2,hourlyReference:50,sourceName:'云荷家政公开报价',sourceUrl:'https://yunhejz.com/sh/index/article.html?id=3586',monthlyRange:[2200,2200]},
  HK:{name:'香港',hoursPerVisit:3,hourlyReference:115,prices:{single:345,three:1035,five:1725,monthly:7590},sourceName:'ERB 乐活一站薪酬参考表',sourceUrl:'https://www.erb.org/smartliving/download/suggested_wages_tc.pdf',monthlyRange:[7260,7920]},
 },
 partnerCommissionRate:{min:0.03,max:0.08},
 demoPartners:['HKTVmall','Wellcome','ParknShop'],
 regionalServices:{
  HK:{video:[{id:'xiaohongshu',name:'小红书'},{id:'bilibili',name:'B站'},{id:'douyin',name:'抖音'},{id:'youtube',name:'YouTube'},{id:'instagram',name:'Instagram'}],grocery:[{name:'foodpanda / pandamart',url:'https://www.foodpanda.hk/'},{name:'HKTVmall',url:'https://www.hktvmall.com/'},{name:'Wellcome',url:'https://www.wellcome.com.hk/'},{name:'PARKnSHOP',url:'https://www.parknshop.com/'}],map:'https://www.google.com/maps/search/supermarket+wet+market/'},
  CN:{video:[{id:'xiaohongshu',name:'小红书'},{id:'bilibili',name:'B站'},{id:'douyin',name:'抖音'}],grocery:[{name:'美团买菜',url:'https://www.meituan.com/'},{name:'盒马',url:'https://www.freshippo.com/'},{name:'京东到家',url:'https://www.jddj.com/'}],map:'https://map.baidu.com/search/菜市场超市'},
  GLOBAL:{video:[{id:'youtube',name:'YouTube'},{id:'instagram',name:'Instagram'},{id:'tiktok',name:'TikTok'}],grocery:[{name:'Instacart',url:'https://www.instacart.com/'},{name:'Uber Eats',url:'https://www.ubereats.com/'},{name:'Amazon Fresh',url:'https://www.amazon.com/fresh'}],map:'https://www.google.com/maps/search/supermarket+grocery+market/'},
 },
 storage:{
  membership:'kitchen-membership-v1',
  shopping:'kitchen-shopping-v1',
  weeklyMenu:'kitchen-weekly-menu-v1',
  planning:'kitchen-planning-v1',
  planningContext:'kitchen-planning-context-v1',
  inventory:'kitchen-inventory-v1',
  bookings:'kitchen-home-chef-bookings-v1',
 },
});
