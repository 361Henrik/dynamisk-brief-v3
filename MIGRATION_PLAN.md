# Migration Plan: Base44 → Supabase + Vercel

## Overview

This document is the authoritative guide for Claude Code to migrate Dynamisk Brief V1 away from Base44 to a proper production stack. The goal is **surgical**: replace every Base44 call with its direct equivalent while preserving all existing UI logic, component structure, and product behaviour. The user experience must not change.

**Target stack:**
- Frontend: React + Vite + Tailwind + shadcn/ui (unchanged)
- Auth: Supabase Auth (email/password)
- Database: Supabase Postgres
- File storage: Supabase Storage
- PDF extraction: Vercel API route using `pdf-parse`
- AI calls: Vercel API route using `@anthropic-ai/sdk`
- DOCX generation: Vercel API route using `docx` npm package
- Hosting: Vercel (deploy from this GitHub repo)

---

## Phase 1: Foundation — Supabase + new API layer

### 1.1 Install new dependencies

```bash
npm install @supabase/supabase-js @anthropic-ai/sdk pdf-parse docx
npm install -D @types/pdf-parse
```

Remove from package.json:
```bash
npm uninstall @base44/sdk
```

### 1.2 Environment variables

Create `.env.local` (DO NOT commit):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FEEDBACK_EMAIL=henrik@yourdomain.com
```

### 1.3 Create Supabase client

Create `src/lib/supabase.js`:
```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### 1.4 Supabase database schema

Run this SQL in Supabase SQL editor:

```sql
-- Enable RLS on all tables

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  theme_id uuid references public.themes(id),
  theme_name text,
  title text,
  status text default 'utkast',
  current_step text default 'source_material',
  rammer jsonb,
  confirmed_points jsonb default '[]',
  proposed_brief jsonb,
  generated_document_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.dialog_entries (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references public.briefs(id) on delete cascade,
  role text not null,
  content text not null,
  input_method text,
  sequence_number integer,
  created_at timestamptz default now()
);

create table public.brief_sources (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references public.briefs(id) on delete cascade,
  source_type text not null, -- 'file', 'url', 'text'
  file_name text,
  file_url text,
  mime_type text,
  extracted_text text,
  extraction_status text default 'pending', -- 'pending', 'success', 'error'
  extraction_error text,
  created_at timestamptz default now()
);

create table public.knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  doc_type text,
  title text,
  extracted_text text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  category text,
  message text,
  page_context text,
  step_context text,
  brief_id uuid,
  submitted_email text,
  severity text,
  created_at timestamptz default now()
);

-- RLS policies
alter table public.themes enable row level security;
alter table public.briefs enable row level security;
alter table public.dialog_entries enable row level security;
alter table public.brief_sources enable row level security;
alter table public.knowledge_docs enable row level security;
alter table public.feedback enable row level security;

-- Themes: everyone authenticated can read
create policy "Authenticated users can read themes" on public.themes
  for select using (auth.role() = 'authenticated');

-- Briefs: users own their briefs
create policy "Users own their briefs" on public.briefs
  for all using (auth.uid() = user_id);

-- Dialog entries: via brief ownership
create policy "Users access dialog via brief" on public.dialog_entries
  for all using (
    exists (select 1 from public.briefs where id = brief_id and user_id = auth.uid())
  );

-- Brief sources: via brief ownership
create policy "Users access sources via brief" on public.brief_sources
  for all using (
    exists (select 1 from public.briefs where id = brief_id and user_id = auth.uid())
  );

-- Knowledge docs: authenticated read
create policy "Authenticated users can read knowledge docs" on public.knowledge_docs
  for select using (auth.role() = 'authenticated');

-- Feedback: insert only, no read
create policy "Anyone authenticated can submit feedback" on public.feedback
  for insert with check (auth.role() = 'authenticated');
```

### 1.5 Seed initial themes

```sql
insert into public.themes (name, description, is_active) values
  ('GLN', 'Global Location Number – identifikasjon av lokasjoner', true),
  ('GTIN', 'Global Trade Item Number – produktidentifikasjon', true),
  ('Sporbarhet', 'Sporing av varer gjennom verdikjeden', true),
  ('Kursmarkedsføring', 'Markedsføring av GS1-kurs og opplæring', true),
  ('Datakvalitet', 'Kvalitetssikring av produktdata', true);
```

---

## Phase 2: Auth migration

### 2.1 Replace AuthContext.jsx

Replace `src/lib/AuthContext.jsx` entirely. The new version uses Supabase Auth:

```jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
      setIsLoadingAuth(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      authError: null,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
```

