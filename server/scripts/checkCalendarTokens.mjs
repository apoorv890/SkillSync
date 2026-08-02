#!/usr/bin/env node
/**
 * Periodic health check for connected admins' Google Calendar refresh tokens.
 *
 * GoogleCalendarService.getAuthorizedCalendarClient only discovers an
 * expired/revoked refresh token when a live Calendar API call fails
 * (server/src/services/GoogleCalendarService.js) — which today means a
 * candidate mid-interview is the first to find out. This script proactively
 * exchanges each connected admin's stored refresh token for an access token
 * and flags any that fail, so it can be run on a schedule (cron / CI job)
 * ahead of that.
 *
 * Usage: node server/scripts/checkCalendarTokens.mjs
 *        (or: npm run check:calendar-tokens, from repo root or server/)
 * Exit code: 0 if all connected tokens are valid, 1 if any are invalid or on error.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { google } from 'googleapis';
import User from '../src/models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/scripts -> repo root .env (same layout server/src/loadEnv.js uses from server/src)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function getOAuthClient() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not configured');
  }
  return new google.auth.OAuth2(clientId, clientSecret);
}

async function checkToken(refreshToken) {
  const oauth = getOAuthClient();
  oauth.setCredentials({ refresh_token: refreshToken });
  try {
    // Forces a refresh-token -> access-token exchange against Google, the same
    // call that fails at booking time if the token has expired or been revoked.
    await oauth.getAccessToken();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not configured (repo root .env)');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const admins = await User.find({
    role: 'admin',
    googleCalendarRefreshToken: { $exists: true, $nin: [null, ''] }
  })
    .select('_id email googleCalendarRefreshToken')
    .lean();

  if (admins.length === 0) {
    console.log('No admin has a connected Google Calendar — nothing to check.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Checking ${admins.length} connected admin calendar token(s)...`);

  let failures = 0;
  for (const admin of admins) {
    const result = await checkToken(admin.googleCalendarRefreshToken);
    if (result.ok) {
      console.log(`OK       ${admin.email} (${admin._id})`);
    } else {
      failures += 1;
      console.error(`INVALID  ${admin.email} (${admin._id}) — ${result.error}`);
      console.error(
        '         -> Ask this admin to reconnect via the "Connect/Reconnect Calendar" button on the admin dashboard.'
      );
    }
  }

  await mongoose.disconnect();

  if (failures > 0) {
    console.error(`\n${failures} of ${admins.length} calendar token(s) are invalid.`);
    process.exit(1);
  }

  console.log(`\nAll ${admins.length} calendar token(s) are valid.`);
}

main().catch((err) => {
  console.error('Calendar token check failed:', err);
  process.exit(1);
});
