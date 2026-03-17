const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');
const path    = require('path');

const app = express();
app.use(express.static(path.join(__dirname)));
app.use(cors());
app.use(express.json());

// ── JWT helpers (no external lib) ────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'phronexsec-secret-change-me';

function b64url(s) { return Buffer.from(s).toString('base64url'); }
function signJWT(payload) {
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const b = b64url(JSON.stringify({ ...payload, iat: Date.now() }));
  const s = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${s}`;
}
function verifyJWT(token) {
  try {
    const [h, b, s] = token.split('.');
    const exp = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
    if (s !== exp) return null;
    return JSON.parse(Buffer.from(b, 'base64url').toString());
  } catch { return null; }
}
function hashPw(pw) { return crypto.createHash('sha256').update(pw + JWT_SECRET).digest('hex'); }

// ── Middleware ────────────────────────────────────────────────────
function requireAgent(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const p = token ? verifyJWT(token) : null;
  if (!p || p.role !== 'agent') return res.status(401).json({ error: 'Não autorizado' });
  req.user = p; next();
}
function requireCustomer(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const p = token ? verifyJWT(token) : null;
  if (!p || (p.role !== 'customer' && p.role !== 'agent')) return res.status(401).json({ error: 'Não autorizado' });
  req.user = p; next();
}

// ── Users ─────────────────────────────────────────────────────────
let agentUsers = [
  { id:'a1', name:'Carlos Silva', email:'carlos@phronexsec.com', pw:hashPw('carlos123'), avatar:'CS', role:'agent' },
  { id:'a2', name:'Maria Souza',  email:'maria@phronexsec.com',  pw:hashPw('maria123'),  avatar:'MS', role:'agent' },
  { id:'a3', name:'Pedro Alves',  email:'pedro@phronexsec.com',  pw:hashPw('pedro123'),  avatar:'PA', role:'agent' },
  { id:'a4', name:'Admin',        email:'admin@phronexsec.com',  pw:hashPw('admin123'),  avatar:'AD', role:'agent' },
];
let customerUsers = [
  { id:'c1', name:'Ana Lima',    email:'ana@acme.com',  pw:hashPw('ana123'),   role:'customer' },
  { id:'c2', name:'Bruno Costa', email:'bruno@beta.io', pw:hashPw('bruno123'), role:'customer' },
];

// ── Tickets ───────────────────────────────────────────────────────
let tickets = [
  { id:'TK-001', title:'Firewall bloqueando tráfego VPN', description:'Usuários externos não conseguem conectar via VPN após atualização.', status:'open', priority:'high', category:'firewall', customer:{name:'Ana Lima',email:'ana@acme.com'}, agent:'Carlos Silva', createdAt:new Date(Date.now()-86400000*2).toISOString(), updatedAt:new Date(Date.now()-3600000).toISOString(), comments:[{id:'c1',author:'Carlos Silva',role:'agent',text:'Verificando as políticas de firewall.',createdAt:new Date(Date.now()-3600000).toISOString()}] },
  { id:'TK-002', title:'Lentidão na rede interna', description:'Rede corporativa com latência alta desde segunda-feira.', status:'in_progress', priority:'high', category:'network', customer:{name:'Bruno Costa',email:'bruno@beta.io'}, agent:'Maria Souza', createdAt:new Date(Date.now()-86400000).toISOString(), updatedAt:new Date(Date.now()-7200000).toISOString(), comments:[] },
  { id:'TK-003', title:'Como configurar VPN site-to-site?', description:'Precisamos de guia para configurar tunnel entre filiais.', status:'resolved', priority:'low', category:'question', customer:{name:'Ana Lima',email:'ana@acme.com'}, agent:'Carlos Silva', createdAt:new Date(Date.now()-86400000*5).toISOString(), updatedAt:new Date(Date.now()-86400000).toISOString(), comments:[{id:'c2',author:'Carlos Silva',role:'agent',text:'Documentação enviada por email.',createdAt:new Date(Date.now()-86400000).toISOString()}] },
];
let ticketCounter = 4;
function genId() { return `TK-${String(ticketCounter++).padStart(3,'0')}`; }

// ═════════════════════════════════════════════
// AUTH
// ═════════════════════════════════════════════
app.post('/api/auth/agent/login', (req, res) => {
  const { email, password } = req.body;
  const u = agentUsers.find(u => u.email === email && u.pw === hashPw(password));
  if (!u) return res.status(401).json({ error: 'Credenciais inválidas' });
  const token = signJWT({ id:u.id, name:u.name, email:u.email, role:'agent', avatar:u.avatar });
  res.json({ token, user:{ id:u.id, name:u.name, email:u.email, role:'agent', avatar:u.avatar } });
});

app.post('/api/auth/customer/login', (req, res) => {
  const { email, password } = req.body;
  const u = customerUsers.find(u => u.email === email && u.pw === hashPw(password));
  if (!u) return res.status(401).json({ error: 'Credenciais inválidas' });
  const token = signJWT({ id:u.id, name:u.name, email:u.email, role:'customer' });
  res.json({ token, user:{ id:u.id, name:u.name, email:u.email, role:'customer' } });
});

app.post('/api/auth/customer/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  if (customerUsers.find(u => u.email === email)) return res.status(409).json({ error: 'Email já cadastrado' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha mínima de 6 caracteres' });
  const u = { id:`c${Date.now()}`, name, email, pw:hashPw(password), role:'customer' };
  customerUsers.push(u);
  const token = signJWT({ id:u.id, name:u.name, email:u.email, role:'customer' });
  res.status(201).json({ token, user:{ id:u.id, name:u.name, email:u.email, role:'customer' } });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const p = token ? verifyJWT(token) : null;
  if (!p) return res.status(401).json({ error: 'Token inválido' });
  res.json(p);
});

// ═════════════════════════════════════════════
// AGENT API (protected)
// ═════════════════════════════════════════════
app.get('/api/stats', requireAgent, (req, res) => {
  res.json({ total:tickets.length, open:tickets.filter(t=>t.status==='open').length, inProgress:tickets.filter(t=>t.status==='in_progress').length, resolved:tickets.filter(t=>t.status==='resolved').length, highPriority:tickets.filter(t=>t.priority==='high'&&t.status!=='resolved').length });
});

app.get('/api/tickets', requireAgent, (req, res) => {
  let r = [...tickets].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const {status,priority,agent,search}=req.query;
  if(status&&status!=='all') r=r.filter(t=>t.status===status);
  if(priority&&priority!=='all') r=r.filter(t=>t.priority===priority);
  if(agent&&agent!=='all') r=r.filter(t=>t.agent===agent);
  if(search){const q=search.toLowerCase();r=r.filter(t=>[t.title,t.id,t.customer.name,t.customer.email].some(s=>s.toLowerCase().includes(q)));}
  res.json(r);
});

app.get('/api/tickets/:id', requireAgent, (req, res) => {
  const t=tickets.find(t=>t.id===req.params.id);
  if(!t) return res.status(404).json({error:'Not found'});
  res.json(t);
});

app.post('/api/tickets', requireAgent, (req, res) => {
  const {title,description,priority='medium',category='general',customer}=req.body;
  if(!title||!customer?.email) return res.status(400).json({error:'title e email obrigatórios'});
  const t={id:genId(),title,description:description||'',status:'open',priority,category,customer:{name:customer.name||customer.email.split('@')[0],email:customer.email},agent:req.user.name,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),comments:[]};
  tickets.unshift(t); res.status(201).json(t);
});

app.patch('/api/tickets/:id', requireAgent, (req, res) => {
  const i=tickets.findIndex(t=>t.id===req.params.id);
  if(i===-1) return res.status(404).json({error:'Not found'});
  ['status','priority','agent','title','description','category'].forEach(k=>{if(req.body[k]!==undefined)tickets[i][k]=req.body[k];});
  tickets[i].updatedAt=new Date().toISOString(); res.json(tickets[i]);
});

app.delete('/api/tickets/:id', requireAgent, (req, res) => {
  const i=tickets.findIndex(t=>t.id===req.params.id);
  if(i===-1) return res.status(404).json({error:'Not found'});
  tickets.splice(i,1); res.json({success:true});
});

app.post('/api/tickets/:id/comments', requireAgent, (req, res) => {
  const t=tickets.find(t=>t.id===req.params.id);
  if(!t) return res.status(404).json({error:'Not found'});
  if(!req.body.text) return res.status(400).json({error:'text required'});
  const c={id:crypto.randomUUID(),author:req.user.name,role:'agent',text:req.body.text,createdAt:new Date().toISOString()};
  t.comments.push(c); t.updatedAt=new Date().toISOString(); res.status(201).json(c);
});

app.get('/api/agents', requireAgent, (req, res) => {
  res.json(agentUsers.map(a=>({id:a.id,name:a.name,email:a.email,avatar:a.avatar})));
});

app.post('/api/email/ingest', requireAgent, (req, res) => {
  const {from,subject,body}=req.body;
  if(!from||!subject) return res.status(400).json({error:'from e subject obrigatórios'});
  const em=(from.match(/<(.+)>/)||[null,from])[1];
  const nm=from.split('<')[0].trim()||em;
  const t={id:genId(),title:subject,description:body||'(sem corpo)',status:'open',priority:'medium',category:'email',customer:{name:nm,email:em},agent:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),comments:[],source:'email'};
  tickets.unshift(t); res.status(201).json(t);
});

// ═════════════════════════════════════════════
// CUSTOMER PORTAL (protected)
// ═════════════════════════════════════════════
app.post('/api/portal/submit', requireCustomer, (req, res) => {
  const {title,description,priority='medium',category='general'}=req.body;
  if(!title) return res.status(400).json({error:'title obrigatório'});
  const t={id:genId(),title,description:description||'',status:'open',priority,category,customer:{name:req.user.name,email:req.user.email},agent:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),comments:[]};
  tickets.unshift(t); res.status(201).json({id:t.id,message:'Ticket criado com sucesso'});
});

app.get('/api/portal/tickets', requireCustomer, (req, res) => {
  res.json(tickets.filter(t=>t.customer.email===req.user.email).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)));
});

app.get('/api/portal/tickets/:id', requireCustomer, (req, res) => {
  const t=tickets.find(t=>t.id===req.params.id&&t.customer.email===req.user.email);
  if(!t) return res.status(404).json({error:'Not found'});
  res.json(t);
});

// -- Change password
app.post("/api/auth/change-password", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const p = token ? verifyJWT(token) : null;
  if (!p) return res.status(401).json({ error: "Nao autorizado" });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Preencha todos os campos" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Nova senha deve ter pelo menos 6 caracteres" });
  const list = p.role === "agent" ? agentUsers : customerUsers;
  const idx = list.findIndex(u => u.id === p.id);
  if (idx === -1) return res.status(404).json({ error: "Usuario nao encontrado" });
  if (list[idx].pw !== hashPw(currentPassword)) return res.status(401).json({ error: "Senha atual incorreta" });
  list[idx].pw = hashPw(newPassword);
  res.json({ message: "Senha alterada com sucesso" });
});

// ── Health ────────────────────────────────────────────────────────
app.get('/health', (_,res)=>res.json({ok:true}));

// ── Catch-all ─────────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🔒 PhronexSec Support running on port ${PORT}`));
