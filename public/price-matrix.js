(function(){
"use strict";
var definitions=[
 {key:"msrp",field:"msrp",label:"MSRP / cover price"},
 {key:"suggested_used",field:"priceUsed",label:"Suggested used price"},
 {key:"brick_mortar",field:"priceStore",label:"Brick-and-mortar price"},
 {key:"front_window",field:"priceFrontWindow",label:"Front-window / pop-culture price"},
 {key:"signed",field:"priceSigned",label:"Signed-copy price"},
 {key:"first_edition",field:"priceFirstEdition",label:"First edition / first printing price"},
 {key:"signed_first",field:"priceSignedFirst",label:"Signed + first-edition price"},
 {key:"arc",field:"priceArc",label:"Advance reading copy / proof price"},
 {key:"signed_arc",field:"priceSignedArc",label:"Signed ARC / proof price"},
 {key:"full_market",field:"priceFullMarket",label:"Market-rate / full-market (capitalist) price"},
 {key:"student_access",field:"priceStudentAccess",label:"Student / non-capitalist / community-access price"},
 {key:"installment_upfront",field:"priceInstallmentUpfront",label:"Installment plan / upfront payment"},
 {key:"installment",field:"priceInstallment",label:"Installment plan / total due"},
 {key:"custom",field:"priceCustom",label:"Custom / other price"}
];
var byKey={};definitions.forEach(function(x){byKey[x.key]=x});
function el(prefix,base){var id=prefix?prefix+base.charAt(0).toUpperCase()+base.slice(1):base;return document.getElementById(id);}
function numeric(input){if(!input||input.value==="")return null;var n=Number(input.value);return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:null;}
function value(prefix,base){var input=el(prefix,base);return input?input.value:"";}
function setValue(prefix,base,val){var input=el(prefix,base);if(input)input.value=val===undefined||val===null||val===""?"":String(val);}
function fieldHtml(prefix,field,label,placeholder){
 var id=prefix?prefix+field.charAt(0).toUpperCase()+field.slice(1):field;
 return '<div class="field"><label for="'+id+'">'+label.toUpperCase()+'</label><input id="'+id+'" type="number" min="0" step=".01" placeholder="'+(placeholder||"Manager to enter")+'"></div>';
}
function matrixHtml(prefix){
 var sourceId=prefix?"editPriceSource":"priceSource",customLabelId=prefix?"editPriceCustomLabel":"priceCustomLabel",notesId=prefix?"editPriceMatrixNotes":"priceMatrixNotes";
 var sourceOptions='<option value="">Manager to select during review</option>'+definitions.map(function(d){return '<option value="'+d.key+'">'+d.label+'</option>'}).join("");
 var inputs=definitions.filter(function(d){return d.key!=="msrp"&&d.key!=="custom"}).map(function(d){return fieldHtml(prefix,d.field,d.label)}).join("");
 var customId=prefix?"editPriceCustom":"priceCustom";
 var note="For fiction hardcovers only, the starter reference bands you supplied are: unsigned first edition / first printing $4–$10; signed copy $15–$50; ARC / proof $8–$20; signed ARC $30–$75+. Use them as research prompts—not automatic valuations. Confirm the physical copy, edition, condition and comparable sales.";
 return '<section class="price-matrix-panel field wide" aria-label="Flexible price matrix">'+
 '<div class="price-matrix-heading"><div><h3>Price matrix · choose the regular price</h3><p>Keep multiple price points on one item. Choose the regular/base price; other options remain saved for staff discretion at sale time.</p></div><span class="pill gold">MANAGER-SET</span></div>'+
 '<div class="field"><label for="'+sourceId+'">REGULAR PRICE IS BASED ON</label><select id="'+sourceId+'">'+sourceOptions+'</select><span class="fieldnote">Selecting an option copies its amount to Regular Asking Price. Unknown prices stay blank.</span></div>'+
 '<div class="price-matrix-grid">'+inputs+
 '<div class="field"><label for="'+customLabelId+'">CUSTOM OPTION / REASON</label><input id="'+customLabelId+'" maxlength="120" placeholder="e.g. student price, event special, wholesale-cost upfront"></div>'+
 fieldHtml(prefix,"priceCustom","Custom / other price")+
 '</div><div class="field"><label for="'+notesId+'">PRICE MATRIX NOTES / CONDITIONS</label><textarea id="'+notesId+'" rows="2" placeholder="Eligibility, event dates, installment schedule, payment terms or manager rationale…"></textarea></div>'+
 '<p class="fieldnote price-matrix-guidance">'+note+'</p></section>';
}
function inject(prefix){
 var msrp=el(prefix,"msrp");if(!msrp||!msrp.parentElement)return;
 if(el(prefix,"priceSource"))return;
 msrp.parentElement.insertAdjacentHTML("afterend",matrixHtml(prefix));
}
function inputForKey(prefix,key){var d=byKey[key];return d?el(prefix,d.field):null;}
function syncPriceFromSource(prefix){
 var source=el(prefix,"priceSource"),price=el(prefix,"price");
 if(!source||!price)return;
 var key=source.value;if(!key){price.value="";return;}
 var input=inputForKey(prefix,key),amount=numeric(input);
 price.value=amount===null?"":amount.toFixed(2);
}
function bind(prefix){
 var source=el(prefix,"priceSource"),price=el(prefix,"price");
 if(!source||!price)return;
 source.addEventListener("change",function(){syncPriceFromSource(prefix)});
 definitions.forEach(function(d){
  var input=inputForKey(prefix,d.key);
  if(!input)return;
  input.addEventListener("input",function(){if(source.value===d.key)price.value=numeric(input)===null?"":numeric(input).toFixed(2);});
 });
 price.addEventListener("change",function(){
  if(price.value==="")return;
  var amount=numeric(price);if(amount===null)return;
  // A direct override is recorded as its own named option instead of overwriting MSRP or another reference.
  source.value="custom";
  var customLabel=el(prefix,"priceCustomLabel"),custom=el(prefix,"priceCustom");
  if(customLabel&&!customLabel.value)customLabel.value="Manager-selected regular price";
  if(custom)custom.value=amount.toFixed(2);
 });
}
window.buildOneCopyPriceMatrix=function(prefix){
 prefix=prefix==="edit"?"edit":"";
 var options={};
 definitions.forEach(function(d){
  var input=inputForKey(prefix,d.key),amount=numeric(input);
  var label=d.key==="custom"?(value(prefix,"priceCustomLabel")||d.label):d.label;
  options[d.key]={label:label,amount:amount,notes:d.key==="custom"?value(prefix,"priceMatrixNotes"):""};
 });
 return {version:1,regular_key:value(prefix,"priceSource")||"",custom_label:value(prefix,"priceCustomLabel"),notes:value(prefix,"priceMatrixNotes"),options:options};
};
window.hydrateOneCopyPriceMatrix=function(prefix,matrix){
 prefix=prefix==="edit"?"edit":"";
 var opts=matrix&&matrix.options&&typeof matrix.options==="object"?matrix.options:{};
 if(opts.msrp&&opts.msrp.amount!==null&&opts.msrp.amount!==undefined)setValue(prefix,"msrp",opts.msrp.amount);
 definitions.forEach(function(d){
  if(d.key==="msrp")return;
  var option=opts[d.key];
  setValue(prefix,d.field,option&&option.amount!==null&&option.amount!==undefined?option.amount:"");
 });
 setValue(prefix,"priceCustomLabel",matrix&&matrix.custom_label||"");
 setValue(prefix,"priceMatrixNotes",matrix&&matrix.notes||"");
 setValue(prefix,"priceSource",matrix&&matrix.regular_key||"");
};
inject("");
inject("edit");
bind("");
bind("edit");
var originalOpen=window.openProductEditor;
if(typeof originalOpen==="function"){
 window.openProductEditor=function(product){originalOpen(product);window.hydrateOneCopyPriceMatrix("edit",product&&product.pricing_matrix);};
}
if(typeof window.installHelp==="function")window.installHelp();
})();