const base = (process.env.SMOKE_SERVER_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const url = `${base}/health`;

const res = await fetch(url, { headers: { Accept: 'application/json' } });
const text = await res.text();

if (!res.ok) {
  console.error(`Smoke failed: ${res.status} ${res.statusText}\n${text}`);
  process.exit(1);
}

let json;
try {
  json = JSON.parse(text);
} catch {
  console.error('Smoke failed: response is not JSON\n', text);
  process.exit(1);
}

if (json?.status !== 'OK') {
  console.error('Smoke failed: unexpected body', json);
  process.exit(1);
}

console.log(`Smoke OK: ${url} ->`, json);
