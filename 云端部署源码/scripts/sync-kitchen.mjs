import {readFileSync,writeFileSync,cpSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
const source=resolve(process.argv[2]||'/Users/mac/Downloads/AI-Home-Kitchen-Assistant');
mkdirSync('public',{recursive:true});mkdirSync('lib',{recursive:true});
for(const name of readdirSync(source)){if(/\.(html|css|js)$/.test(name)||name==='assets')cpSync(join(source,name),join('public',name),{recursive:true});}
const python=readFileSync(join(source,'server.py'),'utf8');
const prompts={};
for(const [name,route] of Object.entries({menu:'generate-menu',replacement:'recommend-replacements',chat:'chat',vision:'vision'})){
 const start=python.indexOf(`if self.path=='/api/${route}':`);
 const fragment=python.slice(start);
 const match=fragment.match(/'role':'system','content':(?:'''([\s\S]*?)'''|'([^'\n]*)')/);
 if(!match)throw Error('Missing prompt '+name);
 prompts[name]=match[1]||match[2];
}
prompts.voice=python.match(/'content':'''(把一整段中文家庭用餐需求[\s\S]*?)'''/)[1];
writeFileSync('lib/kitchen-prompts.json',JSON.stringify(prompts));
console.log('Copied current UI/assets and server prompts; no local secrets copied.');
