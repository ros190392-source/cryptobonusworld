#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const ORIGIN = 'https://cryptobonusworld.com';
const EXPECTED_PUBLIC = 19;

if (!existsSync(DIST)) {
  console.error('CBW PUBLIC SEO METADATA: ERROR — dist missing; run production build first');
  process.exit(1);
}

function findHtml(dir,out=[]){for(const entry of readdirSync(dir,{withFileTypes:true})){const full=resolve(dir,entry.name);if(entry.isDirectory())findHtml(full,out);else if(entry.isFile()&&entry.name.endsWith('.html'))out.push(full);}return out;}
function routeForFile(file){const rel=relative(DIST,file).split(sep).join('/');if(rel==='index.html')return'/';if(rel==='404.html')return'/404.html';if(rel.endsWith('/index.html'))return`/${rel.slice(0,-'index.html'.length)}`;return`/${rel}`;}
function tags(html,name){return html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi'))??[];}
function attr(tag,name){return tag?.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`,'i'))?.[1]??null;}
function metaBy(html,key,value){return tags(html,'meta').find(tag=>new RegExp(`${key}\\s*=\\s*["']${value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`,'i').test(tag))??null;}
function metaContent(html,key,value){return attr(metaBy(html,key,value),'content');}
function canonicalTags(html){return tags(html,'link').filter(tag=>/rel\s*=\s*["']canonical["']/i.test(tag));}
function title(html){return html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()??'';}
function state(route,html){if(route==='/404.html')return'error';if(route.startsWith('/__design/'))return'design';if(route.startsWith('/preview/'))return'preview';if(/\bnoindex\b/i.test(metaContent(html,'name','robots')??''))return'noindex';return'public';}
function absoluteSelf(route,href){if(!href)return false;try{const u=new URL(href);return u.origin===ORIGIN&&u.pathname===route&&u.search===''&&u.hash==='';}catch{return false;}}
function jsonLdBlocks(html){return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1].trim());}
function sitemapPaths(){const path=resolve(DIST,'sitemap.xml');if(!existsSync(path))return[];const xml=readFileSync(path,'utf8');return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>{try{const u=new URL(match[1].trim());return u.origin===ORIGIN?u.pathname:null;}catch{return null;}}).filter(Boolean).sort();}

let checks=0;const failures=[];function check(label,ok,detail=''){checks+=1;if(!ok)failures.push(detail?`${label}: ${detail}`:label);}
const rows=findHtml(DIST).map(file=>{const html=readFileSync(file,'utf8');const route=routeForFile(file);return{route,html,state:state(route,html)};});
const publicRows=rows.filter(row=>row.state==='public').sort((a,b)=>a.route.localeCompare(b.route));
check('SEO: exactly 19 public routes',publicRows.length===EXPECTED_PUBLIC,`count=${publicRows.length}`);

const titles=[];const descriptions=[];const canonicalOwners=new Map();
for(const row of publicRows){const pageTitle=title(row.html);const descTags=tags(row.html,'meta').filter(tag=>/name\s*=\s*["']description["']/i.test(tag));const description=attr(descTags[0],'content')?.trim()??'';const canonTags=canonicalTags(row.html);const canonical=attr(canonTags[0],'href');const ogUrlTags=tags(row.html,'meta').filter(tag=>/property\s*=\s*["']og:url["']/i.test(tag));const ogUrl=attr(ogUrlTags[0],'content');const ogTitle=metaContent(row.html,'property','og:title')?.trim()??'';const ogDescription=metaContent(row.html,'property','og:description')?.trim()??'';const robots=metaContent(row.html,'name','robots')??'';
  check(`${row.route}: title present`,pageTitle.length>0);
  check(`${row.route}: one description`,descTags.length===1,`count=${descTags.length}`);
  check(`${row.route}: description present`,description.length>0);
  check(`${row.route}: one canonical`,canonTags.length===1,`count=${canonTags.length}`);
  check(`${row.route}: canonical is absolute self`,absoluteSelf(row.route,canonical),`canonical=${canonical}`);
  check(`${row.route}: no noindex robots`,!/\bnoindex\b/i.test(robots),`robots=${robots}`);
  check(`${row.route}: one og:url`,ogUrlTags.length===1,`count=${ogUrlTags.length}`);
  check(`${row.route}: og:url equals canonical`,ogUrl===canonical,`og=${ogUrl} canonical=${canonical}`);
  check(`${row.route}: og:title present`,ogTitle.length>0);
  check(`${row.route}: og:description equals description`,ogDescription===description,`og=${ogDescription} desc=${description}`);
  titles.push([row.route,pageTitle]);descriptions.push([row.route,description]);
  if(canonical)canonicalOwners.set(canonical,[...(canonicalOwners.get(canonical)??[]),row.route]);
  const ld=jsonLdBlocks(row.html);for(let i=0;i<ld.length;i+=1){let parsed=null;try{parsed=JSON.parse(ld[i]);}catch{}check(`${row.route}: JSON-LD ${i+1} parseable`,parsed!==null);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)){check(`${row.route}: JSON-LD ${i+1} has @context`,typeof parsed['@context']==='string'&&parsed['@context'].length>0);check(`${row.route}: JSON-LD ${i+1} has @type`,typeof parsed['@type']==='string'&&parsed['@type'].length>0);}}
}

const duplicateTitles=[...new Map(titles.map(([route,value])=>[value,titles.filter(([,v])=>v===value).map(([r])=>r)])).entries()].filter(([,routes])=>routes.length>1);
const duplicateDescriptions=[...new Map(descriptions.map(([route,value])=>[value,descriptions.filter(([,v])=>v===value).map(([r])=>r)])).entries()].filter(([,routes])=>routes.length>1);
const duplicateCanonicals=[...canonicalOwners.entries()].filter(([,routes])=>routes.length>1);
check('SEO: public titles are unique',duplicateTitles.length===0,JSON.stringify(duplicateTitles));
check('SEO: public descriptions are unique',duplicateDescriptions.length===0,JSON.stringify(duplicateDescriptions));
check('SEO: canonical ownership unique',duplicateCanonicals.length===0,JSON.stringify(duplicateCanonicals));

const expectedPaths=publicRows.map(row=>row.route).sort();const sitemap=sitemapPaths();
check('SEO: sitemap has exactly 19 local URLs',sitemap.length===EXPECTED_PUBLIC,`count=${sitemap.length}`);
check('SEO: sitemap equals public route set',JSON.stringify(sitemap)===JSON.stringify(expectedPaths),`sitemap=${JSON.stringify(sitemap)} public=${JSON.stringify(expectedPaths)}`);

if(failures.length){console.error(`CBW PUBLIC SEO METADATA: FAIL (${failures.length}/${checks})`);failures.forEach(f=>console.error(` - ${f}`));process.exitCode=1;}else{console.log(`CBW PUBLIC SEO METADATA: PASS (${checks}/${checks})`);console.log(`CBW PUBLIC SEO ROUTES: ${publicRows.length}; sitemap=${sitemap.length}; unique titles/descriptions/canonicals`);}
