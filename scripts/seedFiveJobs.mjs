/**
 * Creates 5 IT-domain job postings via the gateway (POST /api/jobs).
 * Each run uses a unique batch id in titles and copy so postings are easy to tell apart.
 * Every job is forced to status `active`.
 *
 * Auth: set `SEED_ADMIN_JWT` or `ADMIN_JWT` in root `.env` (admin JWT from the app).
 *
 * Usage:
 *   node scripts/seedFiveJobs.mjs
 *
 * Optional: SEED_GATEWAY_URL (default http://127.0.0.1:5000)
 */

import { existsSync, readFileSync } from 'fs';
import { randomBytes } from 'crypto';
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

/** ≥50 chars for API validation */
function itSummary(roleTag, batchId, idx) {
  return (
    `${roleTag} (IT) — batch ${batchId} role #${idx + 1}. ` +
    `Own enterprise systems, documentation, and stakeholder communication across internal technology. ` +
    `This summary stays over fifty characters for SkillSync validation.`
  );
}

/** ≥20 chars */
function skillsBase(extra) {
  return (
    `IT domain: ${extra}; Windows/macOS, ticketing, identity basics, ` +
    `scripting (PowerShell or Bash), networking fundamentals, change management.`
  );
}

function buildJobs(batchId) {
  const workTypes = ['Full-time', 'Full-time', 'Part-time', 'Contract', 'Internship'];
  const locations = [
    'Hybrid — Austin, TX (IT hub)',
    'Remote — US East (IT operations)',
    'On-site — Seattle, WA (corporate IT)',
    'Remote — EU (IT support coverage)',
    'Hybrid — Toronto, ON (IT service desk)',
  ];
  const compensations = [
    '$118k–$142k USD base + on-call stipend',
    '$92k–$110k USD base (IT L2 track)',
    '$65–$85/hr USD contract (IT project)',
    '€58k–€72k EUR base + benefits',
    '$32–$38/hr USD internship (IT, 6 mo)',
  ];

  const roles = [
    {
      title: `IT — Senior Systems Administrator [${batchId}]`,
      roleTag: 'Senior Systems Administrator',
      bullets:
        '• Own AD/Azure AD hygiene, GPO baselines, and patch cycles.\n• Lead incident bridges for Sev-1 IT outages.\n• Mentor L1/L2 on runbooks and knowledge articles.',
      skillsExtra: 'Windows Server, Azure AD, Intune, M365 admin center',
      preferred: 'ITIL 4 Foundation; experience with MDM migrations.',
      about:
        'Internal IT for a product company: lean team, high trust, strong change controls for production-adjacent systems.',
    },
    {
      title: `IT — Network Engineer (Enterprise) [${batchId}]`,
      roleTag: 'Enterprise Network Engineer',
      bullets:
        '• Design and operate LAN/WLAN; firewall rule hygiene.\n• Capacity planning for office and VPN footprints.\n• Partner with security on segmentation and monitoring.',
      skillsExtra: 'Cisco/Meraki or Juniper, VPN, TCP/IP, Wi-Fi 6, syslog',
      preferred: 'CCNA or equivalent; zero-trust familiarity a plus.',
      about:
        'Corporate IT backbone team; you keep offices and remote staff connected with measurable uptime targets.',
    },
    {
      title: `IT — Service Desk Lead [${batchId}]`,
      roleTag: 'IT Service Desk Lead',
      bullets:
        '• Own queue SLAs, shift coverage, and escalation paths.\n• Drive KB quality and deflection metrics.\n• Coordinate vendor tickets (Okta, MDM, telecom).',
      skillsExtra: 'Zendesk/Jira Service Management, SLAs, asset lifecycle',
      preferred: 'People leadership in IT support; SOC2-aware workflows.',
      about:
        'Employee-first IT: fast restores, clear comms, and respectful handoffs to engineering when needed.',
    },
    {
      title: `IT — Identity & Access Analyst [${batchId}]`,
      roleTag: 'Identity and Access Analyst',
      bullets:
        '• Provision/deprovision with least privilege; access reviews.\n• SAML/OIDC app onboarding with security sign-off.\n• Automate repetitive IAM tasks with scripts.',
      skillsExtra: 'Okta/Azure AD, SSO, SCIM, RBAC, audit trails',
      preferred: 'Experience with HRIS-driven joiner-mover-leaver automation.',
      about:
        'Security-aligned IT: you make access smooth without widening blast radius.',
    },
    {
      title: `IT — Endpoint Security Technician [${batchId}]`,
      roleTag: 'Endpoint Security Technician',
      bullets:
        '• Triage EDR alerts; contain and remediate suspicious hosts.\n• Harden laptop baselines; drive disk encryption compliance.\n• Support phishing simulations and remediation.',
      skillsExtra: 'EDR (Defender/CrowdStrike), disk encryption, secure boot',
      preferred: 'GSEC or similar baseline; calm incident documentation.',
      about:
        'IT + security overlap: practical hardening for a small org with real customer data.',
    },
  ];

  return roles.map((r, i) => ({
    title: r.title,
    location: locations[i],
    workType: workTypes[i],
    status: 'active',
    summary: itSummary(r.roleTag, batchId, i),
    keyResponsibilities: r.bullets,
    requiredSkills: skillsBase(r.skillsExtra),
    preferredSkills: r.preferred,
    aboutCompany: r.about,
    compensation: compensations[i],
  }));
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

const batchId = `${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;

try {
  console.log(`Gateway: ${GATEWAY}`);
  if (!ADMIN_JWT) {
    throw new Error(
      'Set SEED_ADMIN_JWT (or ADMIN_JWT) in .env to an admin access token from the app after Google sign-in.'
    );
  }
  console.log(`Batch id (embedded in titles): ${batchId}`);

  const jobs = buildJobs(batchId);
  const created = [];

  for (let i = 0; i < jobs.length; i++) {
    const payload = jobs[i];
    const result = await createJob(ADMIN_JWT, payload);
    const id = result.data?._id || result.data?.id || result._id;
    created.push({ title: payload.title, id: String(id), status: payload.status });
    console.log(`[${i + 1}/5] Created (${payload.status}): ${payload.title} → ${id}`);
  }

  console.log('\nDone. Created IT jobs (all active):');
  for (const row of created) {
    console.log(`  - ${row.id}  ${row.title}`);
  }
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
