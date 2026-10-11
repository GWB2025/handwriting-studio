// Small event/DOM harness, matching the dependency-free screen tests in this project.
function environment(){
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.nodeType=1;this.children=[];this.parentNode=null;this.attrs={};this.style={};this.listeners={};this._text='';this.hidden=false;this.disabled=false;this.rect={left:20,top:50,right:220,bottom:94,width:200,height:44};}
  get parentElement(){return this.parentNode?.nodeType===1?this.parentNode:null;}
  get id(){return this.attrs.id||'';}set id(v){this.attrs.id=v;}
  get className(){return this.attrs.class||'';}set className(v){this.attrs.class=v;}
  get classList(){return {toggle:(name,on)=>{const list=new Set(this.className.split(' ').filter(Boolean));if(on??!list.has(name))list.add(name);else list.delete(name);this.className=[...list].join(' ');}};}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}set textContent(v){this._text=v;this.children.forEach(c=>c.parentNode=null);this.children=[];}
  get isConnected(){return doc.contains(this);}
  append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node);}}
  remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}}
  setAttribute(k,v){this.attrs[k]=String(v);if(k==='disabled')this.disabled=true;if(k==='hidden')this.hidden=true;}
  getAttribute(k){return this.attrs[k]??null;}
  removeAttribute(k){delete this.attrs[k];if(k==='disabled')this.disabled=false;if(k==='hidden')this.hidden=false;}
  matches(selector){return selector.split(',').some(s=>{
   s=s.trim();const descendant=s.match(/^(\S+) (\S+)$/);if(descendant)return this.matches(descendant[2])&&!!this.parentElement?.closest(descendant[1]);
   const not=s.match(/:not\(([^)]+)\)/);if(not){if(this.matches(not[1]))return false;s=s.replace(not[0],'');}
   const attr=s.match(/\[([^=\]]+)(?:="([^"]+)")?\]/);if(attr){const value=this.getAttribute(attr[1]);if(value===null||(attr[2]!==undefined&&value!==attr[2]))return false;s=s.replace(attr[0],'');}
   if(s.startsWith('#'))return this.id===s.slice(1);if(s.startsWith('.'))return this.className.split(' ').includes(s.slice(1));return !s||this.tagName===s.toUpperCase();
  });}
  closest(s){for(let node=this;node;node=node.parentElement)if(node.matches(s))return node;return null;}
  querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  contains(node){for(let n=node;n;n=n.parentNode)if(n===this)return true;return false;}
  getBoundingClientRect(){return this.rect;}
  addEventListener(type,fn,capture=false){(this.listeners[type]??=[]).push({fn,capture:capture===true||capture.capture===true});}
  focus(){doc.activeElement=this;emit(this,'focusin');}
  blur(){if(doc.activeElement===this)doc.activeElement=doc.body;}
 }
 const doc=new Element('document');doc.createElement=tag=>new Element(tag);doc.body=new Element('body');doc.append(doc.body);doc.getElementById=id=>doc.querySelector('#'+id);doc.activeElement=doc.body;
 const timers=new Map();let serial=0;const win={innerWidth:1024,innerHeight:768,listeners:{},addEventListener:Element.prototype.addEventListener,
  setTimeout(fn){const id=++serial;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},MutationObserver:class{constructor(fn){this.deliver=fn;win.observer=this;}observe(node,options){this.node=node;this.options=options;}}};
 function emit(target,type,props={}){
  const event={target,type,pointerId:1,pointerType:'mouse',button:0,buttons:0,relatedTarget:null,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...props};
  const path=[];for(let n=target;n;n=n.parentNode)path.push(n);
  for(const node of [...path].reverse())for(const l of node.listeners[type]||[]){if(l.capture&&!event.stopped)l.fn(event);}
  for(const node of path){for(const l of node.listeners[type]||[]){if(!l.capture&&!event.stopped)l.fn(event);}if(!event.stopped)node['on'+type]?.(event);}
  return event;
 }
 function add(tag,id,parent=doc.body,attrs={}){const node=new Element(tag);node.id=id;for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);parent.append(node);return node;}
 function tick(){for(const [id,fn] of [...timers]){timers.delete(id);fn();}}
 return {doc,win,add,emit,tick,Element};
}
module.exports={environment};
