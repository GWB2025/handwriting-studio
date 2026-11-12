'use strict';
// Display-only references. These never become captured strokes or exported ink.
(function(root){
  const definitions={};
  function add(chars,name,top,bottom,lines,width=80){for(const character of chars)definitions[character]={name,top,bottom,lines,width};}
  // Heights are relative to the small-letter height: baseline = 0, tall line = -2.
  add('.', 'Full stop',-.10,0,['Dot on the baseline'],18);
  add(',', 'Comma',-.10,.35,['Start on the baseline','Tail dips below it'],24);
  add(':', 'Colon',-1,0,['Upper dot near small line','Lower dot on baseline'],24);
  add(';', 'Semicolon',-1,.35,['Dot near small-letter line','Comma dips below baseline'],28);
  add('!', 'Exclamation mark',-2,0,['Start near tall-letter line','Dot on the baseline'],35);
  add('?', 'Question mark',-2,0,['Start near tall-letter line','Dot on the baseline'],70);
  add("'", 'Apostrophe',-2,-1.55,['Near tall-letter line','Well above the baseline'],28);
  add('"', 'Double quote',-2,-1.55,['Both marks near tall line','Well above the baseline'],55);
  add('‘', 'Opening single quote',-2,-1.55,['Near tall-letter line','Well above the baseline'],28);
  add('’', 'Closing single quote',-2,-1.55,['Near tall-letter line','Well above the baseline'],28);
  add('“', 'Opening double quote',-2,-1.55,['Both marks near tall line','Well above the baseline'],55);
  add('”', 'Closing double quote',-2,-1.55,['Both marks near tall line','Well above the baseline'],55);
  add('^', 'Caret',-2,-1.55,['Near tall-letter line','Point faces upwards'],70);
  add('_', 'Underscore',.25,.30,['Horizontal stroke','Just below the baseline'],90);
  add('-', 'Hyphen',-.55,-.45,['Halfway between small line','and baseline · short stroke'],48);
  add('–', 'En dash',-.55,-.45,['Halfway between small line','and baseline · medium stroke'],70);
  add('—', 'Em dash',-.55,-.45,['Halfway between small line','and baseline · long stroke'],100);
  for(const [character,name] of [['(','Opening parenthesis'],[')','Closing parenthesis'],['[','Opening square bracket'],[']','Closing square bracket'],['{','Opening brace'],['}','Closing brace']])add(character,name,-2,.3,['From tall-letter line','to just below baseline'],55);
  add('+', 'Plus',-.95,-.05,['Centre between small line','and the baseline'],75);
  add('=', 'Equals',-.7,-.3,['Centre between small line','and the baseline'],75);
  add('/', 'Forward slash',-2,0,['From baseline at left','to tall line at right'],65);
  for(const [character,name] of [['@','At sign'],['£','Pound sign'],['$','Dollar sign'],['€','Euro sign'],['%','Percent'],['&','Ampersand'],['#','Hash']])add(character,name,-2,0,['About capital-letter height','Rest on the baseline'],100);

  function placement(character,guides){
    const definition=definitions[character];if(!definition)return null;
    const height=guides.baseline-guides.x_height;
    return {...definition,top:guides.baseline+definition.top*height,bottom:guides.baseline+definition.bottom*height};
  }
  function glyph(context,text,x,top,bottom,width,colour){
    context.save();context.font='120px Georgia, serif';context.textAlign='left';context.textBaseline='alphabetic';
    const m=context.measureText(text),left=m.actualBoundingBoxLeft,right=m.actualBoundingBoxRight,ascent=m.actualBoundingBoxAscent,descent=m.actualBoundingBoxDescent;
    const sy=(bottom-top)/(ascent+descent),sx=Math.min(width/(left+right),sy);
    context.translate(x-(right-left)*sx/2,bottom-descent*sy);context.scale(sx,sy);context.fillStyle=colour;context.fillText(text,0,0);context.restore();
  }
  function draw(context,character,x,width,guides,labelScale){
    const p=placement(character,guides);if(!p)return;
    const centre=x+width/2,offset=Math.min(84,width*.34);
    glyph(context,'a',centre-offset,guides.x_height,guides.baseline,42,'#ced7d1');
    glyph(context,'a',centre+offset,guides.x_height,guides.baseline,42,'#ced7d1');
    glyph(context,character,centre,p.top,p.bottom,p.width,'#c0d4e2');
    context.save();context.font=(11*Math.min(labelScale,2))+'px -apple-system, sans-serif';context.fillStyle='#52675f';context.textAlign='center';
    context.fillText('Position example',centre,125,width-20);
    p.lines.forEach((line,i)=>context.fillText(line,centre,445+i*28,width-20));context.restore();
  }
  const api={placement,draw};if(typeof module!=='undefined')module.exports=api;else root.StudioSymbolGuides=api;
})(typeof window==='undefined'?globalThis:window);
