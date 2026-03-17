const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();

// Serve static frontend files from root
app.use(express.static(path.join(__dirname)));
app.use(cors());
app.use(express.json());

// ── In-memory store ──────────────────────────────────────────────
let tickets = [
  {
    id: 'TK-001', title: 'Login page not loading', description: 'Users report blank screen on login.',
    status: 'open', priority: 'high', category: 'bug',
    customer: { name: 'Ana Lima', email: 'ana@acme.com' },
    agent: 'Carlos Silva', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    comments: [{ id: 'c1', author: 'Carlos Silva', role: 'agent', text: 'Investigating the issue.', createdAt: new Date(Date.now() - 3600000).toISOString() }]
  },
  {
    id: 'TK-002', title: 'Invoice #4421 incorrect amount', description: 'Billed $299 instead of $199.',
    status: 'in_progress', priority: 'high', category: 'billing',
    customer: { name: 'Bruno Costa', email: 'bruno@beta.io' },
    agent: 'Maria Souza', createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    comments: []
  },
  {
    id: 'TK-003', title: 'How to export reports as PDF?', description: 'Need step-by-step guide.',
    status: 'resolved', priority: 'low', category: 'question',
    customer: { name: 'Carla Mendes', email: 'carla@gamma.co' },
    agent: 'Carlos Silva', createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    comments: [{ id: 'c2', author: 'Carlos Silva', role: 'agent', text: 'Please check our docs at /help/export', createdAt: new Date(Date.now() - 86400000).toISOString() }]
  },
];

let agents = [
  { id: 'a1', name: 'Carlos Silva', email: 'carlos@support.com', avatar: 'CS' },
  { id: 'a2', name: 'Maria Souza', email: 'maria@support.com', avatar: 'MS' },
  { id: 'a3', name: 'Pedro Alves', email: 'pedro@support.com', avatar: 'PA' },
];

let ticketCounter = 4;
function generateId() { return `TK-${String(ticketCounter++).padStart(3, '0')}`; }

// ── Stats ─────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  res.json({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    highPriority: tickets.filter(t => t.priority === 'high' && t.status !== 'resolved').length,
  });
});

// ── Tickets ───────────────────────────────────────────────────────
app.get('/api/tickets', (req, res) => {
  let result = [...tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const { status, priority, agent, search } = req.query;
  if (status && status !== 'all') result = result.filter(t => t.status === status);
  if (priority && priority !== 'all') result = result.filter(t => t.priority === priority);
  if (agent && agent !== 'all') result = result.filter(t => t.agent === agent);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(t =>
      t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) ||
      t.customer.name.toLowerCase().includes(q) || t.customer.email.toLowerCase().includes(q)
    );
  }
  res.json(result);
});

app.get('/api/tickets/:id', (req, res) => {
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

app.post('/api/tickets', (req, res) => {
  const { title, description, priority = 'medium', category = 'general', customer } = req.body;
  if (!title || !customer?.email) return res.status(400).json({ error: 'title and customer.email required' });
  const ticket = {
    id: generateId(), title, description: description || '',
    status: 'open', priority, category,
    customer: { name: customer.name || customer.email.split('@')[0], email: customer.email },
    agent: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), comments: []
  };
  tickets.unshift(ticket);
  res.status(201).json(ticket);
});

app.patch('/api/tickets/:id', (req, res) => {
  const idx = tickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Ticket not found' });
  ['status', 'priority', 'agent', 'title', 'description', 'category'].forEach(k => {
    if (req.body[k] !== undefined) tickets[idx][k] = req.body[k];
  });
  tickets[idx].updatedAt = new Date().toISOString();
  res.json(tickets[idx]);
});

app.delete('/api/tickets/:id', (req, res) => {
  const idx = tickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Ticket not found' });
  tickets.splice(idx, 1);
  res.json({ success: true });
});

// ── Comments ──────────────────────────────────────────────────────
app.post('/api/tickets/:id/comments', (req, res) => {
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const { author, role = 'agent', text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const comment = { id: crypto.randomUUID(), author: author || 'Agent', role, text, createdAt: new Date().toISOString() };
  ticket.comments.push(comment);
  ticket.updatedAt = new Date().toISOString();
  res.status(201).json(comment);
});

// ── Customer Portal ───────────────────────────────────────────────
app.post('/api/portal/submit', (req, res) => {
  const { name, email, title, description, priority = 'medium', category = 'general' } = req.body;
  if (!email || !title) return res.status(400).json({ error: 'email and title required' });
  const ticket = {
    id: generateId(), title, description: description || '',
    status: 'open', priority, category,
    customer: { name: name || email.split('@')[0], email },
    agent: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), comments: []
  };
  tickets.unshift(ticket);
  res.status(201).json({ id: ticket.id, message: 'Ticket submitted successfully' });
});

app.get('/api/portal/status/:id', (req, res) => {
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ id: ticket.id, title: ticket.title, status: ticket.status, updatedAt: ticket.updatedAt, comments: ticket.comments });
});

// ── Agents ────────────────────────────────────────────────────────
app.get('/api/agents', (req, res) => res.json(agents));

// ── Email ingest ──────────────────────────────────────────────────
app.post('/api/email/ingest', (req, res) => {
  const { from, subject, body } = req.body;
  if (!from || !subject) return res.status(400).json({ error: 'from and subject required' });
  const emailMatch = from.match(/<(.+)>/) || [null, from];
  const email = emailMatch[1];
  const name = from.split('<')[0].trim() || email;
  const ticket = {
    id: generateId(), title: subject, description: body || '(no body)',
    status: 'open', priority: 'medium', category: 'email',
    customer: { name, email },
    agent: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    comments: [], source: 'email'
  };
  tickets.unshift(ticket);
  res.status(201).json(ticket);
});

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true }));

// ── Catch-all: serve frontend ─────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🎫 DeskFlow running on port ${PORT}`));
