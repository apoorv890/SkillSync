#!/usr/bin/env node
/**
 * One-time backfill for Job.recruiterId (server/src/models/Job.js).
 *
 * Before this field existed, every job implicitly used whichever admin
 * GoogleCalendarController's old "first admin with a connected calendar"
 * fallback happened to pick (server/src/controllers/phoneAgentCalendarController.js,
 * now retired in favor of per-job Job.recruiterId resolution). To avoid
 * silently moving already-scheduled interviews to a different calendar,
 * existing jobs are backfilled to that *same* admin — i.e. this makes the
 * previously-implicit owner explicit, it does not reassign ownership.
 *
 * Target admin resolution (same order the old fallback used):
 *   1. GOOGLE_CALENDAR_ADMIN_USER_ID env var, if it points at a real admin.
 *   2. Otherwise the first User with role:'admin' and a connected calendar.
 * If neither resolves, jobs are left with recruiterId: null — the calendar
 * routes handle a null/unconnected recruiter explicitly (see
 * phoneAgentCalendarController.resolveRecruiterForApplication).
 *
 * Usage: node server/scripts/backfillJobRecruiterId.mjs
 *        (or: npm run backfill:job-recruiter, from repo root or server/)
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Job from '../src/models/Job.js';
import User from '../src/models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function resolveDefaultRecruiterId() {
  const explicit = (process.env.GOOGLE_CALENDAR_ADMIN_USER_ID || '').trim();
  if (explicit) {
    const admin = await User.findById(explicit).select('_id role').lean();
    if (admin?.role === 'admin') {
      return String(admin._id);
    }
    console.warn(
      `GOOGLE_CALENDAR_ADMIN_USER_ID=${explicit} does not match a real admin — ignoring it.`
    );
  }

  const admin = await User.findOne({
    role: 'admin',
    googleCalendarRefreshToken: { $exists: true, $nin: [null, ''] }
  })
    .select('_id')
    .lean();

  return admin ? String(admin._id) : null;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not configured (repo root .env)');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const unassignedCount = await Job.countDocuments({ recruiterId: null });
  if (unassignedCount === 0) {
    console.log('No jobs are missing recruiterId — nothing to backfill.');
    await mongoose.disconnect();
    return;
  }

  const defaultRecruiterId = await resolveDefaultRecruiterId();
  if (!defaultRecruiterId) {
    console.error(
      `${unassignedCount} job(s) have no recruiterId, but no admin with a connected ` +
        'Google Calendar was found to backfill them to (and GOOGLE_CALENDAR_ADMIN_USER_ID ' +
        'is not set to a valid admin). Connect a calendar for at least one admin, or set ' +
        'GOOGLE_CALENDAR_ADMIN_USER_ID, then re-run this script.'
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const result = await Job.updateMany(
    { recruiterId: null },
    { $set: { recruiterId: defaultRecruiterId } }
  );

  console.log(
    `Backfilled recruiterId=${defaultRecruiterId} on ${result.modifiedCount} of ${unassignedCount} job(s).`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