### 2.2 Replace AuthProvider.jsx

Replace `src/components/auth/AuthProvider.jsx` — it currently re-exports from `src/lib/AuthContext.jsx`. Keep this re-export pattern but update the import to match the new file.

### 2.3 Create Login page

Create `src/pages/Login.jsx`:

```jsx
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#002C6C] rounded-xl mx-auto flex items-center justify-center text-white font-bold text-xl mb-4">G</div>
          <h1 className="text-2xl font-bold text-gray-900">Dynamisk Brief</h1>
          <p className="text-gray-500 mt-1">GS1 Norway</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input type="email" placeholder="E-post" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Passord" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" className="w-full bg-[#002C6C] hover:bg-[#001a45]" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Logg inn
          </Button>
        </form>
      </div>
    </div>
  );
}
```

### 2.4 Update RequireAuth.jsx

Replace `src/components/auth/RequireAuth.jsx` to redirect to `/login` instead of calling `base44.auth.redirectToLogin()`:

```jsx
import { useAuth } from '@/components/auth/AuthProvider';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export function RequireAuth({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
```

### 2.5 Add /login route in App.jsx

Add `<Route path="/login" element={<Login />} />` to the router in `src/App.jsx`. Login route should NOT be wrapped in RequireAuth.

---

## Phase 3: Database adapter layer

### 3.1 Create `src/api/db.js`

This is the core of the migration. Every `base44.entities.*` call in the codebase maps to a function here. Components import from this file instead of from base44Client.

```js
import { supabase } from '@/lib/supabase';

// ─── BRIEFS ──────────────────────────────────────────────────────────────────

export const Briefs = {
  async create(data) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: brief, error } = await supabase
      .from('briefs')
      .insert({ ...data, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return toCamel(brief);
  },
  async get(id) {
    const { data, error } = await supabase
      .from('briefs')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return toCamel(data);
  },
  async list() {
    const { data, error } = await supabase
      .from('briefs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCamel);
  },
  async update(id, updates) {
    const { data, error } = await supabase
      .from('briefs')
      .update({ ...toSnake(updates), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return toCamel(data);
  },
  async delete(id) {
    const { error } = await supabase.from('briefs').delete().eq('id', id);
    if (error) throw error;
  }
};

// ─── DIALOG ENTRIES ───────────────────────────────────────────────────────────

export const DialogEntries = {
  async listForBrief(briefId) {
    const { data, error } = await supabase
      .from('dialog_entries')
      .select('*')
      .eq('brief_id', briefId)
      .order('sequence_number', { ascending: true });
    if (error) throw error;
    return data.map(toCamel);
  },
  async create(data) {
    const { data: entry, error } = await supabase
      .from('dialog_entries')
      .insert(toSnake(data))
      .select()
      .single();
    if (error) throw error;
    return toCamel(entry);
  },
  async deleteForBrief(briefId) {
    const { error } = await supabase.from('dialog_entries').delete().eq('brief_id', briefId);
    if (error) throw error;
  }
};

// ─── BRIEF SOURCES ────────────────────────────────────────────────────────────

export const BriefSources = {
  async listForBrief(briefId) {
    const { data, error } = await supabase
      .from('brief_sources')
      .select('*')
      .eq('brief_id', briefId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(toCamel);
  },
  async create(data) {
    const { data: source, error } = await supabase
      .from('brief_sources')
      .insert(toSnake(data))
      .select()
      .single();
    if (error) throw error;
    return toCamel(source);
  },
  async update(id, updates) {
    const { data, error } = await supabase
      .from('brief_sources')
      .update(toSnake(updates))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return toCamel(data);
  },
  async delete(id) {
    const { error } = await supabase.from('brief_sources').delete().eq('id', id);
    if (error) throw error;
  },
  async deleteForBrief(briefId) {
    const { error } = await supabase.from('brief_sources').delete().eq('brief_id', briefId);
    if (error) throw error;
  }
};

// ─── THEMES ───────────────────────────────────────────────────────────────────

export const Themes = {
  async listActive() {
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data.map(toCamel);
  },
  async create(data) {
    const { data: theme, error } = await supabase.from('themes').insert(data).select().single();
    if (error) throw error;
    return toCamel(theme);
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('themes').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  async delete(id) {
    const { error } = await supabase.from('themes').delete().eq('id', id);
    if (error) throw error;
  }
};

// ─── KNOWLEDGE DOCS ───────────────────────────────────────────────────────────

export const KnowledgeDocs = {
  async getActiveBriefTemplate() {
    const { data, error } = await supabase
      .from('knowledge_docs')
      .select('*')
      .eq('doc_type', 'brief_template')
      .eq('is_active', true)
      .single();
    if (error) throw error;
    return toCamel(data);
  }
};

// ─── FIELD NAME CONVERTERS ────────────────────────────────────────────────────
// Supabase uses snake_case; components use camelCase

function toCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      v && typeof v === 'object' && !Array.isArray(v) ? toCamel(v) : v
    ])
  );
}

function toSnake(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/([A-Z])/g, '_$1').toLowerCase(),
      v
    ])
  );
}
```

