"""Local server with DeepSeek/OpenAI-compatible vision and text endpoints.
Set API_KEY in the backend .env, then run python server.py.
Do not put secrets into client code or commit them to source control.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import base64, hashlib, json, os, re, urllib.error, urllib.parse, urllib.request, time
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
PHOTO_DIR=ROOT/'assets'/'dish-photos'
PHOTO_DIR.mkdir(parents=True,exist_ok=True)

def load_env_file(path):
    """Load a local .env without adding a third-party dependency."""
    if not path.exists():
        return
    for raw in path.read_text(encoding='utf-8').splitlines():
        line=raw.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('export '):
            line=line[7:].strip()
        if '=' not in line:
            continue
        name,value=line.split('=',1)
        name=name.strip();value=value.strip()
        if len(value)>=2 and value[0]==value[-1] and value[0] in ('"',"'"):
            value=value[1:-1]
        if name and name not in os.environ:
            os.environ[name]=value

load_env_file(ROOT/'.env')
PORT = int(os.environ.get('PORT', '8765'))
PROVIDER = os.environ.get('API_PROVIDER','deepseek')
default_base = 'https://api.deepseek.com' if PROVIDER=='deepseek' else 'https://api.openai.com/v1'
default_model = 'deepseek-flash' if PROVIDER=='deepseek' else 'gpt-4o-mini'
API_BASE = os.environ.get('API_BASE',os.environ.get('OPENAI_API_BASE',default_base)).rstrip('/')
KEY = os.environ.get('API_KEY',os.environ.get('DEEPSEEK_API_KEY',os.environ.get('OPENAI_API_KEY','')))
VISION_MODEL = os.environ.get('VISION_MODEL', default_model)
TEXT_MODEL = os.environ.get('TEXT_MODEL', default_model)
REGION_CACHE = None
FX_CACHE = None

def display_exchange_rates():
    global FX_CACHE
    if FX_CACHE and time.time()-FX_CACHE['fetched_at']<3600:return FX_CACHE['data']
    try:
        request=urllib.request.Request('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',headers={'User-Agent':'AIHomeKitchenAssistant/1.0'})
        with urllib.request.urlopen(request,timeout=4) as response:root=ET.fromstring(response.read(200000))
        values={node.attrib['currency']:float(node.attrib['rate']) for node in root.iter() if 'currency' in node.attrib and 'rate' in node.attrib}
        date=next((node.attrib['time'] for node in root.iter() if 'time' in node.attrib),None)
        if not all(values.get(code,0)>0 for code in ('CNY','HKD','USD')):raise ValueError('Missing currency')
        data={'base':'CNY','rates':{'CNY':1,'HKD':values['HKD']/values['CNY'],'USD':values['USD']/values['CNY']},'date':date,'source':'ecb'}
        FX_CACHE={'fetched_at':time.time(),'data':data};return data
    except Exception:
        if FX_CACHE:return {**FX_CACHE['data'],'source':'cached'}
        return {'base':'CNY','rates':None,'source':'unavailable','date':None}

def approximate_region():
    """Best-effort IP region for local recommendations; never required for core flows."""
    global REGION_CACHE
    if REGION_CACHE is not None:return REGION_CACHE
    fallback={'country_code':'','country_name':'','city':'','source':'fallback'}
    try:
        request=urllib.request.Request('https://ipapi.co/json/',headers={'User-Agent':'AIHomeKitchenAssistant/1.0'})
        with urllib.request.urlopen(request,timeout=4) as response:data=json.load(response)
        REGION_CACHE={'country_code':str(data.get('country_code',''))[:4].upper(),'country_name':str(data.get('country_name',''))[:80],'city':str(data.get('city',''))[:80],'source':'ip'}
    except Exception:
        REGION_CACHE=fallback
    return REGION_CACHE

class ModelFormatError(Exception):
    pass

def parse_model_json(content):
    if isinstance(content,dict):return content
    if not isinstance(content,str):raise ModelFormatError('回复格式不完整')
    cleaned=content.strip()
    if cleaned.startswith('```'):
        cleaned=re.sub(r'^```(?:json)?\s*|\s*```$','',cleaned,flags=re.I|re.S).strip()
    try:return json.loads(cleaned)
    except json.JSONDecodeError:
        decoder=json.JSONDecoder()
        for match in re.finditer(r'\{',cleaned):
            try:
                value,_=decoder.raw_decode(cleaned[match.start():])
                if isinstance(value,dict):return value
            except json.JSONDecodeError:pass
    raise ModelFormatError('回复还没整理成稳定数据')

def model_request(messages, model, max_tokens=1400):
    if not KEY:
        raise ValueError('尚未配置 API Key。可以先手动编辑食材，或在页面下方配置 DeepSeek / OpenAI 兼容服务。')
    payload=json.dumps({'model':model,'messages':messages,'thinking':{'type':'disabled'},'temperature':0,'max_tokens':max_tokens,'response_format':{'type':'json_object'}},ensure_ascii=False).encode()
    req=urllib.request.Request(f'{API_BASE}/chat/completions',data=payload,headers={'Content-Type':'application/json','Authorization':'Bearer '+KEY},method='POST')
    with urllib.request.urlopen(req,timeout=55) as resp:
        data=json.load(resp)
    content=data['choices'][0]['message']['content']
    return parse_model_json(content)

def probe_connection(key, api_base):
    """Verify authentication without spending completion tokens."""
    req=urllib.request.Request(f'{api_base.rstrip("/")}/models',headers={'Authorization':'Bearer '+key,'Accept':'application/json'},method='GET')
    try:
        with urllib.request.urlopen(req,timeout=20) as resp:
            if 200 <= resp.status < 300:
                return True,''
            return False,'暂时无法确认这个 Key，请稍后再试。'
    except urllib.error.HTTPError as ex:
        if ex.code in (401,403):
            return False,'这个 API Key 没有通过验证。请撤销已暴露或已失效的 Key，再粘贴一把新 Key。'
        if ex.code==429:
            return False,'Key 可能有效，但当前额度、频率或账户状态暂时不可用。'
        return False,f'API 地址暂时无法使用（HTTP {ex.code}），请检查高级设置。'
    except (urllib.error.URLError,TimeoutError):
        return False,'暂时无法访问 API 地址，请检查网络或高级设置。'
    except Exception:
        return False,'暂时无法验证连接，请检查 Key 和 API 地址。'

def save_env_config():
    provider='deepseek' if API_BASE.startswith('https://api.deepseek.com') else ('openai' if API_BASE.startswith('https://api.openai.com') else 'custom')
    env_text='\n'.join([
        f'API_PROVIDER={provider}',f'API_KEY={KEY}',f'API_BASE={API_BASE}',
        f'TEXT_MODEL={TEXT_MODEL}',f'VISION_MODEL={VISION_MODEL}',f'PORT={PORT}',''
    ])
    env_path=ROOT/'.env';env_path.write_text(env_text,encoding='utf-8');os.chmod(env_path,0o600)

WEEKDAYS=['周一','周二','周三','周四','周五','周六','周日']
MEALS=['早餐','午餐','晚餐']
STAPLES=('大米','米饭','食用油','酱油','食盐','糖','盐')
ALLOWED_CATEGORIES={'蔬菜水果','肉蛋海鲜','主食调味','其他'}
IMAGE_CACHE={}
PHOTO_CACHE_VERSION='v3-real-food'
PHOTO_QUERIES={
    '燕麦水果杯':'fruit oatmeal breakfast','鸡蛋吐司':'scrambled egg toast breakfast','温牛奶':'Glass of Milk 33657535532',
    '鸡丝蔬菜汤面':'chicken vegetable noodle soup','凉拌黄瓜':'Chinese cucumber salad','苹果':'red apple fruit',
    '清蒸鲈鱼':'Chinese steamed perch','蒜蓉西兰花':'garlic broccoli dish','紫菜豆腐汤':'seaweed tofu soup','米饭':'steamed white rice bowl',
    '南瓜小米粥':'pumpkin millet porridge food photograph','煎蛋':'fried egg on plate breakfast photograph','番茄牛肉饭':'tomato beef rice bowl food photograph','清炒生菜':'stir fried lettuce food photograph',
    '冬菇蒸鸡':'steamed chicken mushroom Chinese','清炒菜心':'stir fried choy sum','玉米胡萝卜汤':'corn carrot soup',
    '酸奶水果碗':'yogurt fruit bowl','全麦面包':'whole wheat bread','虾仁蒸蛋':'Chinese steamed egg shrimp','蒜蓉油麦菜':'Chinese garlic lettuce',
    '番茄豆腐煲':'tomato tofu stew','清炒芥兰':'stir fried Chinese broccoli','莲藕排骨汤':'lotus root pork rib soup',
    '豆浆油条':'soy milk youtiao breakfast photograph','水煮蛋':'intitle:"Perfectly Boiled eggs picture"','青菜肉丝面':'pork vegetable noodle soup food photograph','凉拌番茄':'tomato salad food photograph',
    '白灼虾':'Chinese poached shrimp','蒜蓉娃娃菜':'garlic napa cabbage','冬瓜排骨汤':'winter melon pork rib soup',
    '玉米粥':'corn porridge','香蕉':'banana fruit','香菇鸡肉饭':'mushroom chicken rice','清炒西葫芦':'stir fried zucchini',
    '番茄炖牛腩':'tomato beef brisket stew','紫菜蛋花汤':'seaweed egg drop soup','全麦三明治':'whole wheat sandwich',
    '热牛奶':'Glass of Milk 33657535532','三文鱼拌饭':'salmon rice bowl','海带豆腐汤':'kelp tofu soup','豉汁蒸排骨':'steamed pork ribs black bean',
    '蚝油生菜':'oyster sauce lettuce','红薯小米粥':'sweet potato millet porridge','蒸鸡蛋':'Chinese steamed egg custard',
    '云吞面':'wonton noodles','白灼菜心':'Chinese poached choy sum','香菇滑鸡':'mushroom chicken Chinese','清炒时蔬':'stir fried vegetables',
    '番茄豆腐汤':'tomato tofu soup','清炒时蔬':'stir fried vegetables','番茄炖豆腐':'tomato tofu stew','香菇蒸鸡':'steamed chicken mushroom'
}

def dish_photo(name,photo_query=''):
    """Find a freely licensed real food photo on Wikimedia Commons."""
    clean=re.sub(r'[（(].*?[）)]|配米饭|套餐|组合','',str(name)).strip()[:40]
    if not clean:return None
    search=PHOTO_QUERIES.get(clean) or str(photo_query).strip()[:80] or clean
    cache_key=f'{PHOTO_CACHE_VERSION}|{clean}|{search}'
    if cache_key in IMAGE_CACHE:return IMAGE_CACHE[cache_key]
    file_key=hashlib.sha256(cache_key.encode('utf-8')).hexdigest()[:24]
    metadata_path=PHOTO_DIR/f'{file_key}.json'
    if metadata_path.exists():
        try:
            metadata=json.loads(metadata_path.read_text(encoding='utf-8'))
            local_path=PHOTO_DIR/metadata['filename']
            if local_path.exists():
                result={'url':f'/assets/dish-photos/{local_path.name}','credit':metadata.get('credit','Wikimedia Commons'),'source_url':metadata.get('source_url','')}
                IMAGE_CACHE[cache_key]=result
                return result
        except Exception:pass
    params=urllib.parse.urlencode({
        'action':'query','format':'json','formatversion':'2','generator':'search',
        'gsrsearch':search+' filetype:bitmap','gsrnamespace':'6','gsrlimit':'10','prop':'imageinfo',
        'iiprop':'url','iiurlwidth':'720','origin':'*'
    })
    request=urllib.request.Request('https://commons.wikimedia.org/w/api.php?'+params,headers={'User-Agent':'AIHomeKitchenAssistant/1.0 (local recipe prototype)'})
    try:
        with urllib.request.urlopen(request,timeout=12) as response:data=json.load(response)
        pages=data.get('query',{}).get('pages',[])
        pages=sorted(pages,key=lambda page:(not str(page.get('title','')).lower().endswith(('.jpg','.jpeg','.webp')),page.get('index',999)))
        for page in pages:
            info=(page.get('imageinfo') or [{}])[0]
            url=info.get('thumburl') or info.get('url')
            if not isinstance(url,str) or not url.startswith('https://'):continue
            title=str(page.get('title',''))
            suspicious=('collage','illustration','drawing','sculpt','cartoon','logo','icon','caterpillar','centipede','insect','bug','character','creative arrangement')
            if any(word in title.lower() for word in suspicious):continue
            source_url='https://commons.wikimedia.org/wiki/'+urllib.parse.quote(title.replace(' ','_'))
            image_request=urllib.request.Request(url,headers={'User-Agent':'AIHomeKitchenAssistant/1.0 (local recipe prototype)'})
            with urllib.request.urlopen(image_request,timeout=18) as image_response:
                mime=image_response.headers.get_content_type()
                extension={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}.get(mime)
                if not extension:continue
                image_data=image_response.read(6_000_001)
                if not image_data or len(image_data)>6_000_000:continue
            filename=file_key+extension
            temp_path=PHOTO_DIR/(filename+'.tmp')
            temp_path.write_bytes(image_data);os.replace(temp_path,PHOTO_DIR/filename)
            metadata={'filename':filename,'credit':'Wikimedia Commons','source_url':source_url}
            metadata_path.write_text(json.dumps(metadata,ensure_ascii=False),encoding='utf-8')
            result={'url':f'/assets/dish-photos/{filename}','credit':'Wikimedia Commons','source_url':source_url}
            IMAGE_CACHE[cache_key]=result
            return result
    except Exception:pass
    IMAGE_CACHE[cache_key]=None
    return None

def scheduled_servings(context,day,meal):
    participants=context.get('participants',[]) if isinstance(context,dict) else []
    if not isinstance(participants,list):return 0
    count=0
    for person in participants:
        if not isinstance(person,dict):continue
        participation=person.get('participation',{})
        if isinstance(participation,dict) and meal in participation.get(day,[]):count+=1
    return count

def normalize_unit_quantity(quantity,unit):
    unit=str(unit or '份').strip().lower()
    aliases={'g':'克','公克':'克','kg':'千克','公斤':'千克','ml':'毫升','l':'升','只':'个','枚':'个','颗':'个'}
    unit=aliases.get(unit,unit)[:10] or '份'
    if unit=='千克':return quantity*1000,'克'
    if unit=='升':return quantity*1000,'毫升'
    return quantity,unit

def normalize_ingredient(item):
    if not isinstance(item,dict):return None
    name=str(item.get('name','')).strip()[:32]
    category=str(item.get('category','其他'))
    def numeric(value):
        if isinstance(value,(int,float)):return float(value)
        match=re.search(r'-?\d+(?:\.\d+)?',str(value))
        return float(match.group()) if match else 0
    quantity=numeric(item.get('quantity',0));estimate=numeric(item.get('estimate',0))
    quantity,unit=normalize_unit_quantity(quantity,item.get('unit','份'))
    if not name or quantity<=0 or estimate<0:return None
    return {'name':name,'category':category if category in ALLOWED_CATEGORIES else '其他','quantity':round(quantity,2),'unit':unit,'estimate':round(estimate,2)}

def pantry_balances(context):
    inventory=context.get('inventory',{}) if isinstance(context,dict) else {}
    raw=inventory.get('ingredients',[]) if isinstance(inventory,dict) else []
    balances=[]
    for value in raw if isinstance(raw,list) else []:
        text=str(value).strip()
        if not text:continue
        match=re.match(r'^(.+?)\s*(\d+(?:\.\d+)?)\s*(kg|千克|公斤|g|克|公克|ml|毫升|l|升|个|只|枚|颗|盒|袋|瓶|份)?$',text,re.I)
        if match:
            quantity,unit=normalize_unit_quantity(float(match.group(2)),match.group(3) or '份')
            balances.append({'name':match.group(1).strip(),'quantity':quantity,'unit':unit,'unknown':False})
        else:balances.append({'name':text,'quantity':float('inf'),'unit':'','unknown':True})
    return balances

def same_ingredient(left,right):
    left=str(left).replace('西红柿','番茄').replace('鸡蛋','蛋').strip()
    right=str(right).replace('西红柿','番茄').replace('鸡蛋','蛋').strip()
    return left==right or (len(left)>=2 and left in right) or (len(right)>=2 and right in left)

def apply_inventory_and_budget(week,context):
    """Turn each dish's recipe ingredients into its remaining purchase needs."""
    balances=pantry_balances(context)
    purchases=[]
    for day in week:
        for meal in day['meals']:
            for dish in meal['dishes']:
                needed=[]
                for ingredient in dish.get('ingredients',[]):
                    if any(staple in ingredient['name'] for staple in STAPLES):continue
                    quantity=ingredient['quantity'];estimate=ingredient['estimate']
                    for balance in balances:
                        if not same_ingredient(ingredient['name'],balance['name']):continue
                        if balance['unknown']:
                            quantity=0;estimate=0;balance['quantity']=0;balance['unknown']=False
                        elif balance['unit']==ingredient['unit'] and balance['quantity']>0:
                            used=min(quantity,balance['quantity'])
                            ratio=(quantity-used)/quantity
                            quantity-=used;estimate*=ratio;balance['quantity']-=used
                        break
                    if quantity>0:
                        entry={**ingredient,'quantity':round(quantity,2),'estimate':round(estimate,2)}
                        needed.append(entry);purchases.append(entry)
                dish['ingredients']=needed
    budget_data=context.get('budget',{}) if isinstance(context,dict) else {}
    try:budget=max(0,float(budget_data.get('amount') or 0))
    except (TypeError,ValueError):budget=0
    total=sum(item['estimate'] for item in purchases)
    if budget and total>0:
        factor=(budget*.95)/total
        for item in purchases:item['estimate']=round(item['estimate']*factor,2)
    return budget

