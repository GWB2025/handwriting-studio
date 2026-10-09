const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('built pages have unique control IDs and working local asset and help links',()=>{
 const root=path.join(__dirname,'../docs'),pages=fs.readdirSync(root).filter(f=>f.endsWith('.html')),contents=Object.fromEntries(pages.map(f=>[f,fs.readFileSync(path.join(root,f),'utf8')]));
 for(const [name,html] of Object.entries(contents)){
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,name+' contains duplicate control IDs');
  for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
   const link=new URL(match[1],'https://local.invalid/'+name);if(link.origin!=='https://local.invalid')continue;
   const url=link.pathname.slice(1),target=path.join(root,url);assert(fs.existsSync(target),name+' links to missing '+url);
   if(link.hash&&contents[url])assert(contents[url].includes('id="'+link.hash.slice(1)+'"'),name+' has a broken help anchor');
  }
 }
 assert(contents['compose.html'].indexOf('assets/compositions.js')<contents['compose.html'].indexOf('assets/compose.js'));
});
