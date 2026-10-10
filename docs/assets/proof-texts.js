(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.StudioProofTexts=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 'use strict';
 const pangrams=[
  ['quick-fox','The quick brown fox','the quick brown fox jumps over the lazy dog'],
  ['pack-box','Pack my box','pack my box with five dozen liquor jugs'],
  ['sphinx','Sphinx of black quartz','sphinx of black quartz judge my vow'],
  ['zebras','How vexingly quick','how vexingly quick daft zebras jump'],
  ['wizards','The five boxing wizards','the five boxing wizards jump quickly'],
  ['vixens','Bright vixens','bright vixens jump dozy fowl quack'],
  ['waltz','Waltz, bad nymph','waltz bad nymph for quick jigs vex'],
  ['jackdaws','Jackdaws love','jackdaws love my big sphinx of quartz']
 ].map(([id,label,text])=>({id,label,text,group:'Pangrams',note:'Each pangram uses all 26 lowercase letters. You can edit the text below.'}));
 // Public-domain poem, transcribed from https://shakespeare.mit.edu/Poetry/sonnet.XVIII.html.
 const sonnet=`Shall I compare thee to a summer's day?
Thou art more lovely and more temperate:
Rough winds do shake the darling buds of May,
And summer's lease hath all too short a date:
Sometime too hot the eye of heaven shines,
And often is his gold complexion dimm'd;
And every fair from fair sometime declines,
By chance or nature's changing course untrimm'd;
But thy eternal summer shall not fade
Nor lose possession of that fair thou owest;
Nor shall Death brag thou wander'st in his shade,
When in eternal lines to time thou growest:
So long as men can breathe or eyes can see,
So long lives this and this gives life to thee.`;
 return {pangrams,examples:[...pangrams,
  {id:'all-pangrams',label:'All eight pangrams',text:pangrams.map(p=>p.text).join('\n\n'),group:'Text passages',passage:true,note:'Eight pangrams, separated by a blank line. You can edit or replace the passage below.'},
  {id:'sonnet-lowercase',label:'Sonnet 18 · lowercase letters only',text:sonnet.toLowerCase().replace(/[^a-z \n]/g,''),group:'Text passages',passage:true,sonnet:true,note:'William Shakespeare’s Sonnet 18, in lowercase with punctuation omitted. The fourteen verse lines are kept.'},
  {id:'sonnet-original',label:'Sonnet 18 · original text',text:sonnet,group:'Text passages',passage:true,sonnet:true,note:'William Shakespeare’s Sonnet 18. Requires saved capitals and punctuation as well as lowercase letters; missing samples are listed before export.'}
 ]};
});