def shopping_from_week(week,context):
    merged={}
    for day in week:
        for meal in day['meals']:
            for dish in meal['dishes']:
                for ingredient in dish.get('ingredients',[]):
                    key=(ingredient['name'],ingredient['unit'])
                    source=f"{day['label']}{meal['title']}·{dish['name']}"
                    if key not in merged:merged[key]={**ingredient,'sources':[source]}
                    else:
                        merged[key]['quantity']=round(merged[key]['quantity']+ingredient['quantity'],2)
                        merged[key]['estimate']=round(merged[key]['estimate']+ingredient['estimate'],2)
                        if source not in merged[key]['sources']:merged[key]['sources'].append(source)
    items=[]
    for index,item in enumerate(merged.values(),1):items.append({'id':f'generated-{index}',**item,'actual':None,'bought':False})
    budget_data=context.get('budget',{}) if isinstance(context,dict) else {}
    currency=budget_data.get('currency','HKD') if isinstance(budget_data,dict) else 'HKD'
    try:budget=max(0,float(budget_data.get('amount') or 0))
    except (TypeError,ValueError):budget=0
    total=round(sum(item['estimate'] for item in items),2)
    return {'items':items,'currency':currency if currency in ('CNY','HKD') else 'HKD','budget':round(budget,2),'planned_total':total,'target_min':round(budget*.92,2),'target_max':round(budget*.98,2)}

