#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const ORIGIN = 'https://cryptobonusworld.com';
const EXPECTED_PUBLIC = 19;
const MAX_CLIENT_JS_BYTES_PER_PUBLIC_PAGE = 64 * 1024;
const ALLOWED_EXTERNAL_STYLESHEET_HOSTS = new Set(['fonts.googleapis.com']);

if (!existsSync(DIST)) {
  console.error('CBW PUBLIC ASSET/WEIGHT: ERROR — dist missing; run production build first');
  process.exit(1);
}

function findHtml(dir,out=[]){for(const entry of readdirSync(dir,{withFileTypes:true})){const full=resolve(dir,entry.name);if(entry.isDirectory())findHtml(full,out);else if(entry.isFile()&&entry.name.endsWith('.html'))out.push(full);}return out;}
function routeForFile(file){const rel=relative(DIST,file).split(sep).join('/');if(rel==='index.html')return'/';if(rel==='404.html')return'/404.html';if(rel.endsWith('/index.html'))return`/${rel.slice(0,-'index.html'.length)}`;return`/${rel}`;}
function tags(html,name){return html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi'))??[];}
function attr(tag,name){return tag?.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`,'i'))?.[1]??null;}
function metaContent(html,key,value){const tag=tags(html,'meta').find(row=>new RegExp(`${key}\\s*=\\s*["']${value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`,'i').test(row));return attr(tag,'content');}
function state(route,html){if(route==='/404.html')return'error';if(route.startsWith('/__design/'))return'design';if(route.startsWith('/preview/'))return'preview';if(/\bnoindex\b/i.test(metaContent(html,'name','robots')??''))return'noindex';return'public';}
function localPath(value){if(!value||value.startsWith('data:')||value.startsWith('blob:'))return null;try{const u=new URL(value,ORIGIN);return u.origin===ORIGIN?decodeURIComponent(u.pathname):null;}catch{return null;}}
function distFile(pathname){if(!pathname||!pathname.startsWith('/'))return null;const file=resolve(DIST,pathname.replace(/^\/+/,''));if(file!==DIST&&!file.startsWith(`${DIST}${sep}`))return null;return file;}
function existsLocal(pathname){const file=distFile(pathname);return Boolean(file&&existsSync(file)&&statSync(file).isFile());}
function sizeLocal(pathname){const file=distFile(pathname);return file&&existsSync(file)&&statSync(file).isFile()?statSync(file).size:0;}
function relTokens(tag){return new Set((attr(tag,'rel')??'').toLowerCase().split(/\s+/).filter(Boolean));}

let checks=0;const failures=[];function check(label,ok,detail=''){checks+=1;if(!ok)failures.push(detail?`${label}: ${detail}`:label);}
const rows=findHtml(DIST).map(file=>{const html=readFileSync(file,'utf8');const route=routeForFile(file);return{route,html,state:state(route,html)};});
const publicRows=rows.filter(row=>row.state==='public').sort((a,b)=>a.route.localeCompare(b.route));
check('asset: exactly 19 public routes',publicRows.length===EXPECTED_PUBLIC,`count=${publicRows.length}`);

let maxJs={route:null,bytes:0};
const allBroken=[];
const allExternalScripts=[];
const allExternalStyles=[];
const missingImageDimensions=[];

for(const row of publicRows){
  const localAssets=new Set();
  let inlineJsBytes=0;

  for(const tag of tags(row.html,'img')){
    const src=attr(tag,'src');const path=localPath(src);if(path)localAssets.add(path);
    const width=attr(tag,'width');const height=attr(tag,'height');
    if(!(width&&height&&/^\d+$/.test(width)&&/^\d+$/.test(height)))missingImageDimensions.push(`${row.route} img=${src??'<none>'} width=${width} height=${height}`);
  }

  for(const tag of tags(row.html,'link')){
    const rel=relTokens(tag);const href=attr(tag,'href');
    if(!href)continue;
    if(rel.has('stylesheet')){
      const local=localPath(href);
      if(local)localAssets.add(local);else{try{const u=new URL(href,ORIGIN);if(!ALLOWED_EXTERNAL_STYLESHEET_HOSTS.has(u.hostname))allExternalStyles.push(`${row.route} -> ${href}`);}catch{allExternalStyles.push(`${row.route} -> ${href}`);}}
    }
    if(rel.has('icon')||rel.has('apple-touch-icon')||rel.has('manifest')||rel.has('preload')){const local=localPath(href);if(local)localAssets.add(local);}
  }

  for(const match of row.html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    const open=`<script${match[1]}>`;const src=attr(open,'src');const type=(attr(open,'type')??'').toLowerCase();
    if(src){const local=localPath(src);if(local)localAssets.add(local);else allExternalScripts.push(`${row.route} -> ${src}`);}
    else if(type!=='application/ld+json')inlineJsBytes+=Buffer.byteLength(match[2]??'','utf8');
  }

  const ogImage=metaContent(row.html,'property','og:image');if(ogImage){const local=localPath(ogImage);if(local)localAssets.add(local);}
  for(const asset of localAssets){if(!existsLocal(asset))allBroken.push(`${row.route} -> ${asset}`);}

  const localJs=[...localAssets].filter(path=>/\.m?js$/i.test(path));const localJsBytes=localJs.reduce((sum,path)=>sum+sizeLocal(path),0);const clientJsBytes=localJsBytes+inlineJsBytes;
  check(`${row.route}: client JS <=64KiB`,clientJsBytes<=MAX_CLIENT_JS_BYTES_PER_PUBLIC_PAGE,`bytes=${clientJsBytes} local=${localJsBytes} inline=${inlineJsBytes}`);
  if(clientJsBytes>maxJs.bytes)maxJs={route:row.route,bytes:clientJsBytes};
}

check('asset: no broken local references',allBroken.length===0,allBroken.slice(0,40).join(' | '));
check('asset: no external script src on public pages',allExternalScripts.length===0,allExternalScripts.slice(0,20).join(' | '));
check('asset: external stylesheet hosts are allowlisted',allExternalStyles.length===0,allExternalStyles.slice(0,20).join(' | '));
check('asset: all public images declare intrinsic width+height',missingImageDimensions.length===0,missingImageDimensions.slice(0,40).join(' | '));

if(failures.length){console.error(`CBW PUBLIC ASSET/WEIGHT: FAIL (${failures.length}/${checks})`);failures.forEach(f=>console.error(` - ${f}`));process.exitCode=1;}else{console.log(`CBW PUBLIC ASSET/WEIGHT: PASS (${checks}/${checks})`);console.log(`CBW MAX PUBLIC CLIENT JS: ${maxJs.bytes} bytes on ${maxJs.route}`);console.log('CBW CLIENT JS BUDGET: 65536 bytes/page (local referenced JS + non-JSON inline JS)');}
