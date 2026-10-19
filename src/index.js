const json = (data,status=200,headers={}) => new Response(JSON.stringify(data), {status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});
const enc = new TextEncoder();
const zones = new Set(["front_special","middle_retail","annex_retail","rear_restricted"]);
const reviews = new Set(["needs_partner_review","approved","flagged"]);
const statuses = new Set(["in_stock","on_hold","sold","archived"]);
const s = (v,n=5000) => String(v ?? "").trim().slice(0,n);
const m = v => {const n=Number(v);return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:0;};
function b64u(bytes){let out="";for(const b of bytes)out+=String.fromCharCode(b);return btoa(out).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}
function unb64u(str){str=str.replace(/-/g,"+").replace(/_/g,"/");str+="=".repeat((4-str.length%4)%4);const b=atob(str);return Uint8Array.from(b,c=>c.charCodeAt(0));}
async function sign(value,secret){const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64u(new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode(value))));}
async function session(secret){const p=b64u(enc.encode(JSON.stringify({exp:Date.now()+28800000})));return p+"."+await sign(p,secret);}
async function auth(req,secret){if(!secret)return false;const c=req.headers.get("Cookie")||"",match=c.match(/(?:^|;\s*)onecopy_session=([^;]+)/);if(!match)return false;const a=match[1].split(".");if(a.length!==2)return false;try{if(await sign(a[0],secret)!==a[1])return false;return JSON.parse(new TextDecoder().decode(unb64u(a[0]))).exp>Date.now();}catch{return false;}}
const cookie=t=>"onecopy_session="+t+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800";
async function read(req){try{return await req.json();}catch{return null;}}


