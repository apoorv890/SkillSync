import { google } from 'googleapis';
import { DateTime } from 'luxon';
import User from '../models/User.js';
import { ApiError, HTTP_STATUS } from '../utils/http.js';

const IST = 'Asia/Kolkata';

function getOAuthClient() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const redirectUri =
    (process.env.GOOGLE_CALENDAR_REDIRECT_URI || '').trim() ||
    'http://localhost:5000/api/calendar/oauth/callback';

  if (!clientId || !clientSecret) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Google OAuth is not configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getCalendarAuthUrl(state) {
  const oauth = getOAuthClient();
  return oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state
  });
}

export async function exchangeCalendarCodeAndStore({ userId, code }) {
  const oauth = getOAuthClient();
  const { tokens } = await oauth.getToken(code);
  if (!tokens?.refresh_token) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'No refresh token returned. Try connecting again (consent screen).'
    );
  }

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        googleCalendarRefreshToken: tokens.refresh_token,
        googleCalendarConnectedAt: new Date()
      }
    }
  );

  return true;
}

async function getAuthorizedCalendarClient(adminUserId) {
  const admin = await User.findById(adminUserId).lean();
  if (!admin) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Admin not found');
  if (!admin.googleCalendarRefreshToken) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Admin calendar is not connected');
  }

  const oauth = getOAuthClient();
  oauth.setCredentials({ refresh_token: admin.googleCalendarRefreshToken });
  const calendar = google.calendar({ version: 'v3', auth: oauth });
  return { calendar, oauth };
}

function getWorkWeekWindow({ week = 'auto' }) {
  const now = DateTime.now().setZone(IST);
  let start = now.startOf('day');

  // If weekend, start next Monday.
  if (start.weekday > 5) {
    start = start.plus({ days: 8 - start.weekday }).startOf('day');
  }

  if (week === 'next') {
    // Start coming Monday.
    const deltaToMonday = (8 - start.weekday) % 7;
    start = start.plus({ days: deltaToMonday || 7 }).startOf('day');
  }

  // End on Friday of that week.
  const end = start.plus({ days: 5 - start.weekday }).endOf('day');
  return { start, end };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export async function getAvailableSlots({ adminUserId, week = 'auto' }) {
  const { calendar } = await getAuthorizedCalendarClient(adminUserId);
  const { start, end } = getWorkWeekWindow({ week });

  const startUtc = start.toUTC();
  const endUtc = end.toUTC();

  const fb = await calendar.freebusy.query({
    requestBody: {
      timeMin: startUtc.toISO(),
      timeMax: endUtc.toISO(),
      timeZone: IST,
      items: [{ id: 'primary' }]
    }
  });

  const busy =
    fb?.data?.calendars?.primary?.busy?.map((b) => ({
      start: DateTime.fromISO(b.start, { zone: 'utc' }),
      end: DateTime.fromISO(b.end, { zone: 'utc' })
    })) || [];

  const slots = [];
  for (
    let d = start.startOf('day');
    d <= end.startOf('day');
    d = d.plus({ days: 1 })
  ) {
    if (d.weekday > 5) continue;
    // 10:00 to 18:00 IST, 60-min slots.
    let t = d.set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    const lastStart = d.set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
    while (t <= lastStart) {
      const slotStartIst = t;
      const slotEndIst = t.plus({ hours: 1 });

      const sUtc = slotStartIst.toUTC();
      const eUtc = slotEndIst.toUTC();

      const isBusy = busy.some((b) => overlaps(sUtc, eUtc, b.start, b.end));
      if (!isBusy) {
        slots.push({
          startIso: slotStartIst.toISO(),
          endIso: slotEndIst.toISO(),
          label: slotStartIst.toFormat("ccc, dd LLL yyyy 'at' hh:mm a 'IST'"),
          voiceLabel: slotStartIst.toFormat(
            "cccc d MMMM yyyy 'at' h:mm a 'IST' (Asia/Kolkata)"
          )
        });
      }
      t = t.plus({ hours: 1 });
    }
  }

  const nowIst = DateTime.now().setZone(IST);

  return {
    timezone: IST,
    timezoneDescription:
      'Asia/Kolkata (Indian Standard Time, IST, UTC+05:30). Never tell the candidate UTC or Zulu time.',
    currentTimeIst: nowIst.toFormat("cccc d LLL yyyy, h:mm a z"),
    schedulingHint:
      'Offer slots using voiceLabel only. Do not convert to UTC. Pass startIso from the chosen slot unchanged to bookInterviewSlot.',
    window: { start: start.toISO(), end: end.toISO() },
    slotDurationMinutes: 60,
    slots
  };
}

export async function scheduleInterview({
  adminUserId,
  slotStartIso,
  candidateEmail,
  candidateName,
  title,
  description
}) {
  const { calendar } = await getAuthorizedCalendarClient(adminUserId);

  let startIst = DateTime.fromISO(slotStartIso.trim(), { setZone: true });
  if (!startIst.isValid) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid slotStartIso');
  }
  startIst = startIst.setZone(IST);
  const endIst = startIst.plus({ hours: 1 });

  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: title || 'SkillSync Interview',
      description: description || '',
      start: { dateTime: startIst.toISO(), timeZone: IST },
      end: { dateTime: endIst.toISO(), timeZone: IST },
      attendees: candidateEmail
        ? [{ email: candidateEmail, displayName: candidateName || undefined }]
        : []
    },
    sendUpdates: 'all'
  });

  return {
    eventId: event.data.id,
    htmlLink: event.data.htmlLink,
    startIso: startIst.toISO(),
    endIso: endIst.toISO(),
    timezone: IST,
    voiceConfirmation: startIst.toFormat(
      "cccc d MMMM yyyy 'at' h:mm a 'IST' (Asia/Kolkata)"
    )
  };
}