---

## Phase 4: Vercel API routes

Create an `api/` directory at the project root (next to `src/`). Each file becomes a Vercel serverless function.

### 4.1 `api/llm.js` — AI calls (replaces `InvokeLLM`)

```js
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, model = 'claude-sonnet-4-5', responseJsonSchema } = req.body;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      ...(responseJsonSchema ? {
        system: 'You must respond with valid JSON only. No markdown, no explanation, just the JSON object.'
      } : {})
    });

    const text = message.content[0].text;

    if (responseJsonSchema) {
      const clean = text.replace(/```json\n?|\n?```/g, '').trim();
      return res.status(200).json(JSON.parse(clean));
    }

    return res.status(200).json({ response: text });
  } catch (error) {
    console.error('LLM error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 4.2 `api/extract.js` — PDF + URL extraction (replaces `ExtractDataFromUploadedFile`)

```js
import pdfParse from 'pdf-parse';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { sourceId, sourceType, fileUrl, briefId } = req.body;

  try {
    let extractedText = '';

    if (sourceType === 'file') {
      // Download from Supabase Storage and parse PDF
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text.substring(0, 100000); // cap at 100k chars
    } else if (sourceType === 'url') {
      // Fetch URL content
      const response = await fetch(fileUrl, {
        headers: { 'User-Agent': 'DynamiskBrief/1.0' }
      });
      const html = await response.text();
      // Strip HTML tags for basic text extraction
      extractedText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 100000);
    }

    // Update source record
    await supabase
      .from('brief_sources')
      .update({
        extracted_text: extractedText,
        extraction_status: 'success',
        extraction_error: null
      })
      .eq('id', sourceId);

    return res.status(200).json({ success: true, chars: extractedText.length });
  } catch (error) {
    console.error('Extraction error:', error);
    await supabase
      .from('brief_sources')
      .update({
        extraction_status: 'error',
        extraction_error: error.message
      })
      .eq('id', sourceId);

    return res.status(500).json({ error: error.message });
  }
}
```

### 4.3 `api/feedback.js` — Feedback submission (replaces `submitFeedback` function)

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { category, message, pageContext, stepContext, briefId, submittedEmail, severity } = req.body;

  try {
    await supabase.from('feedback').insert({
      category,
      message,
      page_context: pageContext,
      step_context: stepContext,
      brief_id: briefId || null,
      submitted_email: submittedEmail || null,
      severity: severity || null
    });

    // Optional: send email notification here via Resend/Nodemailer
    // For now, just store it

    return res.status(200).json({ stored: true, emailed: false });
  } catch (error) {
    console.error('Feedback error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 4.4 `api/approve-brief.js` — DOCX generation (replaces `approveBrief` function)

```js
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getContentText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(b => b.content || '').join('\n\n');
  return '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { briefId } = req.body;

  try {
    const { data: brief } = await supabase.from('briefs').select('*').eq('id', briefId).single();
    if (!brief) return res.status(404).json({ error: 'Brief not found' });

    const sections = brief.proposed_brief?.sections || {};

    const SECTION_LABELS = [
      { key: 'prosjektinformasjon', label: '1. Prosjektinformasjon' },
      { key: 'bakgrunn', label: '2. Bakgrunn og situasjonsbeskrivelse' },
      { key: 'maal', label: '3. Mål og suksesskriterier' },
      { key: 'maalgrupper', label: '4. Målgrupper' },
      { key: 'verdiforslag', label: '5. GS1-tilbudet og verdiforslag' },
      { key: 'budskap', label: '6. Budskap, tone og stil' },
      { key: 'leveranser', label: '7. Leveranser og kanaler' },
      { key: 'rammer', label: '8. Praktiske rammer og godkjenning' },
      { key: 'kildemateriale', label: '9. Kildemateriale' }
    ];

    const docChildren = [
      new Paragraph({
        text: brief.title || 'Kommunikasjonsbrief',
        heading: HeadingLevel.TITLE
      }),
      new Paragraph({
        children: [new TextRun({ text: `GS1 Norway · ${new Date().toLocaleDateString('nb-NO')}`, color: '888888' })]
      }),
      new Paragraph({ text: '' }),
    ];

    for (const { key, label } of SECTION_LABELS) {
      const sectionData = sections[key];
      const text = sectionData ? getContentText(sectionData.content) : 'Ikke utfylt';
      docChildren.push(
        new Paragraph({ text: label, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ children: [new TextRun({ text })] }),
        new Paragraph({ text: '' })
      );
    }

    const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
    const buffer = await Packer.toBuffer(doc);

    // Upload to Supabase Storage
    const fileName = `briefs/${briefId}/brief-${Date.now()}.docx`;
    await supabase.storage.from('documents').upload(fileName, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true
    });

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);

    // Update brief status
    await supabase.from('briefs').update({
      status: 'godkjent',
      generated_document_url: publicUrl,
      proposed_brief: {
        ...brief.proposed_brief,
        status: 'approved',
        approved_at: new Date().toISOString()
      }
    }).eq('id', briefId);

    return res.status(200).json({ url: publicUrl });
  } catch (error) {
    console.error('Approve error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 4.5 `api/upload.js` — File upload to Supabase Storage (replaces `UploadFile`)

```js
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = formidable({});
  const [, files] = await form.parse(req);
  const file = files.file?.[0];
  if (!file) return res.status(400).json({ error: 'No file' });

  const buffer = fs.readFileSync(file.filepath);
  const fileName = `uploads/${Date.now()}-${file.originalFilename}`;

  const { error } = await supabase.storage.from('documents').upload(fileName, buffer, {
    contentType: file.mimetype,
    upsert: false
  });

  if (error) return res.status(500).json({ error: error.message });

  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
  return res.status(200).json({ file_url: publicUrl });
}
```

Add formidable: `npm install formidable`

---

## Phase 5: Component migration — swap Base44 calls

For each component, replace Base44 calls with the new adapter. The component logic does NOT change — only the data layer calls.

### 5.1 Mapping table

| Current call | Replace with |
|---|---|
| `base44.entities.Brief.filter({ id })` | `Briefs.get(id)` |
| `base44.entities.Brief.filter({})` | `Briefs.list()` |
| `base44.entities.Brief.create(data)` | `Briefs.create(data)` |
| `base44.entities.Brief.update(id, data)` | `Briefs.update(id, data)` |
| `base44.entities.Brief.delete(id)` | `Briefs.delete(id)` |
| `base44.entities.DialogEntry.filter({ briefId }, 'sequenceNumber')` | `DialogEntries.listForBrief(briefId)` |
| `base44.entities.DialogEntry.create(data)` | `DialogEntries.create(data)` |
| `base44.entities.BriefSourceMaterial.filter({ briefId })` | `BriefSources.listForBrief(briefId)` |
| `base44.entities.BriefSourceMaterial.create(data)` | `BriefSources.create(data)` |
| `base44.entities.BriefSourceMaterial.update(id, data)` | `BriefSources.update(id, data)` |
| `base44.entities.BriefSourceMaterial.delete(id)` | `BriefSources.delete(id)` |
| `base44.entities.Theme.filter({ isActive: true })` | `Themes.listActive()` |
| `base44.entities.KnowledgeBaseDoc.filter({ docType: 'brief_template', isActive: true })` | `KnowledgeDocs.getActiveBriefTemplate()` |
| `base44.integrations.Core.InvokeLLM({ prompt })` | `fetch('/api/llm', { method: 'POST', body: JSON.stringify({ prompt }) })` |
| `base44.integrations.Core.InvokeLLM({ prompt, response_json_schema })` | `fetch('/api/llm', { method: 'POST', body: JSON.stringify({ prompt, responseJsonSchema }) })` |
| `base44.integrations.Core.UploadFile({ file })` | `fetch('/api/upload', { method: 'POST', body: formData })` |
| `base44.functions.invoke('submitFeedback', payload)` | `fetch('/api/feedback', { method: 'POST', body: JSON.stringify(payload) })` |
| `base44.functions.invoke('approveBrief', { briefId })` | `fetch('/api/approve-brief', { method: 'POST', body: JSON.stringify({ briefId }) })` |
| `base44.auth.me()` | `supabase.auth.getUser()` |

### 5.2 Files to update (every Base44 import must be removed)

1. `src/pages/NewBrief.jsx` — replace `base44.entities.Theme.filter` and `base44.entities.Brief.create`
2. `src/pages/BriefEditor.jsx` — replace all `base44.entities.Brief.*` and `base44.entities.BriefSourceMaterial.*` and `base44.entities.DialogEntry.*` and `base44.auth.me()`
3. `src/pages/BriefList.jsx` — replace `base44.entities.Brief.filter`
4. `src/pages/AdminThemes.jsx` — replace `base44.entities.Theme.*`
5. `src/pages/AdminUsers.jsx` — replace `base44.auth.*` and any user entity calls
6. `src/pages/AdminBriefmal.jsx` — replace `base44.entities.KnowledgeBaseDoc.*`
7. `src/components/brief/AIDialog.jsx` — replace `base44.entities.DialogEntry.*`, `base44.entities.Brief.update`, `base44.integrations.Core.InvokeLLM`
8. `src/components/brief/SourceMaterialUpload.jsx` — replace `base44.entities.BriefSourceMaterial.*`, `base44.integrations.Core.UploadFile`
9. `src/components/brief/ProposedBrief.jsx` — replace `base44.entities.*`, `base44.integrations.Core.InvokeLLM`, `base44.functions.invoke('approveBrief')`
10. `src/components/brief/FinalBrief.jsx` — replace any remaining `base44.entities.Brief.*`
11. `src/components/feedback/FeedbackBox.jsx` — replace `base44.functions.invoke('submitFeedback')` and `base44.*` auth
12. `src/lib/AuthContext.jsx` — full replacement (see Phase 2)

### 5.3 Source extraction trigger

After creating a source record with `BriefSources.create()`, immediately call the extract API:

```js
// After creating source
const source = await BriefSources.create({ briefId, sourceType, fileUrl, ... });

// Trigger extraction (fire and forget — status polling handles the rest)
fetch('/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourceId: source.id,
    sourceType: source.sourceType,
    fileUrl: source.fileUrl,
    briefId: source.briefId
  })
});
```

The existing polling logic in `SourceMaterialUpload.jsx` (checking `extractionStatus === 'pending'` every 3 seconds) continues to work as-is.

---

## Phase 6: Remove Base44 artifacts

After all components are migrated:

1. Delete `src/api/base44Client.js`
2. Delete `src/api/integrations.js`
3. Delete `src/api/entities.js`
4. Delete `src/lib/app-params.js`
5. Delete `src/lib/VisualEditAgent.jsx` (Base44 dev tool)
6. Remove `@base44/sdk` from `package.json` and run `npm install`
7. Search entire codebase for `base44` — every remaining reference is a bug

---

## Phase 7: Vercel deployment

### 7.1 `vercel.json`

Create at project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 7.2 Environment variables in Vercel

In the Vercel dashboard, add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FEEDBACK_EMAIL`

### 7.3 Supabase Storage bucket

In Supabase dashboard: Storage → New bucket → `documents` → Public bucket (so generated DOCX files are downloadable).

---

## Phase 8: Smoke tests

After deployment, verify each user journey:

1. **Login** → user can log in with email/password
2. **New brief** → themes load, user can pick one, brief is created in DB
3. **Source upload** → PDF uploads to Supabase Storage, extraction triggers, status polls to 'success'
4. **URL source** → URL is added, extraction triggers, text is fetched
5. **Text source** → text is saved immediately with status 'success'
6. **AI dialog** → questions appear, user answers, sections are tracked, confirmedPoints saves to DB
7. **Generate brief** → 9-section brief is generated via `/api/llm`, sections appear
8. **Section feedback** → notes + "Update with feedback" button updates a section via `/api/llm`
9. **Approve brief** → DOCX is generated, stored in Supabase Storage, download link appears
10. **Feedback box** → feedback submits via `/api/feedback`, stored in DB
11. **Brief list** → user sees all their briefs with correct status

---

## What NOT to change

- All component UI/JSX structure
- The BriefStepper flow (5 steps)
- The BRIEF_SECTIONS definition in InterviewProgress.jsx
- The source-tagging system (brukerinput / kildemateriale / forslag_fra_systemet)
- The FeedbackBox component (just swap the submit call)
- The ProposedSection editor with notes + "Update with feedback"
- The confirmedPoints tracking logic in AIDialog.jsx
- The polling logic in SourceMaterialUpload.jsx
- Tailwind classes and shadcn/ui components
- GS1 color scheme (#002C6C, #F26334)
- All Norwegian copy

---

## Summary of new files created

```
src/
  lib/
    supabase.js          ← new
  api/
    db.js                ← new (replaces base44Client.js)
  pages/
    Login.jsx            ← new
api/                     ← new directory (Vercel functions)
  llm.js
  extract.js
  feedback.js
  approve-brief.js
  upload.js
vercel.json              ← new
MIGRATION_PLAN.md        ← this file
```