const DEFAULT_THEME = {
 themeId:"magic-door-editorial",themeName:"Magic Door Editorial",storeName:"Magic Door Books",
 brandSubtitle:"A shop of stories & discoveries",announcement:"SECOND STREET, POMONA ✦ BOOKS, GAMES & CURIOUS THINGS ✦ EVERY COPY HAS A STORY",
 heroEyebrow:"Independent bookstore · Pomona, California",heroTitleFirst:"A little mystery.",heroTitleSecond:"A lifetime of stories.",
 heroDescription:"From beloved paperbacks to forgotten curiosities, find a book worth keeping and a story worth carrying home.",
 catalogEyebrow:"The online shelves",catalogTitle:"Discover something unexpected.",
 catalogDescription:"Each listed item is tracked individually. New arrivals appear as they are reviewed and ready for sale.",
 aboutEyebrow:"A little about us",aboutTitle:"Good books never really leave us.",
 aboutParagraph:"Magic Door Books is an independent bookstore on Second Street in Pomona. We believe a book is more than a temporary commodity: every copy carries a history, every reader brings a new one, and the right book can find its person years after it was printed.",
 aboutParagraph2:"We're carefully building our online catalog while keeping the pleasure of discovery at the heart of the shop.",
 visitEyebrow:"Visit us in person",visitTitle:"Come turn a few pages.",
 visitDescription:"Second Street · Pomona, California · Explore more during the monthly Art Walk.",
 footerTagline:"Stories worth keeping · Second Street, Pomona",
 primary:"#173d2e",secondary:"#245541",accent:"#c38d45",accentAlt:"#b9674e",
 background:"#f7f3e9",surface:"#fffdf7",surfaceAlt:"#f9f6ee",text:"#22271f",muted:"#697066",border:"#e4ddce",
 announcementBg:"#112e23",announcementText:"#e8ecdf",
 headingFont:"editorial",bodyFont:"system",buttonShape:"rounded",cardStyle:"editorial",pageWidth:"standard",heroLayout:"split",
 showIllustration:true,showBenefits:true,showAbout:true,showVisit:true
};
const THEME_TEXT_FIELDS = [
 "themeName","storeName","brandSubtitle","announcement","heroEyebrow","heroTitleFirst","heroTitleSecond","heroDescription",
 "catalogEyebrow","catalogTitle","catalogDescription","aboutEyebrow","aboutTitle","aboutParagraph","aboutParagraph2",
 "visitEyebrow","visitTitle","visitDescription","footerTagline"
];
const THEME_COLOR_FIELDS = [
 "primary","secondary","accent","accentAlt","background","surface","surfaceAlt","text","muted","border","announcementBg","announcementText"
];
function normalizeTheme(input){
 const b=input&&typeof input==="object"?input:{};
 const out={};
 for(const key of THEME_TEXT_FIELDS){out[key]=s(b[key]===undefined?DEFAULT_THEME[key]:b[key],key==="aboutParagraph"||key==="aboutParagraph2"||key==="heroDescription"||key==="catalogDescription"||key==="visitDescription"?900:240);}
 for(const key of THEME_COLOR_FIELDS){const v=String(b[key]===undefined?DEFAULT_THEME[key]:b[key]);out[key]=/^#[0-9a-fA-F]{6}$/.test(v)?v:DEFAULT_THEME[key];}
 const choices={
  headingFont:["editorial","classic","modern"],bodyFont:["system","bookish","modern"],
  buttonShape:["rounded","pill","square"],cardStyle:["editorial","minimal","framed"],
  pageWidth:["standard","wide"],heroLayout:["split","centered"]
 };
 for(const [key,values] of Object.entries(choices)){out[key]=values.includes(b[key])?b[key]:DEFAULT_THEME[key];}
 for(const key of ["showIllustration","showBenefits","showAbout","showVisit"])out[key]=b[key]===undefined?DEFAULT_THEME[key]:Boolean(b[key]);
 out.themeId=s(b.themeId||DEFAULT_THEME.themeId,80).replace(/[^a-zA-Z0-9_-]/g,"-").toLowerCase()||DEFAULT_THEME.themeId;
 return out;
}

/*
 * Make the first run safe: initialize an empty D1 database automatically,
 * and add any newer columns to an existing table without deleting its data.
 */
async function ensureSchema(env){
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL DEFAULT '',
  isbn TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'Book',
  description TEXT NOT NULL DEFAULT '', condition TEXT NOT NULL DEFAULT 'Good',
  price REAL NOT NULL DEFAULT 0, msrp REAL NOT NULL DEFAULT 0,
  stock_mode TEXT NOT NULL DEFAULT 'unique', quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_stock', zone TEXT NOT NULL DEFAULT 'rear_restricted',
  location TEXT NOT NULL DEFAULT '', review_status TEXT NOT NULL DEFAULT 'needs_partner_review',
  online_published INTEGER NOT NULL DEFAULT 0, image_url TEXT NOT NULL DEFAULT '',
  item_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
 )`).run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  status TEXT NOT NULL, payment_status TEXT NOT NULL,
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled',
  customer_json TEXT NOT NULL DEFAULT '{}', items_json TEXT NOT NULL DEFAULT '[]',
  subtotal REAL NOT NULL DEFAULT 0, shipping REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0, inventory_reserved INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT ''
 )`).run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip_hash TEXT PRIMARY KEY, attempt_count INTEGER NOT NULL DEFAULT 0,
  window_started_ms INTEGER NOT NULL
 )`).run();
 const additions={
  products:{
   author:"TEXT NOT NULL DEFAULT ''", isbn:"TEXT NOT NULL DEFAULT ''",
   category:"TEXT NOT NULL DEFAULT 'Book'", description:"TEXT NOT NULL DEFAULT ''",
   condition:"TEXT NOT NULL DEFAULT 'Good'", price:"REAL NOT NULL DEFAULT 0",
   msrp:"REAL NOT NULL DEFAULT 0", stock_mode:"TEXT NOT NULL DEFAULT 'unique'",
   quantity:"INTEGER NOT NULL DEFAULT 1", status:"TEXT NOT NULL DEFAULT 'in_stock'",
   zone:"TEXT NOT NULL DEFAULT 'rear_restricted'", location:"TEXT NOT NULL DEFAULT ''",
   review_status:"TEXT NOT NULL DEFAULT 'needs_partner_review'",
   online_published:"INTEGER NOT NULL DEFAULT 0", image_url:"TEXT NOT NULL DEFAULT ''",
   item_json:"TEXT NOT NULL DEFAULT '{}'", created_at:"TEXT NOT NULL DEFAULT ''",
   updated_at:"TEXT NOT NULL DEFAULT ''"
  },
  orders:{
   created_at:"TEXT NOT NULL DEFAULT ''", updated_at:"TEXT NOT NULL DEFAULT ''",
   status:"TEXT NOT NULL DEFAULT 'pending'", payment_status:"TEXT NOT NULL DEFAULT 'unpaid'",
   fulfillment_status:"TEXT NOT NULL DEFAULT 'unfulfilled'",
   customer_json:"TEXT NOT NULL DEFAULT '{}'", items_json:"TEXT NOT NULL DEFAULT '[]'",
   subtotal:"REAL NOT NULL DEFAULT 0", shipping:"REAL NOT NULL DEFAULT 0",
   total:"REAL NOT NULL DEFAULT 0", inventory_reserved:"INTEGER NOT NULL DEFAULT 1",
   notes:"TEXT NOT NULL DEFAULT ''"
  }
 };
 for(const table of Object.keys(additions)){
  const info=await env.DB.prepare("PRAGMA table_info("+table+")").all();
  const present=new Set((info.results||[]).map(c=>c.name));
  for(const [name,definition] of Object.entries(additions[table])){
   if(!present.has(name)) await env.DB.prepare("ALTER TABLE "+table+" ADD COLUMN "+name+" "+definition).run();
  }
 }
 await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_products_public ON products (online_published, status, category)").run();
 await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_products_title ON products (title)").run();
 await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_products_zone ON products (zone, review_status)").run();
 await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_products_isbn ON products (isbn)").run();
 await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC)").run();

 await env.DB.prepare("CREATE TABLE IF NOT EXISTS ebay_settings (id INTEGER PRIMARY KEY CHECK(id=1), marketplace_id TEXT NOT NULL DEFAULT 'EBAY_US', currency TEXT NOT NULL DEFAULT 'USD', category_id TEXT NOT NULL DEFAULT '', merchant_location_key TEXT NOT NULL DEFAULT 'magic-door-books', location_name TEXT NOT NULL DEFAULT 'Magic Door Books', address_line1 TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT 'Pomona', state_or_province TEXT NOT NULL DEFAULT 'CA', postal_code TEXT NOT NULL DEFAULT '', country TEXT NOT NULL DEFAULT 'US', fulfillment_policy_id TEXT NOT NULL DEFAULT '', payment_policy_id TEXT NOT NULL DEFAULT '', return_policy_id TEXT NOT NULL DEFAULT '', listing_duration TEXT NOT NULL DEFAULT 'GTC', updated_at TEXT NOT NULL DEFAULT '')").run();
 await env.DB.prepare("INSERT OR IGNORE INTO ebay_settings (id,marketplace_id,currency,merchant_location_key,location_name,city,state_or_province,country,listing_duration) VALUES (1,'EBAY_US','USD','magic-door-books','Magic Door Books','Pomona','CA','US','GTC')").run();
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS ebay_connection (id INTEGER PRIMARY KEY CHECK(id=1), refresh_token_cipher TEXT NOT NULL, scopes TEXT NOT NULL DEFAULT '', connected_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS ebay_oauth_states (state TEXT PRIMARY KEY, session_hash TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)").run();
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS ebay_listings (product_id TEXT PRIMARY KEY, sku TEXT NOT NULL UNIQUE, listing_title TEXT NOT NULL DEFAULT '', listing_aspects_json TEXT NOT NULL DEFAULT '{}', offer_id TEXT NOT NULL DEFAULT '', listing_id TEXT NOT NULL DEFAULT '', listing_status TEXT NOT NULL DEFAULT 'not_listed', marketplace_id TEXT NOT NULL DEFAULT 'EBAY_US', last_error TEXT NOT NULL DEFAULT '', last_synced_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')").run();

 await env.DB.prepare("CREATE TABLE IF NOT EXISTS storefront_skins (id TEXT PRIMARY KEY, name TEXT NOT NULL, theme_json TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
 const defaultJson=JSON.stringify(normalizeTheme(DEFAULT_THEME)),schemaNow=new Date().toISOString();
 await env.DB.prepare("INSERT OR IGNORE INTO storefront_skins (id,name,theme_json,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?)").bind(DEFAULT_THEME.themeId,DEFAULT_THEME.themeName,defaultJson,1,schemaNow,schemaNow).run();

 const ebayCols=await env.DB.prepare("PRAGMA table_info(ebay_listings)").all();
 if(!(ebayCols.results||[]).some(c=>c.name==="listing_title"))await env.DB.prepare("ALTER TABLE ebay_listings ADD COLUMN listing_title TEXT NOT NULL DEFAULT ''").run();
 if(!(ebayCols.results||[]).some(c=>c.name==="listing_aspects_json"))await env.DB.prepare("ALTER TABLE ebay_listings ADD COLUMN listing_aspects_json TEXT NOT NULL DEFAULT '{}'").run();
}

const EBAY_SCOPES = [
 "https://api.ebay.com/oauth/api_scope",
 "https://api.ebay.com/oauth/api_scope/sell.inventory",
 "https://api.ebay.com/oauth/api_scope/sell.account"
].join(" ");
function cookieValue(req,name){const c=req.headers.get("Cookie")||"";const m=c.match(/(?:^|;\s*)onecopy_session=([^;]+)/);return m?m[1]:"";}
async function sha256hex(value){const d=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value)));return Array.from(d,b=>b.toString(16).padStart(2,"0")).join("");}
async function encryptEbayToken(value,secret){
 const raw=await crypto.subtle.digest("SHA-256",enc.encode(secret));
 const key=await crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt"]);
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,enc.encode(value)));
 return b64u(iv)+"."+b64u(cipher);
}
async function decryptEbayToken(value,secret){
 const parts=String(value||"").split(".");
 if(parts.length!==2)throw new Error("Saved eBay credential could not be decrypted. Reconnect eBay.");
 const raw=await crypto.subtle.digest("SHA-256",enc.encode(secret));
 const key=await crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["decrypt"]);
 try{return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64u(parts[0])},key,unb64u(parts[1])));}
 catch{throw new Error("Saved eBay credential could not be decrypted. Check EBAY_TOKEN_ENCRYPTION_KEY and reconnect eBay.");}
}
function ebayMode(env){return String(env.EBAY_ENVIRONMENT||"production").toLowerCase()==="sandbox"?"sandbox":"production";}
function ebayApiRoot(env){return ebayMode(env)==="sandbox"?"https://api.sandbox.ebay.com":"https://api.ebay.com";}
function ebayAuthRoot(env){return ebayMode(env)==="sandbox"?"https://auth.sandbox.ebay.com":"https://auth.ebay.com";}
function ebayTokenRoot(env){return ebayApiRoot(env)+"/identity/v1/oauth2/token";}
function ebayAppConfigured(env){return Boolean(env.EBAY_CLIENT_ID&&env.EBAY_CLIENT_SECRET&&env.EBAY_RUNAME&&env.EBAY_TOKEN_ENCRYPTION_KEY);}
function ebayMissingAppConfig(env){
 const missing=[];
 if(!env.EBAY_CLIENT_ID)missing.push("EBAY_CLIENT_ID");
 if(!env.EBAY_CLIENT_SECRET)missing.push("EBAY_CLIENT_SECRET");
 if(!env.EBAY_RUNAME)missing.push("EBAY_RUNAME");
 if(!env.EBAY_TOKEN_ENCRYPTION_KEY)missing.push("EBAY_TOKEN_ENCRYPTION_KEY");
 return missing;
}
function ebayTextError(data,status){
 let detail="";
 if(data&&Array.isArray(data.errors))detail=data.errors.map(x=>[x.errorId,x.message,x.longMessage].filter(Boolean).join(": ")).join("; ");
 else if(data&&Array.isArray(data.warnings))detail=data.warnings.map(x=>x.message).filter(Boolean).join("; ");
 else if(data&&data.error_description)detail=data.error_description;
 else if(data&&data.message)detail=data.message;
 else if(data&&data.error)detail=typeof data.error==="string"?data.error:JSON.stringify(data.error);
 return "eBay API ("+status+"): "+(detail||"Request was rejected. Check seller setup and required listing fields.").slice(0,900);
}
async function ebayRequest(env,path,options,token){
 const headers=Object.assign({"accept":"application/json","content-type":"application/json","content-language":"en-US"},options&&options.headers||{});
 if(token)headers.authorization="Bearer "+token;
 const response=await fetch(ebayApiRoot(env)+path,Object.assign({},options||{},{headers}));
 const raw=await response.text();let data={};
 if(raw){try{data=JSON.parse(raw);}catch{data={message:raw.slice(0,400)};}}
 if(!response.ok){const err=new Error(ebayTextError(data,response.status));err.status=response.status;throw err;}
 return {status:response.status,data};
}
async function ebayTokenPost(env,body){
 if(!env.EBAY_CLIENT_ID||!env.EBAY_CLIENT_SECRET)throw new Error("Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET as Cloudflare Worker secrets first.");
 const response=await fetch(ebayTokenRoot(env),{
  method:"POST",
  headers:{"authorization":"Basic "+btoa(env.EBAY_CLIENT_ID+":"+env.EBAY_CLIENT_SECRET),"content-type":"application/x-www-form-urlencoded","accept":"application/json"},
  body:new URLSearchParams(body)
 });
 const raw=await response.text();let data={};if(raw){try{data=JSON.parse(raw);}catch{data={message:raw.slice(0,300)};}}
 if(!response.ok)throw new Error("eBay OAuth ("+response.status+"): "+String(data.error_description||data.error||data.message||"Token request failed").slice(0,500));
 return data;
}
async function ebayAccessToken(env){
 if(!env.EBAY_TOKEN_ENCRYPTION_KEY)throw new Error("Missing Cloudflare secret EBAY_TOKEN_ENCRYPTION_KEY.");
 const saved=await env.DB.prepare("SELECT refresh_token_cipher, scopes FROM ebay_connection WHERE id=1").first();
 if(!saved||!saved.refresh_token_cipher)throw new Error("eBay is not connected. Use Connect eBay first.");
 const refreshToken=await decryptEbayToken(saved.refresh_token_cipher,env.EBAY_TOKEN_ENCRYPTION_KEY);
 const token=await ebayTokenPost(env,{grant_type:"refresh_token",refresh_token:refreshToken,scope:EBAY_SCOPES});
 if(token.refresh_token&&token.refresh_token!==refreshToken){
  const cipher=await encryptEbayToken(token.refresh_token,env.EBAY_TOKEN_ENCRYPTION_KEY);
  await env.DB.prepare("UPDATE ebay_connection SET refresh_token_cipher=?,updated_at=? WHERE id=1").bind(cipher,new Date().toISOString()).run();
 }
 if(!token.access_token)throw new Error("eBay did not return an access token. Reconnect eBay and try again.");
 return token.access_token;
}
async function startEbayOAuth(req,env,url){
 if(!ebayAppConfigured(env))return {error:"eBay app credentials are not configured. Add these four Worker secrets in Cloudflare: "+ebayMissingAppConfig(env).join(", ")+". The eBay redirect URL to register is "+url.origin+"/api/ebay/callback"};
 const sess=cookieValue(req,"onecopy_session");if(!sess)throw new Error("Admin session missing. Sign in again.");
 const state=b64u(crypto.getRandomValues(new Uint8Array(32)));
 const now=new Date(),expires=new Date(now.getTime()+10*60*1000).toISOString();
 await env.DB.prepare("DELETE FROM ebay_oauth_states WHERE expires_at < ?").bind(now.toISOString()).run();
 await env.DB.prepare("INSERT INTO ebay_oauth_states (state,session_hash,expires_at,created_at) VALUES (?,?,?,?)").bind(state,await sha256hex(sess),expires,now.toISOString()).run();
 const target=new URL(ebayAuthRoot(env)+"/oauth2/authorize");
 target.searchParams.set("client_id",env.EBAY_CLIENT_ID);
 target.searchParams.set("response_type","code");
 target.searchParams.set("redirect_uri",env.EBAY_RUNAME);
 target.searchParams.set("scope",EBAY_SCOPES);
 target.searchParams.set("state",state);
 return {authUrl:target.toString()};
}
async function handleEbayCallback(req,env,url){
 await ensureSchema(env);
 const target=new URL("/admin",url);
 const state=url.searchParams.get("state")||"";
 const sess=cookieValue(req,"onecopy_session");
 if(!state||!sess||!await auth(req,env.SESSION_SECRET)){
  target.searchParams.set("ebay","error");target.searchParams.set("reason","The admin session or OAuth state is missing. Sign in and connect again.");
  return Response.redirect(target.toString(),302);
 }
 const saved=await env.DB.prepare("SELECT state,session_hash,expires_at FROM ebay_oauth_states WHERE state=?").bind(state).first();
 if(!saved||saved.expires_at<=new Date().toISOString()||saved.session_hash!==await sha256hex(sess)){
  if(saved)await env.DB.prepare("DELETE FROM ebay_oauth_states WHERE state=?").bind(state).run();
  target.searchParams.set("ebay","error");target.searchParams.set("reason","eBay connection expired or failed state verification. Please connect again.");
  return Response.redirect(target.toString(),302);
 }
 await env.DB.prepare("DELETE FROM ebay_oauth_states WHERE state=?").bind(state).run();
 const denied=url.searchParams.get("error");
 if(denied){
  target.searchParams.set("ebay","error");target.searchParams.set("reason",String(url.searchParams.get("error_description")||denied).slice(0,220));
  return Response.redirect(target.toString(),302);
 }
 const code=url.searchParams.get("code");
 if(!code){target.searchParams.set("ebay","error");target.searchParams.set("reason","eBay did not return an authorization code.");return Response.redirect(target.toString(),302);}
 try{
  if(!ebayAppConfigured(env))throw new Error("eBay app secrets are missing from Cloudflare.");
  const token=await ebayTokenPost(env,{grant_type:"authorization_code",code,redirect_uri:env.EBAY_RUNAME});
  if(!token.refresh_token)throw new Error("eBay did not return a refresh token. Check the RuName and OAuth consent settings.");
  const cipher=await encryptEbayToken(token.refresh_token,env.EBAY_TOKEN_ENCRYPTION_KEY);
  const now=new Date().toISOString();
  await env.DB.prepare("INSERT INTO ebay_connection (id,refresh_token_cipher,scopes,connected_at,updated_at) VALUES (1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET refresh_token_cipher=excluded.refresh_token_cipher,scopes=excluded.scopes,connected_at=excluded.connected_at,updated_at=excluded.updated_at").bind(cipher,String(token.scope||EBAY_SCOPES),now,now).run();
  target.searchParams.set("ebay","connected");
 }catch(e){
  target.searchParams.set("ebay","error");target.searchParams.set("reason",String(e&&e.message||"Could not finish eBay authorization").slice(0,220));
 }
 return Response.redirect(target.toString(),302);
}
async function loadEbaySettings(env){return await env.DB.prepare("SELECT * FROM ebay_settings WHERE id=1").first();}
async function saveEbaySettings(env,b){
 const values={
  marketplace_id:s(b.marketplace_id||"EBAY_US",20),currency:s(b.currency||"USD",3),
  category_id:s(b.category_id,30),merchant_location_key:s(b.merchant_location_key||"magic-door-books",50),
  location_name:s(b.location_name||"Magic Door Books",100),address_line1:s(b.address_line1,120),
  city:s(b.city||"Pomona",100),state_or_province:s(b.state_or_province||"CA",100),
  postal_code:s(b.postal_code,20),country:s(b.country||"US",2).toUpperCase(),
  fulfillment_policy_id:s(b.fulfillment_policy_id,100),payment_policy_id:s(b.payment_policy_id,100),
  return_policy_id:s(b.return_policy_id,100),listing_duration:s(b.listing_duration||"GTC",10),updated_at:new Date().toISOString()
 };
 if(!/^[A-Z]{2}$/.test(values.country))throw new Error("Country must be a two-letter code such as US.");
 await env.DB.prepare("INSERT INTO ebay_settings (id,marketplace_id,currency,category_id,merchant_location_key,location_name,address_line1,city,state_or_province,postal_code,country,fulfillment_policy_id,payment_policy_id,return_policy_id,listing_duration,updated_at) VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET marketplace_id=excluded.marketplace_id,currency=excluded.currency,category_id=excluded.category_id,merchant_location_key=excluded.merchant_location_key,location_name=excluded.location_name,address_line1=excluded.address_line1,city=excluded.city,state_or_province=excluded.state_or_province,postal_code=excluded.postal_code,country=excluded.country,fulfillment_policy_id=excluded.fulfillment_policy_id,payment_policy_id=excluded.payment_policy_id,return_policy_id=excluded.return_policy_id,listing_duration=excluded.listing_duration,updated_at=excluded.updated_at").bind(values.marketplace_id,values.currency,values.category_id,values.merchant_location_key,values.location_name,values.address_line1,values.city,values.state_or_province,values.postal_code,values.country,values.fulfillment_policy_id,values.payment_policy_id,values.return_policy_id,values.listing_duration,values.updated_at).run();
 return values;
}
async function ebayApiSetupStatus(env,url){
 const settings=await loadEbaySettings(env);
 const connection=await env.DB.prepare("SELECT connected_at,updated_at,scopes FROM ebay_connection WHERE id=1").first();
 const summary=await env.DB.prepare("SELECT COUNT(*) AS total,SUM(CASE WHEN listing_status='published' THEN 1 ELSE 0 END) AS published,SUM(CASE WHEN last_error!='' THEN 1 ELSE 0 END) AS errors FROM ebay_listings").first();
 const rows=await env.DB.prepare("SELECT l.product_id,l.sku,l.listing_title,l.listing_aspects_json,l.offer_id,l.listing_id,l.listing_status,l.marketplace_id,l.last_error,l.last_synced_at,l.updated_at,p.title,p.price,p.status AS product_status,p.review_status,p.zone FROM ebay_listings l LEFT JOIN products p ON p.id=l.product_id ORDER BY l.updated_at DESC LIMIT 500").all();
 return {configured:ebayAppConfigured(env),missingSecrets:ebayMissingAppConfig(env),connected:Boolean(connection&&connection.connected_at),connectedAt:connection&&connection.connected_at||"",scopes:connection&&connection.scopes||"",environment:ebayMode(env),callbackUrl:url.origin+"/api/ebay/callback",settings,summary:summary||{total:0,published:0,errors:0},listings:rows.results||[]};
}

async function getEbayCategoryAspects(env,accessToken,marketplaceId,categoryId){
 const marketplace=s(marketplaceId||"EBAY_US",20),category=s(categoryId,30);
 if(!category)throw new Error("Enter and save the eBay leaf category ID before loading category requirements.");
 const tree=await ebayRequest(env,"/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id="+encodeURIComponent(marketplace),{method:"GET"},accessToken);
 const treeId=s(tree.data&&tree.data.categoryTreeId,40);
 if(!treeId)throw new Error("eBay did not return a category tree for "+marketplace+".");
 const response=await ebayRequest(env,"/commerce/taxonomy/v1/category_tree/"+encodeURIComponent(treeId)+"/get_item_aspects_for_category?category_id="+encodeURIComponent(category),{method:"GET"},accessToken);
 const aspects=Array.isArray(response.data&&response.data.aspects)?response.data.aspects:[];
 return aspects.map(a=>{
  const constraint=a.aspectConstraint||{};
  return {
   name:s(a.localizedAspectName,100),
   required:Boolean(constraint.aspectRequired),
   usage:s(constraint.aspectUsage,30),
   dataType:s(constraint.aspectDataType,30),
   cardinality:s(constraint.itemToAspectCardinality,20),
   values:(Array.isArray(a.aspectValues)?a.aspectValues:[]).slice(0,200).map(v=>s(v.localizedValue||v.value,200)).filter(Boolean)
  };
 }).filter(a=>a.name);
}
function cleanListingAspects(input,definitions,item){
 let supplied={};
 try{
  if(input&&typeof input==="object"&&!Array.isArray(input))supplied=input;
  else if(typeof input==="string")supplied=JSON.parse(input||"{}");
 }catch{}
 let prior={};
 if(item&&item.listing_aspects_json){try{prior=JSON.parse(item.listing_aspects_json)||{};}catch{}}
 const validNames=new Set((definitions||[]).map(d=>d.name));
 const combined={};
 for(const [name,value] of Object.entries(prior)){
  if(!validNames.has(name))continue;
  const values=(Array.isArray(value)?value:String(value??"").split("|")).map(v=>s(v,200)).filter(Boolean).slice(0,10);
  if(values.length)combined[name]=values;
 }
 for(const [name,value] of Object.entries(supplied)){
  if(typeof name!=="string"||!name.trim()||name.length>100||!validNames.has(name))continue;
  const values=(Array.isArray(value)?value:String(value??"").split("|")).map(v=>s(v,200)).filter(Boolean).slice(0,10);
  if(values.length)combined[name]=values;
 }
 for(const def of definitions){
  if(!def.required)continue;
  const current=combined[def.name]||[];
  if(current.length)continue;
  const key=def.name.toLowerCase().replace(/[^a-z0-9]/g,"");
  let guess="";
  if(key==="booktitle"||key==="title")guess=s(item.title,200);
  else if(key==="author"||key==="authors")guess=s(item.author,200);
  else if(key==="isbn")guess=s(item.isbn,30);
  if(guess)combined[def.name]=[guess];
 }
 return combined;
}

async function publishEbayItem(env,productId,titleOverride,submittedAspects){
 const row=await env.DB.prepare("SELECT * FROM products WHERE id=?").bind(productId).first();
 if(!row)throw new Error("Inventory item not found.");
 const item=toAdmin(row);
 const prior=await env.DB.prepare("SELECT * FROM ebay_listings WHERE product_id=?").bind(productId).first();
 const listingTitle=String(titleOverride||prior&&prior.listing_title||item.title||"").trim();
 if(String(item.category||"").toLowerCase()!=="book")throw new Error("The first eBay connector is configured for books. Non-book items need their own category mapping before listing.");
 if(item.review_status!=="approved")throw new Error("Approve this item in OneCopy before listing it on eBay.");
 if(item.zone==="rear_restricted")throw new Error("Restricted Rear-zone items cannot be listed on eBay.");
 if(item.status!=="in_stock"||Number(item.quantity)<1)throw new Error("This item is not currently in stock.");
 if(Number(item.price)<=0)throw new Error("Set a positive asking price before listing.");
 if(!String(item.title||"").trim())throw new Error("A listing title is required.");
 if(!listingTitle)throw new Error("Enter an eBay listing title.");
 if(listingTitle.length>80)throw new Error("eBay listing titles are limited to 80 characters. Shorten the eBay-specific title; the full OneCopy title will be preserved.");
 if(!item.image_url)throw new Error("Add a clear HTTPS photo URL for the actual book before publishing. eBay requires at least one listing image.");
 if(!/^https:\/\//i.test(item.image_url))throw new Error("Image URL must use HTTPS.");
 const settings=await loadEbaySettings(env);
 const required=[
  ["eBay category ID",settings&&settings.category_id],
  ["merchant location key",settings&&settings.merchant_location_key],
  ["fulfillment/shipping policy",settings&&settings.fulfillment_policy_id],
  ["payment policy",settings&&settings.payment_policy_id],
  ["return policy",settings&&settings.return_policy_id]
 ];
 const missing=required.filter(x=>!x[1]).map(x=>x[0]);
 if(missing.length)throw new Error("Complete eBay setup first: "+missing.join(", ")+".");
 if(!env.EBAY_CLIENT_ID||!env.EBAY_CLIENT_SECRET||!env.EBAY_TOKEN_ENCRYPTION_KEY)throw new Error("One or more eBay Cloudflare secrets are missing.");
 const access=await ebayAccessToken(env);
 const categoryAspects=await getEbayCategoryAspects(env,access,settings.marketplace_id||"EBAY_US",settings.category_id);
 const listingAspects=cleanListingAspects(submittedAspects,categoryAspects,{...item,listing_aspects_json:prior&&prior.listing_aspects_json||"{}"});
 const missingAspects=categoryAspects.filter(a=>a.required&&!(listingAspects[a.name]||[]).length);
 if(missingAspects.length)throw new Error("Fill the required eBay item specifics: "+missingAspects.map(a=>a.name).join(", ")+". Use Load required item specifics in the preview panel.");
 const sku=prior&&prior.sku?prior.sku:String(item.id);
 const isbn=String(item.isbn||"").replace(/[^0-9Xx]/g,"").toUpperCase();
 const product={title:listingTitle,description:String(item.description||("Condition: "+item.condition)).slice(0,5000),imageUrls:item.image_url?[item.image_url]:[],aspects:listingAspects};
 if(/^(?:\d{9}[\dX]|\d{13})$/.test(isbn))product.isbn=[isbn];
 const conditions={"As New":"LIKE_NEW","Very Good":"USED_VERY_GOOD","Good":"USED_GOOD","Acceptable":"USED_ACCEPTABLE","Fair":"USED_ACCEPTABLE"};
 const ebayCondition=conditions[item.condition]||"USED_GOOD";
 const inventory={availability:{shipToLocationAvailability:{quantity:Math.max(1,Math.min(99999,Number(item.quantity)||1))}},condition:ebayCondition,product};
 if(!["LIKE_NEW","NEW"].includes(ebayCondition))inventory.conditionDescription=("Condition: "+String(item.condition||"Not specified")).slice(0,1000);
 const offer={
  sku,marketplaceId:settings.marketplace_id||"EBAY_US",format:"FIXED_PRICE",
  availableQuantity:Math.max(1,Math.min(99999,Number(item.quantity)||1)),
  categoryId:settings.category_id,merchantLocationKey:settings.merchant_location_key,
  listingDescription:String(item.description||("Condition: "+item.condition)).slice(0,5000),
  listingDuration:settings.listing_duration||"GTC",
  listingPolicies:{fulfillmentPolicyId:settings.fulfillment_policy_id,paymentPolicyId:settings.payment_policy_id,returnPolicyId:settings.return_policy_id},
  pricingSummary:{price:{value:Number(item.price).toFixed(2),currency:settings.currency||"USD"}}
 };
 const now=()=>new Date().toISOString();
 let offerId=prior&&prior.offer_id||"",listingId=prior&&prior.listing_status==="published"&&prior.listing_id?prior.listing_id:"";
 try{
  await ebayRequest(env,"/sell/inventory/v1/inventory_item/"+encodeURIComponent(sku),{method:"PUT",body:JSON.stringify(inventory)},access);
  if(offerId){
   await ebayRequest(env,"/sell/inventory/v1/offer/"+encodeURIComponent(offerId),{method:"PUT",body:JSON.stringify(offer)},access);
  }else{
   const created=await ebayRequest(env,"/sell/inventory/v1/offer",{method:"POST",body:JSON.stringify(offer)},access);
   offerId=String(created.data.offerId||"");
   if(!offerId)throw new Error("eBay created an offer but did not return its offer ID.");
  }
  await env.DB.prepare("INSERT INTO ebay_listings (product_id,sku,listing_title,listing_aspects_json,offer_id,listing_id,listing_status,marketplace_id,last_error,last_synced_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'',?,?) ON CONFLICT(product_id) DO UPDATE SET sku=excluded.sku,listing_title=excluded.listing_title,listing_aspects_json=excluded.listing_aspects_json,offer_id=excluded.offer_id,listing_id=excluded.listing_id,listing_status=excluded.listing_status,marketplace_id=excluded.marketplace_id,last_error='',last_synced_at=excluded.last_synced_at,updated_at=excluded.updated_at").bind(productId,sku,listingTitle,JSON.stringify(listingAspects),offerId,listingId,listingId?"published":"draft",settings.marketplace_id,now(),now()).run();
  if(!listingId){
   const published=await ebayRequest(env,"/sell/inventory/v1/offer/"+encodeURIComponent(offerId)+"/publish",{method:"POST",body:"{}"},access);
   listingId=String(published.data.listingId||"");
   if(!listingId)throw new Error("eBay accepted the publish request but returned no listing ID. Check eBay Seller Hub before retrying.");
  }
  await env.DB.prepare("INSERT INTO ebay_listings (product_id,sku,listing_title,listing_aspects_json,offer_id,listing_id,listing_status,marketplace_id,last_error,last_synced_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'',?,?) ON CONFLICT(product_id) DO UPDATE SET sku=excluded.sku,listing_title=excluded.listing_title,listing_aspects_json=excluded.listing_aspects_json,offer_id=excluded.offer_id,listing_id=excluded.listing_id,listing_status=excluded.listing_status,marketplace_id=excluded.marketplace_id,last_error='',last_synced_at=excluded.last_synced_at,updated_at=excluded.updated_at").bind(productId,sku,listingTitle,JSON.stringify(listingAspects),offerId,listingId,"published",settings.marketplace_id,now(),now()).run();
  return {ok:true,product_id:productId,sku,listing_title:listingTitle,offer_id:offerId,listing_id:listingId,status:"published",message:prior&&prior.listing_id?"Existing eBay listing updated.":"Listing published to eBay."};
 }catch(e){
  const message=String(e&&e.message||"eBay request failed").slice(0,1000);
  await env.DB.prepare("INSERT INTO ebay_listings (product_id,sku,listing_title,listing_aspects_json,offer_id,listing_id,listing_status,marketplace_id,last_error,last_synced_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(product_id) DO UPDATE SET sku=excluded.sku,listing_title=excluded.listing_title,listing_aspects_json=excluded.listing_aspects_json,offer_id=excluded.offer_id,listing_id=excluded.listing_id,listing_status=excluded.listing_status,last_error=excluded.last_error,last_synced_at=excluded.last_synced_at,updated_at=excluded.updated_at").bind(productId,sku,listingTitle,JSON.stringify(listingAspects),offerId,listingId,listingId?"published":"error",settings.marketplace_id,message,now(),now()).run();
  throw e;
 }
}

function normal(body){
 const title=s(body.title,300);if(!title)return {error:"Item name is required."};
 const zone=zones.has(body.zone)?body.zone:"rear_restricted";
 const review=reviews.has(body.review_status)?body.review_status:"needs_partner_review";
 const status=statuses.has(body.status)?body.status:"in_stock";
 const raw=Number.parseInt(body.quantity,10);const quantity=status==="sold"?0:Math.max(0,Math.min(100000,Number.isFinite(raw)?raw:1));
 const published=Boolean(body.online_published)&&zone!=="rear_restricted"&&review==="approved"&&status==="in_stock"&&quantity>0;
 const confidence=["low","medium","high"].includes(body.valuation_confidence)?body.valuation_confidence:"low";
 const basis=["none","sold_comps","catalog","internal_sales","appraisal","partner_judgment"].includes(body.valuation_basis)?body.valuation_basis:"none";
 const extra={cost:m(body.cost),cpv:m(body.cpv),tpv:m(body.tpv),edition:s(body.edition,500),signed:Boolean(body.signed),firstEdition:Boolean(body.first_edition ?? body.firstEdition),special:Boolean(body.special),notes:s(body.notes,3000),market_comps:s(body.market_comps,3000),valuation_basis:basis,valuation_confidence:confidence};
 return {title,author:s(body.author,300),isbn:s(body.isbn,40),category:s(body.category||"Book",100),description:s(body.description,5000),condition:s(body.condition||"Good",100),price:m(body.price),msrp:m(body.msrp),stock_mode:body.stock_mode==="quantity"?"quantity":"unique",quantity,status,zone,location:s(body.location,200),review_status:review,online_published:published?1:0,image_url:s(body.image_url,2000),item_json:JSON.stringify(extra)};
}
function toAdmin(row){let x={};try{x=JSON.parse(row.item_json||"{}");}catch{}return {...row,...x,item_json:undefined,online_published:Boolean(row.online_published)};}

const ITEM_CAPTURE_SCHEMA = {
 type:"object", additionalProperties:false,
 required:["itemType","title","creator","brand","manufacturer","publisher","publicationYear","edition","identifier","materials","model","conditionAssessment","conditionNotes","description","features","confidence","needsReview","reviewReasons","estimatedLow","estimatedHigh","suggestedPrice","valuationBasis","valuationNotes","marketEvidence","searchQueries"],
 properties:{
  itemType:{type:"string",enum:["Book","Clothing","Jewelry","Antique / Collectible","Home decor","Game","Gift","Stationery","Other"]},
  title:{type:"string"},creator:{type:"string"},brand:{type:"string"},manufacturer:{type:"string"},
  publisher:{type:"string"},publicationYear:{type:"string"},edition:{type:"string"},identifier:{type:"string"},
  materials:{type:"string"},model:{type:"string"},
  conditionAssessment:{type:"string",enum:["As New","Very Good","Good","Acceptable","Fair","Not Applicable","Unknown"]},
  conditionNotes:{type:"string"},description:{type:"string"},
  features:{type:"array",items:{type:"string"}},
  confidence:{type:"string",enum:["low","medium","high"]},needsReview:{type:"boolean"},reviewReasons:{type:"array",items:{type:"string"}},
  estimatedLow:{type:["number","null"]},estimatedHigh:{type:["number","null"]},suggestedPrice:{type:["number","null"]},
  valuationBasis:{type:"string",enum:["sold_comps","active_listings","catalog","visual_estimate","none"]},
  valuationNotes:{type:"string"},
  marketEvidence:{type:"array",items:{type:"object",additionalProperties:false,required:["title","seller","price","currency","condition","status","url","date","comparability"],properties:{
   title:{type:"string"},seller:{type:"string"},price:{type:["number","null"]},currency:{type:"string"},
   condition:{type:"string"},status:{type:"string",enum:["active_listing","sold_record","catalog_reference","unknown"]},
   url:{type:"string"},date:{type:"string"},comparability:{type:"string"}
  }}},
  searchQueries:{type:"array",items:{type:"string"}}
 }
};
function captureImageDataUrl(value){
 const match=String(value||"").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/);
 if(!match)return null;
 const data=match[2].replace(/\s/g,"");
 if(!data.length||data.length>2500000||data.length%4!==0)return null;
 return {mime:match[1],dataUrl:"data:"+match[1]+";base64,"+data,size:data.length};
}
function captureText(v,limit=500){return s(v,limit);}
async function analyzeItemCapture(body,env){
 if(!env.OPENAI_API_KEY)return json({error:"AI Item Capture is not configured. In Cloudflare, open your OneCopy Worker → Settings → Variables and Secrets, then add OPENAI_API_KEY as a secret. The ChatGPT subscription and API billing are separate."},503);
 const incoming=Array.isArray(body.images)?body.images.slice(0,5):[];
 const images=incoming.map(x=>captureImageDataUrl(x&&x.dataUrl)).filter(Boolean);
 if(!images.length)return json({error:"Add at least one clear photo before analyzing the item. The camera captures individual still images."},400);
 if(incoming.length>5)return json({error:"Please use no more than five photos per item."},400);
 if(images.length!==incoming.length)return json({error:"One or more images were invalid. Use JPEG, PNG or WebP photos and try again."},400);
 if(images.reduce((total,x)=>total+x.size,0)>7000000)return json({error:"The photos are too large. Capture fewer images or reduce image size, then retry."},413);
 const itemType=s(body.itemType||"Auto",80);
 const notes=s(body.notes||"",1800);
 const prompt=[
  "You are OneCopy's careful cataloging assistant for a small independent bookseller and second-hand/antiques retailer.",
  "Identify only details supported by the provided photos and user notes. Transcribe book copyright/imprint pages, ISBNs, publisher, publication year, edition/printing statements, author, signatures, labels, hallmarks, model numbers, maker's marks and garment/jewelry branding where readable.",
  "For every uncertain fact, say unknown or explain the uncertainty. Do not claim a book is a first edition, a signature is authentic, jewelry is precious metal/genuine stone, an item is antique, or an item is by a particular maker unless evidence supports that claim. Visual identification is not authentication.",
  "Use web search to seek live comparable marketplace listings, catalog/manufacturer references and (when findable) actual sold/completed sales. Return only sources you actually found, with exact working URLs and correct status. Never label an active asking price as a completed sale. Do not invent sellers, listing titles, prices, sold dates, URLs, or manufacturer facts.",
  "Estimate value only when there is credible evidence. Treat active prices as asking prices, not realized value. Prefer several close sold comparables in similar condition and edition. Separate price of the same item from related items, variants and reproductions. If evidence is weak, prices conflict, authenticity matters, or the item may be rare/antique/signed/valuable, leave price fields null and recommend specialist/manual review rather than guessing. Use USD when the source supports it; report the currency accurately.",
  "Return concise, useful catalog data. Suggested price should be a cautious asking-price suggestion, not a guaranteed appraisal. Put key limitations, match quality, and whether sources are active vs sold in valuationNotes. For an old book, identify the exact edition as best possible; do not use modern reprints as evidence of an old original.",
  "Item type selected in the interface: "+itemType+". If Auto or the selection is inconsistent with the evidence, choose the appropriate type from the schema.",
  "Additional staff observations: "+(notes||"None supplied."),
  "Return only the required structured data. If no credible market evidence was found, marketEvidence must be empty and valuationBasis must be none unless a catalog reference or cautious visual estimate is clearly justified."
 ].join("\n");
 const content=[{type:"input_text",text:prompt}];
 for(const image of images)content.push({type:"input_image",image_url:image.dataUrl,detail:"high"});
 let response;
 try{
  response=await fetch("https://api.openai.com/v1/responses",{
   method:"POST",headers:{"authorization":"Bearer "+env.OPENAI_API_KEY,"content-type":"application/json"},
   body:JSON.stringify({
    model:s(env.OPENAI_MODEL||"gpt-4.1-mini",100),
    tools:[{type:"web_search"}],
    tool_choice:"required",
    include:["web_search_call.action.sources"],
    input:[{role:"user",content}],
    text:{format:{type:"json_schema",name:"onecopy_item_capture",strict:true,schema:ITEM_CAPTURE_SCHEMA}},
    max_output_tokens:3500
   })
  });
 }catch(e){return json({error:"Could not reach the AI service. Check the Worker network/logs and try again."},502);}
 const providerData=await response.json().catch(()=>({}));
 if(!response.ok){
  console.error("Item capture provider error",response.status,JSON.stringify(providerData.error||{}).slice(0,500));
  if(response.status===401||response.status===403)return json({error:"The AI provider rejected the API key or model access. Check OPENAI_API_KEY and the API project's access and billing."},503);
  if(response.status===429)return json({error:"The AI provider rate limit or usage budget was reached. Check API usage/billing and try again later."},429);
  return json({error:"The AI provider could not analyze this item (HTTP "+response.status+"). Check Worker logs and model access."},502);
 }
 const textOutput=(providerData.output||[]).flatMap(item=>item.content||[]).filter(item=>item.type==="output_text"&&typeof item.text==="string").map(item=>item.text).join("\n");
 let result;
 try{result=JSON.parse(textOutput);}catch(e){console.error("Item capture returned non-JSON output",textOutput.slice(0,800));return json({error:"The AI response was not in the expected catalog format. Please retry with clearer photos."},502);}
 const fields=["title","creator","brand","manufacturer","publisher","publicationYear","edition","identifier","materials","model","conditionNotes","description","valuationNotes"];
 for(const key of fields)result[key]=captureText(result[key],key==="description"?1800:700);
 result.features=Array.isArray(result.features)?result.features.slice(0,12).map(x=>captureText(x,220)):[];
 result.reviewReasons=Array.isArray(result.reviewReasons)?result.reviewReasons.slice(0,10).map(x=>captureText(x,220)):[];
 result.searchQueries=Array.isArray(result.searchQueries)?result.searchQueries.slice(0,6).map(x=>captureText(x,200)):[];
 result.marketEvidence=(Array.isArray(result.marketEvidence)?result.marketEvidence:[]).slice(0,8).map(x=>{
  let url="";try{const u=new URL(String(x.url||""));if(u.protocol==="https:"||u.protocol==="http:")url=u.toString();}catch{}
  const price=Number(x.price);
  return {title:captureText(x.title,250),seller:captureText(x.seller,180),price:x.price===null||x.price===""||!Number.isFinite(price)||price<0?null:Math.round(price*100)/100,currency:captureText(x.currency||"USD",10),condition:captureText(x.condition,100),status:["active_listing","sold_record","catalog_reference","unknown"].includes(x.status)?x.status:"unknown",url,date:captureText(x.date,80),comparability:captureText(x.comparability,350)};
 });
 for(const key of ["estimatedLow","estimatedHigh","suggestedPrice"]){const n=Number(result[key]);result[key]=result[key]===null||result[key]===""||!Number.isFinite(n)||n<0?null:Math.round(n*100)/100;}
 if(!["sold_comps","active_listings","catalog","visual_estimate","none"].includes(result.valuationBasis))result.valuationBasis="none";
 if(!["low","medium","high"].includes(result.confidence))result.confidence="low";
 return json({ok:true,result,model:s(env.OPENAI_MODEL||"gpt-4.1-mini",100),webResearchUsed:(providerData.output||[]).some(x=>x.type==="web_search_call"),disclaimer:"AI identification and estimates can be wrong. Confirm identifiers, provenance, condition and value before pricing or listing."});
}

async function api(req,env,url){
 const p=url.pathname,method=req.method.toUpperCase();

 if(p==="/api/storefront/theme"&&method==="GET"){
  await ensureSchema(env);
  const row=await env.DB.prepare("SELECT id,name,theme_json FROM storefront_skins WHERE is_active=1 LIMIT 1").first();
  let theme=DEFAULT_THEME;
  if(row){try{theme=normalizeTheme(JSON.parse(row.theme_json||"{}"));}catch{theme=normalizeTheme(DEFAULT_THEME);}theme.themeId=row.id;theme.themeName=row.name;}
  return json({theme});
 }

 if(p==="/api/admin/login"&&method==="POST"){
  if(!env.ADMIN_PASSWORD||!env.SESSION_SECRET)return json({error:"Admin setup incomplete. Set ADMIN_PASSWORD and SESSION_SECRET in Cloudflare Worker secrets."},503);
  const b=await read(req);if(!b||b.password!==env.ADMIN_PASSWORD)return json({error:"Incorrect password."},401);
  return json({ok:true},200,{"set-cookie":cookie(await session(env.SESSION_SECRET))});
 }
 if(p==="/api/admin/logout"&&method==="POST")return json({ok:true},200,{"set-cookie":"onecopy_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"});
 if(p.startsWith("/api/admin/")){
  if(!await auth(req,env.SESSION_SECRET))return json({error:"Please sign in to the admin panel."},401);
  await ensureSchema(env);


  if(p==="/api/admin/item-capture/status"&&method==="GET")return json({configured:Boolean(env.OPENAI_API_KEY),model:s(env.OPENAI_MODEL||"gpt-4.1-mini",100)});
  if(p==="/api/admin/item-capture/analyze"&&method==="POST"){const b=await read(req);if(!b)return json({error:"Invalid JSON."},400);return await analyzeItemCapture(b,env);}
  if(p==="/api/admin/themes"&&method==="GET"){
   const rows=await env.DB.prepare("SELECT id,name,theme_json,is_active,created_at,updated_at FROM storefront_skins ORDER BY is_active DESC,name ASC").all();
   const skins=(rows.results||[]).map(row=>{let theme={};try{theme=normalizeTheme(JSON.parse(row.theme_json||"{}"));}catch{theme=normalizeTheme(DEFAULT_THEME);}theme.themeId=row.id;theme.themeName=row.name;return {id:row.id,name:row.name,is_active:Boolean(row.is_active),created_at:row.created_at,updated_at:row.updated_at,theme};});
   return json({skins,activeId:(skins.find(x=>x.is_active)||{}).id||DEFAULT_THEME.themeId,defaults:normalizeTheme(DEFAULT_THEME)});
  }
  if(p==="/api/admin/themes"&&method==="POST"){
   const b=await read(req);if(!b)return json({error:"Invalid JSON."},400);
   const name=s(b.name||b.theme&&b.theme.themeName||"My custom skin",100)||"My custom skin";
   const id="skin-"+crypto.randomUUID().replace(/-/g,"").slice(0,12).toLowerCase();
   const theme=normalizeTheme({...b.theme,themeId:id,themeName:name});
   const now=new Date().toISOString();
   await env.DB.prepare("INSERT INTO storefront_skins (id,name,theme_json,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?)").bind(id,name,JSON.stringify(theme),0,now,now).run();
   return json({ok:true,id,name,theme},201);
  }
  const themeMatch=p.match(/^\/api\/admin\/themes\/([^/]+)$/);
  if(themeMatch&&method==="PUT"){
   const id=decodeURIComponent(themeMatch[1]),b=await read(req);if(!b)return json({error:"Invalid JSON."},400);
   const old=await env.DB.prepare("SELECT id,name,is_active FROM storefront_skins WHERE id=?").bind(id).first();
   if(!old)return json({error:"Saved skin not found."},404);
   const name=s(b.name||b.theme&&b.theme.themeName||old.name,100)||old.name;
   const theme=normalizeTheme({...b.theme,themeId:id,themeName:name});
   const now=new Date().toISOString();
   await env.DB.prepare("UPDATE storefront_skins SET name=?,theme_json=?,updated_at=? WHERE id=?").bind(name,JSON.stringify(theme),now,id).run();
   return json({ok:true,id,name,theme,is_active:Boolean(old.is_active)});
  }
  const activateThemeMatch=p.match(/^\/api\/admin\/themes\/([^/]+)\/activate$/);
  if(activateThemeMatch&&method==="POST"){
   const id=decodeURIComponent(activateThemeMatch[1]);
   const target=await env.DB.prepare("SELECT id,name,theme_json FROM storefront_skins WHERE id=?").bind(id).first();
   if(!target)return json({error:"Saved skin not found."},404);
   const now=new Date().toISOString();
   await env.DB.batch([
    env.DB.prepare("UPDATE storefront_skins SET is_active=0,updated_at=?").bind(now),
    env.DB.prepare("UPDATE storefront_skins SET is_active=1,updated_at=? WHERE id=?").bind(now,id)
   ]);
   let theme={};try{theme=normalizeTheme(JSON.parse(target.theme_json||"{}"));}catch{theme=normalizeTheme(DEFAULT_THEME);}
   theme.themeId=id;theme.themeName=target.name;
   return json({ok:true,id,name:target.name,theme,message:"Skin is now active on the public storefront."});
  }

  if(p==="/api/admin/ebay/status"&&method==="GET")return json(await ebayApiSetupStatus(env,url));
  if(p==="/api/admin/ebay/settings"&&method==="GET")return json({settings:await loadEbaySettings(env)});
  if(p==="/api/admin/ebay/settings"&&method==="PUT"){
   const b=await read(req);if(!b)return json({error:"Invalid JSON."},400);
   try{return json({ok:true,settings:await saveEbaySettings(env,b)});}catch(e){return json({error:e.message},400);}
  }
  if(p==="/api/admin/ebay/connect"&&method==="POST"){
   const result=await startEbayOAuth(req,env,url);
   if(result.error)return json({error:result.error},400);
   return json({ok:true,authUrl:result.authUrl});
  }
  if(p==="/api/admin/ebay/disconnect"&&method==="POST"){
   await env.DB.prepare("DELETE FROM ebay_connection WHERE id=1").run();
   await env.DB.prepare("DELETE FROM ebay_oauth_states").run();
   return json({ok:true,message:"OneCopy removed the saved eBay connection. Existing eBay listings have not been ended."});
  }
  if(p==="/api/admin/ebay/policies"&&method==="GET"){
   const access=await ebayAccessToken(env),settings=await loadEbaySettings(env),market=encodeURIComponent(settings&&settings.marketplace_id||"EBAY_US");
   const results=await Promise.all([
    ebayRequest(env,"/sell/account/v1/fulfillment_policy?marketplace_id="+market,{method:"GET"},access),
    ebayRequest(env,"/sell/account/v1/payment_policy?marketplace_id="+market,{method:"GET"},access),
    ebayRequest(env,"/sell/account/v1/return_policy?marketplace_id="+market,{method:"GET"},access)
   ]);
   return json({fulfillment:results[0].data.fulfillmentPolicies||[],payment:results[1].data.paymentPolicies||[],returns:results[2].data.returnPolicies||[]});
  }
  if(p==="/api/admin/ebay/locations"&&method==="GET"){
   const access=await ebayAccessToken(env);
   const result=await ebayRequest(env,"/sell/inventory/v1/location?limit=100&offset=0",{method:"GET"},access);
   return json({locations:result.data.locations||[],total:result.data.total||0});
  }
  if(p==="/api/admin/ebay/location"&&method==="POST"){
   const settings=await loadEbaySettings(env);
   if(!settings||!settings.merchant_location_key) return json({error:"Enter and save a merchant location key first."},400);
   if(!settings.country||(!(settings.postal_code)&&!(settings.city&&settings.state_or_province)))return json({error:"Enter a postal code and country, or city, state and country for the ship-from location."},400);
   const access=await ebayAccessToken(env),key=encodeURIComponent(settings.merchant_location_key);
   try{
    await ebayRequest(env,"/sell/inventory/v1/location/"+key,{method:"GET"},access);
    return json({ok:true,exists:true,message:"This eBay inventory location already exists."});
   }catch(e){if(e.status!==404)throw e;}
   const loc={name:settings.location_name||"Magic Door Books",merchantLocationStatus:"ENABLED",locationTypes:["WAREHOUSE"],location:{address:{city:settings.city,stateOrProvince:settings.state_or_province,country:settings.country}}};
   if(settings.address_line1)loc.location.address.addressLine1=settings.address_line1;
   if(settings.postal_code)loc.location.address.postalCode=settings.postal_code;
   await ebayRequest(env,"/sell/inventory/v1/location/"+key,{method:"POST",body:JSON.stringify(loc)},access);
   return json({ok:true,exists:false,message:"eBay inventory location created and ready to use."},201);
  }
  if(p==="/api/admin/ebay/listings"&&method==="GET"){
   const status=await ebayApiSetupStatus(env,url);return json({listings:status.listings,summary:status.summary});
  }
  if(p==="/api/admin/ebay/category-aspects"&&method==="GET"){
   const settings=await loadEbaySettings(env);
   const categoryId=s(url.searchParams.get("category_id")||settings.category_id,30);
   const marketplaceId=s(url.searchParams.get("marketplace_id")||settings.marketplace_id||"EBAY_US",20);
   if(!categoryId)return json({error:"Enter an eBay leaf category ID first."},400);
   const access=await ebayAccessToken(env);
   const aspects=await getEbayCategoryAspects(env,access,marketplaceId,categoryId);
   return json({marketplace_id:marketplaceId,category_id:categoryId,aspects});
  }
  const publishMatch=p.match(/^\/api\/admin\/ebay\/products\/([^/]+)\/publish$/);
  if(publishMatch&&method==="POST"){
   const b=await read(req)||{};
   try{return json(await publishEbayItem(env,decodeURIComponent(publishMatch[1]),b.listing_title,b.listing_aspects));}
   catch(e){return json({error:String(e&&e.message||"eBay listing failed"),status:e&&e.status||0},e&&e.status>=500?502:400);}
  }
  const withdrawMatch=p.match(/^\/api\/admin\/ebay\/products\/([^/]+)\/withdraw$/);
  if(withdrawMatch&&method==="POST"){
   const id=decodeURIComponent(withdrawMatch[1]);
   const existing=await env.DB.prepare("SELECT * FROM ebay_listings WHERE product_id=?").bind(id).first();
   if(!existing||!existing.offer_id)return json({error:"No OneCopy-managed eBay offer exists for this item."},404);
   const access=await ebayAccessToken(env);
   await ebayRequest(env,"/sell/inventory/v1/offer/"+encodeURIComponent(existing.offer_id)+"/withdraw",{method:"POST",body:"{}"},access);
   const now=new Date().toISOString();
   await env.DB.prepare("UPDATE ebay_listings SET listing_status='withdrawn',last_error='',last_synced_at=?,updated_at=? WHERE product_id=?").bind(now,now,id).run();
   return json({ok:true,message:"eBay listing withdrawn. The OneCopy inventory record remains intact."});
  }

  if(p==="/api/admin/products"&&method==="GET"){const r=await env.DB.prepare("SELECT * FROM products ORDER BY created_at DESC LIMIT 1000").all();return json({products:(r.results||[]).map(toAdmin)});}
  if(p==="/api/admin/products"&&method==="POST"){
   const b=await read(req);if(!b)return json({error:"Invalid JSON."},400);const x=normal(b);if(x.error)return json({error:x.error},400);
   const id="OC-"+crypto.randomUUID().replace(/-/g,"").slice(0,10).toUpperCase(),now=new Date().toISOString();
   await env.DB.prepare("INSERT INTO products (id,title,author,isbn,category,description,condition,price,msrp,stock_mode,quantity,status,zone,location,review_status,online_published,image_url,item_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,x.title,x.author,x.isbn,x.category,x.description,x.condition,x.price,x.msrp,x.stock_mode,x.quantity,x.status,x.zone,x.location,x.review_status,x.online_published,x.image_url,x.item_json,now,now).run();
   return json({ok:true,id,online_published:Boolean(x.online_published)},201);
  }
  const match=p.match(/^\/api\/admin\/products\/([^/]+)$/);
  if(match&&method==="PATCH"){
   const id=decodeURIComponent(match[1]),b=await read(req);if(!b)return json({error:"Invalid JSON."},400);
   const old=await env.DB.prepare("SELECT * FROM products WHERE id=?").bind(id).first();if(!old)return json({error:"Item not found."},404);
   let extra={};try{extra=JSON.parse(old.item_json||"{}");}catch{}
   const merged={...old,...extra,...b};if(b.review_status==="approved"&&!Object.hasOwn(b,"online_published"))merged.online_published=true;
   if(merged.zone==="rear_restricted"||merged.status==="sold"||merged.status==="archived")merged.online_published=false;
   const x=normal(merged);if(x.error)return json({error:x.error},400);const now=new Date().toISOString();
   await env.DB.prepare("UPDATE products SET title=?,author=?,isbn=?,category=?,description=?,condition=?,price=?,msrp=?,stock_mode=?,quantity=?,status=?,zone=?,location=?,review_status=?,online_published=?,image_url=?,item_json=?,updated_at=? WHERE id=?").bind(x.title,x.author,x.isbn,x.category,x.description,x.condition,x.price,x.msrp,x.stock_mode,x.quantity,x.status,x.zone,x.location,x.review_status,x.online_published,x.image_url,x.item_json,now,id).run();
   return json({ok:true,id,online_published:Boolean(x.online_published)});
  }
  if(p==="/api/admin/orders"&&method==="GET"){const r=await env.DB.prepare("SELECT id,created_at,status,payment_status,fulfillment_status,subtotal,shipping,total,notes FROM orders ORDER BY created_at DESC LIMIT 200").all();return json({orders:r.results||[]});}
  return json({error:"Admin API route not found."},404);
 }
 if(p==="/api/products"&&method==="GET"){
  await ensureSchema(env);
  const where=["online_published=1","status='in_stock'","review_status='approved'","zone!='rear_restricted'","quantity>0"],args=[];
  const q=s(url.searchParams.get("q"),120).toLowerCase(),cat=s(url.searchParams.get("category"),100);
  if(q){where.push("(LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR LOWER(isbn) LIKE ? OR LOWER(description) LIKE ?)");const term="%"+q+"%";args.push(term,term,term,term);}
  if(cat){where.push("category=?");args.push(cat);}
  const r=await env.DB.prepare("SELECT id,title,author,isbn,category,description,condition,price,msrp,quantity,image_url FROM products WHERE "+where.join(" AND ")+" ORDER BY created_at DESC LIMIT 200").bind(...args).all();
  return json({products:r.results||[]});
 }
 return json({error:"API route not found."},404);
}
export default {async fetch(req,env){
 const url=new URL(req.url);
 try{
  if(url.pathname==="/api/ebay/callback"&&req.method.toUpperCase()==="GET")return await handleEbayCallback(req,env,url);
  if(url.pathname==="/health"){await ensureSchema(env);const r=await env.DB.prepare("SELECT 1 AS ok").first();return json({ok:Boolean(r&&r.ok===1),app:"OneCopy Commerce",version:"0.10.0",inventory:"empty by default"});}
  if(url.pathname==="/admin"||url.pathname==="/admin/")return env.ASSETS.fetch(new Request(new URL("/admin.html",url),{method:"GET"}));
  if(url.pathname.startsWith("/api/"))return await api(req,env,url);
  return env.ASSETS.fetch(req);
 }catch(e){console.error("OneCopy error",e&&e.stack?e.stack:e);const isAdminApi=url.pathname.startsWith("/api/admin/");const detail=String(e&&e.message?e.message:"Unknown error").slice(0,280);return json({error:isAdminApi?("Inventory request failed: "+detail):"The request failed. Check Worker logs for details."},500);}
}};