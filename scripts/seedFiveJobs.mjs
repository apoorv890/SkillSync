/**
 * Creates 5 job postings via the gateway API (same contract as POST /api/jobs).
 *
 * Auth: set `SEED_ADMIN_JWT` in root `.env` to a valid admin JWT (copy from browser
 * after signing in with Google as an admin). Password login was removed.
 *
 * Usage:
 *   node scripts/seedFiveJobs.mjs
 *
 * Optional:
 *   SEED_GATEWAY_URL=http://127.0.0.1:5000   (default)
 *
 * Requires: gateway + jobs running; admin JWT with role admin.
 */

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const ADMIN_JWT = process.env.SEED_ADMIN_JWT || process.env.ADMIN_JWT;

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
      preferredSkills: 'Prior experience with HR tech or ATS integrations is a plus.',
      aboutCompany:
        'SkillSync is a small product team building modern hiring workflows; platform reliability is a first-class feature.',
      compensation: '$160k–$195k USD base + equity',
    },
    {
      title: `SkillSync — Full Stack Engineer (IT) ${runId}-2`,
      location: 'Hybrid — Austin, TX',
      workType: 'Full-time',
      status: 'active',
      summary: longSummary('FullStack'),
      keyResponsibilities:
        '• Ship end-to-end features across React and Node services.\n• Improve observability and developer tooling.\n• Partner with design on accessible UI.',
      requiredSkills: skillsBlock('React, TypeScript, Node.js, MongoDB, REST'),
      preferredSkills: 'Experience with Vite, micro-frontends, or design systems.',
      aboutCompany:
        'We iterate quickly with a focus on clarity and maintainability for a small user base that still expects polish.',
      compensation: '$130k–$165k USD base',
    },
    {
      title: `SkillSync — IT Support Lead ${runId}-3`,
      location: 'On-site — Seattle, WA',
      workType: 'Full-time',
      status: 'draft',
      summary: longSummary('ITSupport'),
      keyResponsibilities:
        '• Own internal IT operations and endpoint security posture.\n• Automate onboarding/offboarding workflows.\n• Coordinate vendor relationships.',
      requiredSkills: skillsBlock('Okta or Azure AD, MDM, Windows/macOS administration, scripting'),
      preferredSkills: 'SOC2 familiarity; experience supporting engineering-heavy orgs.',
      aboutCompany:
        'SkillSync keeps internal IT lean but disciplined as we scale hiring workflows for customers.',
      compensation: '$95k–$120k USD base',
    },
    {
      title: `SkillSync — Security Engineer (IT) ${runId}-4`,
      location: 'Remote — EU',
      workType: 'Contract',
      status: 'active',
      summary: longSummary('Security'),
      keyResponsibilities:
        '• Threat model new services and integrations.\n• Implement secure defaults for auth and file uploads.\n• Run lightweight pen-test cycles with external partners.',
      requiredSkills: skillsBlock('OWASP ASVS, JWT/OAuth2, AWS IAM, secrets management'),
      preferredSkills: 'Background in regulated industries or SOC2 programs.',
      aboutCompany:
        'Security is prioritized at deployment; this role hardens our multi-service architecture for real customer data.',
      compensation: '€600–€800/day (contract)',
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
      compensation: '$95k–$120k USD base + bonus eligible',
    },
  ];
}

async function createJob(token, payload) {
  const res = await fetch(`${API}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
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
  if (!ADMIN_JWT) {
    throw new Error(
      'Set SEED_ADMIN_JWT (or ADMIN_JWT) in .env to an admin access token from the app after Google sign-in.'
    );
  }

  const jobs = buildJobs(runId);
  const created = [];

  for (let i = 0; i < jobs.length; i++) {
    const payload = jobs[i];
    const result = await createJob(ADMIN_JWT, payload);
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