def normalize_replacements(value):
    raw=value.get('options',[]) if isinstance(value,dict) else []
    options=[]
    for item in raw[:3] if isinstance(raw,list) else []:
        if not isinstance(item,dict):continue
        name=str(item.get('name','')).strip()[:40]
        ingredients=[value for value in (normalize_ingredient(ingredient) for ingredient in item.get('ingredients',[])) if value]
        ingredients=[ingredient for ingredient in ingredients if not any(staple in ingredient['name'] for staple in STAPLES)]
        if not name or not ingredients:continue
        options.append({'name':name,'note':str(item.get('note','')).strip()[:80] or '符合当前家庭偏好','photo_query':str(item.get('photo_query','')).strip()[:80] or name,'ingredients':ingredients})
    if len(options)<3:raise ModelFormatError('替换菜品不完整')
    return options

def normalize_weekly_menu(value,context):
    """Convert model output into the only menu shape the browser is allowed to render."""
    raw_days=value.get('days',[]) if isinstance(value,dict) else []
    if not isinstance(raw_days,list) or len(raw_days)!=7:raise ModelFormatError('菜单日期不完整')
    normalized=[]
    for day_index,day_name in enumerate(WEEKDAYS):
        raw_day=raw_days[day_index]
        raw_meals=raw_day.get('meals',[]) if isinstance(raw_day,dict) else raw_day
        if not isinstance(raw_meals,list) or len(raw_meals)!=3:raise ModelFormatError('菜单餐次不完整')
        meals=[]
        for meal_index,meal_name in enumerate(MEALS):
            raw_meal=next((item for item in raw_meals if isinstance(item,dict) and item.get('type')==meal_name),raw_meals[meal_index])
            servings=scheduled_servings(context,day_name,meal_name)
            dishes=[]
            if servings:
                raw_dishes=raw_meal.get('dishes',[]) if isinstance(raw_meal,dict) else raw_meal
                if not isinstance(raw_dishes,list):raise ModelFormatError('菜品格式不完整')
                for dish in raw_dishes[:4]:
                    if isinstance(dish,dict):name,note,photo_query=dish.get('name',''),dish.get('note',''),dish.get('photo_query','')
                    elif isinstance(dish,list) and dish:name,note,photo_query=dish[0],dish[1] if len(dish)>1 else '',dish[0]
                    else:continue
                    name=str(name).strip()[:40]
                    note=str(note).strip()[:80]
                    ingredients=[]
                    if isinstance(dish,dict):ingredients=[value for value in (normalize_ingredient(item) for item in dish.get('ingredients',[])) if value]
                    if name and ingredients:dishes.append({'name':name,'note':note or '家常搭配','photo_query':str(photo_query).strip()[:80] or name,'ingredients':ingredients})
                if not dishes:raise ModelFormatError('有用餐人数的餐次缺少菜品')
            meals.append({'title':meal_name,'servings':servings,'dishes':dishes})
        normalized.append({'key':f'day-{day_index}','label':day_name,'meals':meals})
    apply_inventory_and_budget(normalized,context)
    shopping=shopping_from_week(normalized,context)
    summary=str(value.get('summary','')).strip()[:160]
    if not summary:summary='这周的三餐已经按家人的时间、口味和预算安排好了。'
    if shopping['budget']>0:
        symbol='¥' if shopping['currency']=='CNY' else 'HK$'
        summary=f'{summary.rstrip("。")}。预计采购约 {symbol}{shopping["planned_total"]:.0f}，会把预算主要用在新鲜食材和餐桌丰富度上。'
    return {'summary':summary[:220],'week':normalized,'shopping':shopping['items'],'budget_plan':{key:shopping[key] for key in ('currency','budget','planned_total','target_min','target_max')}}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kwargs): super().__init__(*a,directory=str(ROOT),**kwargs)
    def end_headers(self):
        if not self.path.startswith('/api/') and self.path.split('?',1)[0].endswith(('.html','.js','.css')):
            self.send_header('Cache-Control','no-cache, max-age=0, must-revalidate')
        super().end_headers()
    def do_GET(self):
        parsed=urllib.parse.urlparse(self.path)
        if parsed.path=='/api/status':
            provider='deepseek' if API_BASE.startswith('https://api.deepseek.com') else ('openai' if API_BASE.startswith('https://api.openai.com') else 'custom')
            return self.reply(200,{'api_configured':bool(KEY),'provider':provider,'api_base':API_BASE,'text_model':TEXT_MODEL,'vision_model':VISION_MODEL})
        if parsed.path=='/api/locale':
            return self.reply(200,approximate_region())
        if parsed.path=='/api/exchange-rates':
            return self.reply(200,display_exchange_rates())
        if parsed.path=='/api/dish-image':
            query=urllib.parse.parse_qs(parsed.query)
            name=query.get('name',[''])[0]
            photo=dish_photo(name,query.get('query',[''])[0])
            return self.reply(200,photo or {'url':None})
        return super().do_GET()
    def do_POST(self):
        global KEY, API_BASE, TEXT_MODEL, VISION_MODEL
        if self.path not in ('/api/vision','/api/parse-voice','/api/chat','/api/generate-menu','/api/recommend-replacements','/api/config'):
            return self.reply(404,{'error':'No such route'})
        try:
            length=int(self.headers.get('Content-Length',0))
            if length<=0 or length>3_000_000: return self.reply(413,{'error':'数据过大或为空'})
            payload=json.loads(self.rfile.read(length))
            if self.path=='/api/config':
                if payload.get('action')=='use_deepseek':
                    if not KEY:return self.reply(400,{'connected':False,'error':'请先填写并保存 DeepSeek API Key。'})
                    candidate_base='https://api.deepseek.com'
                    ok,error=probe_connection(KEY,candidate_base)
                    if not ok:return self.reply(400,{'connected':False,'error':error})
                    API_BASE=candidate_base;TEXT_MODEL='deepseek-flash';VISION_MODEL='deepseek-flash';save_env_config()
                    return self.reply(200,{'api_configured':True,'connected':True,'provider':'deepseek','text_model':TEXT_MODEL,'vision_model':VISION_MODEL})
                if payload.get('action')=='test':
                    if not KEY:return self.reply(400,{'connected':False,'error':'请先填写并保存 API Key。'})
                    ok,error=probe_connection(KEY,API_BASE)
                    return self.reply(200 if ok else 400,{'connected':ok,'error':error})
                if payload.get('action')=='remove':
                    KEY=''
                    env_path=ROOT/'.env'
                    if env_path.exists():env_path.unlink()
                    return self.reply(200,{'api_configured':False})
                key=payload.get('api_key','')
                api_base=payload.get('api_base','https://api.openai.com/v1')
                text_model=payload.get('text_model','gpt-4o-mini')
                vision_model=payload.get('vision_model',text_model)
                if not isinstance(key,str) or len(key.strip())<12 or any(c in key for c in '\r\n'):
                    return self.reply(400,{'error':'请填写有效的 API Key'})
                if not isinstance(api_base,str) or not re.match(r'^https://[^\s]+$|^http://(?:127\.0\.0\.1|localhost)(?::\d+)?(?:/[^\s]*)?$',api_base):
                    return self.reply(400,{'error':'API 地址需要使用 HTTPS；本机兼容服务可以使用 localhost'})
                if not all(isinstance(x,str) and re.match(r'^[A-Za-z0-9._:/-]{2,100}$',x) for x in (text_model,vision_model)):
                    return self.reply(400,{'error':'模型名称格式不正确'})
                candidate_key=key.strip();candidate_base=api_base.rstrip('/')
                ok,error=probe_connection(candidate_key,candidate_base)
                if not ok:return self.reply(400,{'api_configured':False,'connected':False,'error':error})
                KEY=candidate_key;API_BASE=candidate_base;TEXT_MODEL=text_model;VISION_MODEL=vision_model
                save_env_config()
                return self.reply(200,{'api_configured':True,'connected':True,'text_model':TEXT_MODEL,'vision_model':VISION_MODEL})
            if self.path=='/api/generate-menu':
                context=payload.get('context',{})
                request=payload.get('request','')
                if not isinstance(context,dict):return self.reply(400,{'error':'请先填写家庭资料'})
                if not isinstance(request,str):request=''
                messages=[{'role':'system','content':'''你是家庭一周菜单规划师。用户按下按钮后必须直接生成菜单，绝不追问或要求确认；缺少非关键资料时使用清淡、家常、易购买的默认值。严格避开每位成员的过敏与忌口。默认家里只有大米、食用油、酱油、糖、食盐，不把这五项计入预算；不能擅自默认有醋、面条、面粉或其他食材。

预算是本周希望实际使用的目标金额，不是只需低于的上限。新买食材的预计总额要达到预算的92%至98%。预算较高时，通过更丰富的菜数、更优质的肉类和水产、时令水果、奶制品及食材品质来合理使用预算，不要继续输出极低成本菜单，也不要为了凑数造成明显浪费。低预算则优先复用食材。每个有人员参加的早餐给1至2道，午晚餐给2至3道；无人参加返回空菜品。

每道菜必须附带 ingredients，列出这道菜按该餐实际用餐人数所需的全部主要食材；大米、食用油、酱油、糖和食盐不需列入。食材数量要可实际采购，estimate使用用户选择的币种表示该道菜中该项食材的预计成本。系统会从这些 ingredients 汇总采购清单，因此不得省略食材或另外虚构与菜谱无关的采购项。

不要输出解释、问题、内部参数或推理。仅返回JSON对象，格式必须为：{"summary":"一句自然短回复","days":[{"day":"周一","meals":[{"type":"早餐","dishes":[{"name":"菜名","note":"简短备注","photo_query":"准确描述该菜的简短英文实拍图搜索词","ingredients":[{"name":"食材名","category":"蔬菜水果或肉蛋海鲜或主食调味或其他","quantity":500,"unit":"克","estimate":30}]}]},{"type":"午餐","dishes":[]},{"type":"晚餐","dishes":[]}]}]}。days必须恰好7项并依次为周一至周日；每天必须依次包含早餐、午餐、晚餐。photo_query只描述对应成品菜，不包含人物或餐厅。'''} ,
                  {'role':'user','content':json.dumps({'household_context':context,'optional_request':request},ensure_ascii=False)}]
                result=None
                for attempt in range(2):
                    try:
                        out=model_request(messages,TEXT_MODEL,max_tokens=8000)
                        result=normalize_weekly_menu(out,context)
                        break
                    except ModelFormatError as error:
                        print(f'Menu normalization retry: {error}')
                        messages[0]['content']+=' 务必保证JSON语法和全部7天数据完整，不得省略对象键或使用中文标点代替JSON标点。每个有人用餐的餐次至少一道菜，每道菜必须有 ingredients 数组，quantity 和 estimate 必须是纯数字。'
                if result is None:raise ModelFormatError('菜单结构不完整')
                return self.reply(200,result)
            if self.path=='/api/recommend-replacements':
                context=payload.get('context',{})
                dish=payload.get('dish',{})
                excluded=payload.get('excluded',[])
                if not isinstance(context,dict) or not isinstance(dish,dict):return self.reply(400,{'error':'这道菜的资料不完整'})
                messages=[{'role':'system','content':'''你是家庭菜单中的单菜替换助手。根据家庭成员的菜系、口味、忌口、过敏、餐次、人数、现有食材和预算，推荐3道真正相关且风格明显的替换菜。若偏好包含日式或西餐，候选必须优先体现这些菜系，不能一律推荐中式清炒蔬菜。严格避开所有忌口和过敏，也不能返回当前菜或 excluded 中出现过的菜。

只返回JSON对象：{"options":[{"name":"菜名","note":"与偏好相关的简短说明","photo_query":"准确描述成品菜的英文实拍图搜索词","ingredients":[{"name":"食材","category":"蔬菜水果或肉蛋海鲜或主食调味或其他","quantity":500,"unit":"克","estimate":30}]}]}。必须恰好3项。ingredients 是按本餐实际人数所需的主要食材，不列大米、食用油、酱油、糖和食盐。'''
                },{'role':'user','content':json.dumps({'family_context':context,'current_dish':dish,'excluded':excluded},ensure_ascii=False)}]
                out=model_request(messages,TEXT_MODEL,max_tokens=2800)
                return self.reply(200,{'options':normalize_replacements(out)})
            if self.path=='/api/chat':
                message=payload.get('message','')
                context=payload.get('context',{})
                history=payload.get('history',[])
                if not isinstance(message,str) or not message.strip() or len(message)>3000:
                    return self.reply(400,{'error':'请先说说这周想怎么安排'})
                if not isinstance(context,dict):context={}
                if not isinstance(history,list):history=[]
                safe_history=[]
                for item in history[-8:]:
                    if isinstance(item,dict) and item.get('role') in ('user','assistant') and isinstance(item.get('content'),str):
                        safe_history.append({'role':item['role'],'content':item['content'][:1200]})
                messages=[{'role':'system','content':'''你是贴心的家庭厨房助手。根据家庭成员、餐次、忌口、预算、库存和用户补充要求进行简短自然的中文对话。默认家里已经有且只能默认有这五项：大米、食用油、酱油、糖、食盐；除非用户明确说缺少，否则不要再次询问这些物品，也不要把它们计入采购预算。这个默认列表不包含醋、面条、面粉或其他主食、调味料。预算默认只计算本周新买的蔬菜、肉、蛋、奶、水产等食材。不要使用“已解析参数”“生成成功”“模型”“JSON”等技术词，不展示内部数据或推理。当前菜单和预算清单页面仍在完善，因此只确认你理解的关键要求，并指出最多一个确实缺少的重要信息。返回严格JSON对象：reply为给用户看的两三句话；ready_for_menu为布尔值；missing为简短字符串数组。'''}]
                messages.extend(safe_history)
                messages.append({'role':'user','content':json.dumps({'request':message,'household_context':context},ensure_ascii=False)})
                try:out=model_request(messages,TEXT_MODEL)
                except ModelFormatError:
                    out={'reply':'好的，我记下了。默认家里已有大米、食用油、酱油、糖和盐，预算只计算这周新买的菜、肉、蛋等食材。','ready_for_menu':False,'missing':[]}
                reply=str(out.get('reply','')).strip()
                if not reply:reply='好的，我记下了。接下来会按家人的口味、忌口和预算一起安排。'
                # Some models expand “basic seasonings” into vinegar by habit.
                # Keep the user-visible pantry assumption limited to the exact five items.
                reply=reply.replace('油盐酱醋糖','食用油、酱油、糖和食盐').replace('油、盐、酱、醋、糖','食用油、酱油、糖和食盐')
                missing=out.get('missing',[])
                if not isinstance(missing,list):missing=[]
                return self.reply(200,{'reply':reply[:700],'ready_for_menu':bool(out.get('ready_for_menu')),'missing':[str(x)[:80] for x in missing[:3]]})
            if self.path=='/api/vision':
                image=payload.get('image','')
                if not re.match(r'^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$',image):
                    return self.reply(400,{'error':'请提供 JPG / PNG / WebP 照片'})
                messages=[{'role':'system','content':'你是食物图片识别助手。仅识别图片中可见的食材或现成菜品，不要编造重量、保质期或过敏原。输出严格JSON，键ingredients数组（每项{name,quantity}，量未知则quantity为空字符串），prepared_dishes字符串数组，notes字符串。用中文。无法确定的内容在notes中明确说明。'},
                  {'role':'user','content':[{'type':'text','text':'识别这张照片中能看到的食材和已做好的菜。不得凭图片估算精确数量。'},{'type':'image_url','image_url':{'url':image}}]}]
                out=model_request(messages,VISION_MODEL)
                return self.reply(200,{'ingredients':out.get('ingredients',[]),'prepared_dishes':out.get('prepared_dishes',[]),'notes':out.get('notes','')})
            text=payload.get('text','')
            if not isinstance(text,str) or len(text)>3000:return self.reply(400,{'error':'文字格式有误或过长'})
            current_people=payload.get('people',[])
            if not isinstance(current_people,list):current_people=[]
            messages=[{'role':'system','content':'''把一整段中文家庭用餐需求分别整理到对应成员。返回严格JSON对象，唯一顶层字段为people数组。每项包含id（能匹配现有成员时沿用其数字id，否则null）、index（对应现有成员的零基序号，不能确定则null）、name（用户说出的称呼）和patch。patch字段包括role（成人/儿童/长者/学生/上班族或null）、tastes（仅限清淡/偏咸/偏甜/偏辣/酸/少油）、cuisines（仅限粤菜/湘菜/川菜/浙菜/东北菜/日式/韩式/西餐/家常菜）、avoid（明确忌口原文）、weekdayLunchOff、weekendLunchOn、mealActions数组（{day:0-6,meal:0-2,participate:boolean}）。共同要求应复制到适用成员；个人要求不能串到其他人。只提取明确表达的信息，不推断，不输出解释文字。'''
             },{'role':'user','content':json.dumps({'existing_people':current_people,'family_request':text},ensure_ascii=False)}]
            out=model_request(messages,TEXT_MODEL)
            people_out=out.get('people',[])
            return self.reply(200,{'people':people_out if isinstance(people_out,list) else []})
        except urllib.error.HTTPError as ex:
            auth_error=ex.code in (401,403)
            message='厨房助手暂时还没准备好，请联系维护者检查后端服务。' if auth_error else '厨房助手这次没接稳，请稍后再试。'
            return self.reply(502,{'error':message,'auth_error':auth_error})
        except Exception as ex:
            print(f'Backend request failed: {type(ex).__name__}: {str(ex)[:180]}')
            return self.reply(503,{'error':'厨房助手这次没整理好，请再试一次。','auth_error':False})
    def reply(self,status,value):
        body=json.dumps(value,ensure_ascii=False).encode('utf-8')
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
if __name__=='__main__':
 print(f'Open http://localhost:{PORT}  |  Vision API: {"configured" if KEY else "not configured"}')
 ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()
