/**
 * Creates 5 job postings via the gateway API (same contract as POST /api/jobs).
 * Every field accepted by job creation is set with distinct values per row.
 *
 * Default admin (dev only — override via argv or env for other accounts):
 *   postmantest2@example.com / ValidPass1!
 *
 * Usage:
 *   node scripts/seedFiveJobs.mjs
 *   node scripts/seedFiveJobs.mjs <adminEmail> <adminPassword>
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node scripts/seedFiveJobs.mjs
 *
 * Optional:
 *   SEED_GATEWAY_URL=http://127.0.0.1:5000   (default)
 *
 * Requires: gateway + auth + jobs running; admin user in MongoDB.
 */

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Load root `.env` into `process.env` if present (no extra npm deps). */
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(path.join(__dirname, '..', '.env'));

const GATEWAY = (process.env.SEED_GATEWAY_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const API = `${GATEWAY}/api`;

/** Hardcoded dev admin; argv or env overrides. */
const DEFAULT_ADMIN_EMAIL = 'postmantest2@example.com';
const DEFAULT_ADMIN_PASSWORD = 'ValidPass1!';

const emailArg = process.argv[2];
const passArg = process.argv[3];
const ADMIN_EMAIL =
  emailArg || process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
const ADMIN_PASSWORD =
  passArg || process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

/** Meets express-validator: summary >= 50, requiredSkills >= 20, other field max lengths */
function buildJobs(runId) {
  const longSummary = (slug) =>
    `${slug} — SkillSync hiring pipeline role. Own delivery from design through production. ` +
    `Collaborate with product and platform teams. This summary is intentionally over fifty characters.`;

  const skillsBlock = (stack) =>
    `${stack} plus REST APIs, Git, code review, testing discipline, and production observability practices.`;

  return [
    {
      title: `SkillSync — Senior Platform Engineer ${runId}-1`,
      location: 'Remote — North America',
      workType: 'Full-time',
      status: 'active',
      summary: longSummary('Platform'),
      keyResponsibilities:
        '• Own core API gateway and service mesh integrations.\n• Drive reliability SLOs and incident response.\n• Mentor engineers on distributed systems.',
      requiredSkills: skillsBlock('Node.js, TypeScript, MongoDB, Docker, Kubernetes'),
      preferredSkills:
        'Terraform, Prometheus, OpenTelemetry, prior experience with high-traffic B2B SaaS.',
      aboutCompany:
        'SkillSync builds AI-assisted hiring workflows for modern recruiting teams. We value clarity, ownership, and customer empathy.',
      compensation: '$165k–$195k USD + equity + benefits'
    },
    {
      title: `SkillSync — Product Designer ${runId}-2`,
      location: 'Hybrid — Austin, TX',
      workType: 'Part-time',
      status: 'draft',
      summary: longSummary('Design'),
      keyResponsibilities:
        '• Lead end-to-end UX for candidate and recruiter journeys.\n• Run usability sessions and synthesize insights.\n• Maintain design system tokens with engineering.',
      requiredSkills: skillsBlock('Figma, prototyping, accessibility (WCAG), design systems, user research'),
      preferredSkills: 'Experience with ATS or HR-tech products; motion design a plus.',
      aboutCompany:
        'SkillSync pairs thoughtful UX with pragmatic engineering so recruiters ship faster without losing the human touch.',
      compensation: '$85–$110/hr depending on seniority'
    },
    {
      title: `SkillSync — Data Engineer (Pipeline) ${runId}-3`,
      location: 'Remote — EU / UK',
      workType: 'Contract',
      status: 'active',
      summary: longSummary('Data'),
      keyResponsibilities:
        '• Build batch and streaming pipelines for resume and application analytics.\n• Partner with search and dashboard teams on contracts.\n• Document schemas and SLAs.',
      requiredSkills: skillsBlock('Python, SQL, Airflow or Dagster, dbt, cloud warehouses (Snowflake/BigQuery)'),
      preferredSkills: 'MongoDB aggregation experience; familiarity with LLM evaluation datasets.',
      aboutCompany:
        'SkillSync connects hiring signals across services; data quality and privacy are first-class concerns for our team.',
      compensation: 'Contract: $90–$115 USD/hr, 6-month renewable'
    },
    {
      title: `SkillSync — ML Engineer Intern ${runId}-4`,
      location: 'On-site — Bengaluru, IN',
      workType: 'Internship',
      status: 'closed',
      summary: longSummary('Intern ML'),
      keyResponsibilities:
        '• Assist with resume parsing benchmarks and scoring calibration.\n• Curate evaluation sets and document failure modes.\n• Ship small improvements to analysis microservices.',
      requiredSkills: skillsBlock('Python, PyTorch or TensorFlow, linear algebra, basic NLP, Git'),
      preferredSkills: 'Coursework in information retrieval; interest in responsible AI in hiring.',
      aboutCompany:
        'SkillSync interns work alongside senior engineers on real ATS scoring paths with mentorship and code review.',
      compensation: 'Paid internship; stipend per local policy'
    },
    {
      title: `SkillSync — Customer Success Manager ${runId}-5`,
      location: 'Remote — US East Coast',
      workType: 'Full-time',
      status: 'active',
      summary: longSummary('CSM'),
      keyResponsibilities:
        '• Onboard new SkillSync customers and own renewal health scores.\n• Translate product capabilities into recruiter workflows.\n• Coordinate with engineering on escalations.',
      requiredSkills: skillsBlock('SaaS onboarding, stakeholder management, data-informed QBRs, Zendesk or similar'),
      preferredSkills: 'Background in recruiting or HRIS integrations; comfortable with light SQL.',
      aboutCompany:
        'SkillSync wins when customers trust the platform; CS partners tightly with product and support leadership.',
      compensation: '$95k–$120k USD base + bonus eligible'
    }
  ];
}

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || body.message || `Login failed: HTTP ${res.status}`);
  }
  const token = body.accessToken;
  if (!token) {
    throw new Error('Login response missing accessToken');
  }
  return token;
}

async function createJob(token, payload) {
  const res = await fetch(`${API}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg = body.errors ? JSON.stringify(body.errors) : body.message || body.error || text;
    throw new Error(`POST /jobs failed (${res.status}): ${msg}`);
  }
  return body;
}

const runId = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

try {
  console.log(`Gateway: ${GATEWAY}`);
  const token = await login();
  console.log(`Logged in as ${ADMIN_EMAIL}`);

  const jobs = buildJobs(runId);
  const created = [];

  for (let i = 0; i < jobs.length; i++) {
    const payload = jobs[i];
    const result = await createJob(token, payload);
    const id = result.data?._id || result.data?.id || result._id;
    created.push({ title: payload.title, id: String(id) });
    console.log(`[${i + 1}/5] Created: ${payload.title} → ${id}`);
  }

  console.log('\nDone. Created jobs:');
  for (const row of created) {
    console.log(`  - ${row.id}  ${row.title}`);
  }
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
