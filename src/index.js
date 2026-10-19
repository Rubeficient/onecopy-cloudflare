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
const cookie=t=>"onecopy_session="+t+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800";
async function read(req){try{return await req.json();}catch{return null;}}

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
async function api(req,env,url){
 const p=url.pathname,method=req.method.toUpperCase();
 if(p==="/api/admin/login"&&method==="POST"){
  if(!env.ADMIN_PASSWORD||!env.SESSION_SECRET)return json({error:"Admin setup incomplete. Set ADMIN_PASSWORD and SESSION_SECRET in Cloudflare Worker secrets."},503);
  const b=await read(req);if(!b||b.password!==env.ADMIN_PASSWORD)return json({error:"Incorrect password."},401);
  return json({ok:true},200,{"set-cookie":cookie(await session(env.SESSION_SECRET))});
 }
 if(p==="/api/admin/logout"&&method==="POST")return json({ok:true},200,{"set-cookie":"onecopy_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"});
 if(p.startsWith("/api/admin/")){
  if(!await auth(req,env.SESSION_SECRET))return json({error:"Please sign in to the admin panel."},401);
  await ensureSchema(env);
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
  if(url.pathname==="/health"){await ensureSchema(env);const r=await env.DB.prepare("SELECT 1 AS ok").first();return json({ok:Boolean(r&&r.ok===1),app:"OneCopy Commerce",version:"0.7.1",inventory:"empty by default"});}
  if(url.pathname==="/admin"||url.pathname==="/admin/")return env.ASSETS.fetch(new Request(new URL("/admin.html",url),{method:"GET"}));
  if(url.pathname.startsWith("/api/"))return await api(req,env,url);
  return env.ASSETS.fetch(req);
 }catch(e){console.error("OneCopy error",e&&e.stack?e.stack:e);const isAdminApi=url.pathname.startsWith("/api/admin/");const detail=String(e&&e.message?e.message:"Unknown error").slice(0,280);return json({error:isAdminApi?("Inventory request failed: "+detail):"The request failed. Check Worker logs for details."},500);}
}};