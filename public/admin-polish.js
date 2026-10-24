/* OneCopy Control Room polish layer. Kept separate from core workflows on purpose. */
(function(){
 "use strict";
 var $=function(sel,root){return (root||document).querySelector(sel)};
 var $$=function(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))};
 var previousFocus=null,activeModal=null;
 function safeStorageGet(key){try{return localStorage.getItem(key)}catch(e){return null}}
 function safeStorageSet(key,value){try{localStorage.setItem(key,value)}catch(e){}}
 function openModal(modal){
  if(!modal)return;
  if(activeModal&&activeModal!==modal)activeModal.hidden=true;
  previousFocus=document.activeElement;activeModal=modal;modal.hidden=false;document.body.classList.add("oc-modal-open");
  var focusTarget=$("input:not([type=hidden]),button:not([disabled]),[tabindex='0']",modal);
  if(focusTarget)setTimeout(function(){focusTarget.focus()},20);
 }
 function closeModal(){
  if(!activeModal)return;
  var restore=previousFocus;activeModal.hidden=true;activeModal=null;document.body.classList.remove("oc-modal-open");
  if(restore&&typeof restore.focus==="function")restore.focus();
 }
 function go(panel){
  closeModal();
  if(typeof window.setView==="function")window.setView(panel);
  else document.querySelectorAll("[data-panel]").forEach(function(el){el.classList.toggle("hidden",el.dataset.panel!==panel)});
  window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
 }
 var guideHtml=`
 <div id="ocGuideModal" class="oc-overlay" hidden>
  <section class="oc-dialog oc-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="ocGuideTitle" tabindex="-1">
   <div class="oc-dialog-head"><div><div class="kicker">OneCopy field guide</div><h2 id="ocGuideTitle">A calmer way to run the shop.</h2><p>Short instructions, daily workflow, safeguards and keyboard shortcuts.</p></div><button class="icon-button" type="button" data-oc-close aria-label="Close guide">×</button></div>
   <div class="oc-guide-content">
    <section class="oc-guide-block"><span class="oc-guide-mark">01</span><div><h3>Receive ordinary stock</h3><p>Open Receive Item and scan the ISBN first. OneCopy fills exact-edition metadata, checks for existing copies, and can optionally research pricing. Verify physical condition, cost, shelf location, signature and printing details. Use Save & scan next for rapid intake. New records remain private until reviewed.</p><button class="btn" data-oc-go="receive" type="button">Receive an item →</button></div></section>
    <section class="oc-guide-block"><span class="oc-guide-mark">02</span><div><h3>Identify unusual finds</h3><p>Use AI Item Capture for old editions, antiques, jewelry, clothing labels and maker’s marks. Capture sharp photos with low glare; check source links. Active asking prices are not the same as completed sales.</p><button class="btn secondary" data-oc-go="capture" type="button">Open AI capture →</button></div></section>
    <section class="oc-guide-block"><span class="oc-guide-mark">03</span><div><h3>Protect rare and uncertain items</h3><p>Keep unpriced, unusual, signed, potentially scarce or uncertain items in the restricted rear zone for partner review. Visual AI cannot authenticate signatures, metals, gemstones or provenance.</p><button class="btn secondary" data-oc-go="warehouse" type="button">Review store zones →</button></div></section>
    <section class="oc-guide-block"><span class="oc-guide-mark">04</span><div><h3>Review before publishing</h3><p>Check title, condition, price, quantity and physical location before approval. A unique copy normally has its own record. eBay publishing and withdrawal can affect live listings; confirm the item and policies first.</p><button class="btn secondary" data-oc-go="inventory" type="button">Open inventory →</button></div></section>
    <section class="oc-guide-block"><span class="oc-guide-mark">05</span><div><h3>Customize the storefront</h3><p>Preview copy, layout and colors in Website Design. Save a skin, review it at desktop and mobile sizes, then explicitly activate it. Previewing alone does not change the live theme.</p><button class="btn secondary" data-oc-go="design" type="button">Open Design Studio →</button></div></section>
    <section class="oc-guide-block"><span class="oc-guide-mark">06</span><div><h3>Privacy, exports and troubleshooting</h3><p>Keep API keys in Cloudflare secrets—never in GitHub or item notes. Inventory exports can contain acquisition costs and staff notes, so store them privately. If an integration action fails ambiguously, check its current status before repeating it.</p><button class="btn secondary" data-oc-go="ebay" type="button">Integration settings →</button></div></section>
   </div>
   <div class="oc-shortcuts"><div><kbd>Ctrl K</kbd> / <kbd>⌘ K</kbd><span>Quick actions</span></div><div><kbd>/</kbd><span>Find inventory</span></div><div><kbd>?</kbd><span>Open this guide</span></div><div><kbd>Esc</kbd><span>Close dialog</span></div></div>
  </section>
 </div>
 <div id="ocCommandModal" class="oc-overlay" hidden>
  <section class="oc-dialog oc-command-dialog" role="dialog" aria-modal="true" aria-labelledby="ocCommandTitle">
   <div class="oc-command-input-wrap"><span class="oc-command-symbol">⌕</span><input id="ocCommandQuery" type="search" autocomplete="off" placeholder="Search actions, tools and workspaces…" aria-label="Search OneCopy actions"><kbd>Esc</kbd></div>
   <h2 id="ocCommandTitle" class="sr-only">Quick actions</h2><div id="ocCommandResults" class="oc-command-results"></div>
   <div class="oc-command-foot"><span>Choose an action to continue.</span><span><kbd>Ctrl K</kbd> to open</span></div>
  </section>
 </div>`;
 var commands=[
  {id:"overview",label:"Overview",detail:"Daily activity, inventory health and quick actions",icon:"⌂",run:function(){go("overview")}},
  {id:"receive",label:"Receive item",detail:"Create a new private inventory record",icon:"＋",run:function(){go("receive")}},
  {id:"capture",label:"AI item capture",detail:"Identify books, antiques, clothing or jewelry from photos",icon:"◎",run:function(){go("capture")}},
  {id:"inventory",label:"Inventory and review queue",detail:"Search records, physical locations and approval status",icon:"▤",run:function(){go("inventory");setTimeout(function(){var el=$("#inventorySearch");if(el)el.focus()},80)}},
  {id:"warehouse",label:"Store zones",detail:"Review front, middle, annex and restricted rear zones",icon:"⌖",run:function(){go("warehouse")}},
  {id:"design",label:"Website Design Studio",detail:"Customize, preview, save and activate storefront skins",icon:"✦",run:function(){go("design")}},
  {id:"ebay",label:"eBay Marketplace",detail:"Connection, policies, listings and ship-from location",icon:"↗",run:function(){go("ebay")}},
  {id:"orders",label:"Orders",detail:"Review the current order and fulfillment records",icon:"◇",run:function(){go("orders")}},
  {id:"guide",label:"Help and workflow guide",detail:"Instructions, safeguards and keyboard shortcuts",icon:"?",run:function(){openModal($("#ocGuideModal"))}},
  {id:"storefront",label:"Open public storefront",detail:"View the customer-facing site in a new tab",icon:"↗",run:function(){window.open("/","_blank","noopener,noreferrer")}},
  {id:"search",label:"Search inventory",detail:"Jump to inventory and focus its search field",icon:"⌕",run:function(){go("inventory");setTimeout(function(){var el=$("#inventorySearch");if(el)el.focus()},80)}}
 ];
 function renderCommands(){
  var field=$("#ocCommandQuery"),results=$("#ocCommandResults");if(!field||!results)return;
  var term=field.value.trim().toLowerCase();
  var matches=commands.filter(function(x){return (x.label+" "+x.detail+" "+x.id).toLowerCase().includes(term)});
  results.innerHTML=matches.map(function(x){return '<button class="oc-command-row" type="button" data-oc-command="'+x.id+'"><span class="oc-command-icon">'+x.icon+'</span><span class="oc-command-copy"><strong>'+x.label+'</strong><small>'+x.detail+'</small></span><kbd>↵</kbd></button>'}).join("")||'<div class="oc-command-empty">No matches. Try “inventory”, “capture”, “design” or “orders”.</div>';
 }
 function openCommands(){var field=$("#ocCommandQuery");if(field)field.value="";renderCommands();openModal($("#ocCommandModal"))}
 function installTopbar(){
  var top=$(".topright");if(!top)return;
  var oldBadge=$(".online-badge",top);
  if(oldBadge){oldBadge.id="systemBadge";oldBadge.innerHTML='<i id="systemDot"></i><span id="systemStatusText">Private workspace</span>'}
  if(!$("#commandOpen")){var c=document.createElement("button");c.type="button";c.id="commandOpen";c.className="top-action";c.innerHTML='⌕ <span>Quick actions</span> <kbd>Ctrl K</kbd>';c.title="Open quick actions (Ctrl/⌘ K)";top.insertBefore(c,$("a",top)||null)}
  if(!$("#helpOpen")){var h=document.createElement("button");h.type="button";h.id="helpOpen";h.className="top-action";h.textContent="? Help";h.title="Open help and workflow shortcuts";top.insertBefore(h,$("a",top)||null)}
  $("#commandOpen").addEventListener("click",openCommands);
  $("#helpOpen").addEventListener("click",function(){openModal($("#ocGuideModal"))});
 }
 function installGettingStarted(){
  var overview=$("#overviewPanel"),stat=$(".statgrid",overview);if(!overview||!stat||$("#gettingStarted"))return;
  var panel=document.createElement("section");panel.id="gettingStarted";panel.className="getting-started panel";
  panel.innerHTML='<div class="getting-heading"><div><div class="kicker">A better daily rhythm</div><h2>Welcome to your control room.</h2><p class="explain">Use the simplest workflow for routine stock and the research workflow for unusual or potentially valuable items.</p></div><button class="icon-button" id="dismissGettingStarted" type="button" aria-label="Hide getting started guide" title="Hide this guide. Reopen it from Help any time.">×</button></div><div class="getting-grid"><article class="getting-step"><span class="step-number">01</span><div><strong>Routine stock</strong><p>Record the facts you know, assign the shelf/bin location and save it privately for review.</p><button class="btn" type="button" data-oc-go="receive">Receive item →</button></div></article><article class="getting-step"><span class="step-number">02</span><div><strong>Hard-to-identify finds</strong><p>Photograph the imprint, branding or maker’s mark. AI findings are leads to verify, not proof.</p><button class="btn secondary" type="button" data-oc-go="capture">AI item capture →</button></div></article><article class="getting-step"><span class="step-number">03</span><div><strong>Check before publishing</strong><p>Review condition, pricing evidence and location. Rear-zone items remain restricted until reviewed.</p><button class="btn secondary" type="button" data-oc-go="inventory">Review inventory →</button></div></article></div><div class="getting-foot"><span>Shortcut: <kbd>Ctrl K</kbd> (or <kbd>⌘ K</kbd>) opens any workspace.</span><button class="text-button" id="openGuideFromStart" type="button">Read the quick guide</button></div>';
  stat.parentNode.insertBefore(panel,stat);
  $("#dismissGettingStarted").addEventListener("click",function(){panel.classList.add("hidden");safeStorageSet("onecopy_getting_started_dismissed","1")});
  $("#openGuideFromStart").addEventListener("click",function(){openModal($("#ocGuideModal"))});
  if(safeStorageGet("onecopy_getting_started_dismissed")==="1")panel.classList.add("hidden");
 }
 function bindModalEvents(){
  $$("[data-oc-close]").forEach(function(btn){btn.addEventListener("click",closeModal)});
  $$("[data-oc-go]").forEach(function(btn){btn.addEventListener("click",function(){go(btn.dataset.ocGo)})});
  $$(".oc-overlay").forEach(function(overlay){overlay.addEventListener("click",function(e){if(e.target===overlay)closeModal()})});
  var field=$("#ocCommandQuery"),results=$("#ocCommandResults");
  if(field)field.addEventListener("input",renderCommands);
  if(results)results.addEventListener("click",function(e){var btn=e.target.closest("[data-oc-command]");if(!btn)return;var command=commands.find(function(x){return x.id===btn.dataset.ocCommand});if(!command)return;closeModal();command.run()});
 }
 function installKeyboard(){
  document.addEventListener("keydown",function(e){
   var key=String(e.key||"").toLowerCase(),target=document.activeElement,tag=target&&target.tagName||"",typing=/INPUT|TEXTAREA|SELECT/.test(tag)||target&&target.isContentEditable;
   if((e.ctrlKey||e.metaKey)&&key==="k"){e.preventDefault();if(activeModal){if(activeModal.id==="ocCommandModal")closeModal();else{closeModal();openCommands()}}else if(!$("#app")||!$("#app").classList.contains("hidden"))openCommands();else openModal($("#ocGuideModal"));return}
   if(key==="escape"&&activeModal){e.preventDefault();closeModal();return}
   if(key==="?"&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!typing){e.preventDefault();if(activeModal)closeModal();else openModal($("#ocGuideModal"));return}
   if(key==="/"&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!typing&&$("#app")&&!$("#app").classList.contains("hidden")){e.preventDefault();go("inventory");setTimeout(function(){var el=$("#inventorySearch");if(el)el.focus()},70);return}
   if(activeModal&&key==="tab"){
    var focusable=$$("button:not([disabled]),input:not([disabled]),a[href],[tabindex]:not([tabindex='-1'])",activeModal).filter(function(el){return el.offsetParent!==null});
    if(!focusable.length)return;
    var first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
   }
   if(activeModal&&activeModal.id==="ocCommandModal"&&key==="enter"){var firstRow=$("#ocCommandResults [data-oc-command]");if(firstRow){e.preventDefault();firstRow.click()}}
  });
 }
 async function updateSystemStatus(){
  var badge=$("#systemBadge"),status=$("#systemStatusText"),dot=$("#systemDot");if(!badge||!status)return;
  try{
   var response=await fetch("/health",{cache:"no-store",credentials:"same-origin"}),data=await response.json();
   if(!response.ok||!data.ok)throw Error("Health check failed");
   badge.classList.remove("warn","bad");status.textContent="Connected · v"+(data.version||"unknown");if(dot)dot.title="Application and database health check passed";
  }catch(e){badge.classList.remove("warn");badge.classList.add("bad");status.textContent="System check failed";if(dot)dot.title="Could not confirm application/database health";}
 }
 function watchWorkspace(){
  var app=$("#app");if(!app)return;
  var refresh=function(){if(!app.classList.contains("hidden"))updateSystemStatus();else{var label=$("#systemStatusText"),badge=$("#systemBadge");if(label)label.textContent="Private workspace";if(badge)badge.classList.remove("warn","bad")}};
  if(window.MutationObserver)new MutationObserver(refresh).observe(app,{attributes:true,attributeFilter:["class"]});
  document.addEventListener("visibilitychange",function(){if(!document.hidden)refresh()});
 }
 function applyHelpfulTooltips(){
  var navHelp={
   overview:"Overview: a quick read on total stock, online publications, review work and common actions.",
   receive:"Receive item: add a record using verified details. Save it for review; saving does not itself publish it.",
   capture:"AI item capture: use multiple photos for identification research. Always verify claims and pricing evidence before saving.",
   inventory:"Inventory: search by title, author, identifier, location and other record fields; check status before acting.",
   warehouse:"Store zones: use the physical map to keep routine stock separate from restricted or special items.",
   design:"Website design: edit and preview skins, save versions, then activate deliberately.",
   ebay:"eBay marketplace: verify account status, listing settings and shipping policies. Actions can affect real listings.",
   orders:"Orders: inspect currently recorded orders. Customer checkout and payment workflows may not be enabled."
  };
  $("[data-nav]").forEach(function(el){var key=el.dataset.nav;if(navHelp[key])el.title=navHelp[key]});
  var tips={
   loginForm:"Sign in with the private admin password configured for this Worker.",
   saveItemButton:"Save this item as a private inventory record. New items require review and are not automatically published.",
   resetForm:"Clear the receiving form and return most fields to their starting values.",
   useMsrp:"Only copy a verified cover price into asking price for an ordinary As New book in Middle retail with no exception flags.",
   exportCsv:"Export inventory data for private analysis or backup. The file may contain internal notes and acquisition costs.",
   captureAnalyze:"Send the selected compressed photos to the configured AI service for identification and source research. API usage may cost money.",
   captureTransfer:"Prefill Receive Item with AI suggestions for review. This does not save the record or publish a listing.",
   captureStartCamera:"Request camera permission to capture still photos. Choose photos instead if the camera is unavailable.",
   captureTakePhoto:"Capture the current camera frame as a still photo; up to five photos can be analyzed together.",
   publishEbayItem:"Publish or update a real eBay listing. Verify price, item, quantity and required settings before confirming.",
   createEbayLocation:"Register the configured ship-from location with eBay. Confirm the address and location key first.",
   resetTheme:"Restore the current editor theme defaults; save changes only after checking the preview.",
   activateTheme:"Make the selected saved skin live on the storefront."
  };
  Object.keys(tips).forEach(function(id){var el=$("#"+id);if(el)el.title=tips[id]});
  var map=$("#systemBadge");if(map)map.title="Health status is checked after sign-in and reflects the Worker/database check, not third-party integration readiness.";
 }
 function patchDynamicTooltips(){
  var setActionTip=function(e){
   var target=e.target;if(!target||typeof target.closest!=="function")return;
   var btn=target.closest("button[data-action]");if(!btn||btn.title)return;
   var action=btn.dataset.action;
   btn.title=({approve:"Approve and publish only after confirming the item, condition, price and physical zone.",middle:"Move this item to the standard middle retail zone. Confirm it is not a rare or unreviewed exception first.",rear:"Move this item to the restricted rear zone for safekeeping and human review.",sold:"Mark the item sold; confirm the physical copy and sale before changing its status."})[action]||"Review the item before using this action.";
  };
  document.addEventListener("pointerover",setActionTip);
  document.addEventListener("focusin",setActionTip);
 }
 function init(){
  document.body.insertAdjacentHTML("beforeend",guideHtml);
  installTopbar();installGettingStarted();bindModalEvents();installKeyboard();watchWorkspace();applyHelpfulTooltips();patchDynamicTooltips();
  if(typeof window.installHelp==="function")window.installHelp();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();