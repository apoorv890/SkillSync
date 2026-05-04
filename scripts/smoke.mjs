/**
 * Lightweight HTTP smoke: gateway /health (override with SMOKE_BASE_URL).
 */
const base = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

const paths = ['/health', '/api/csrf-token'];

async function main() {
  for (const p of paths) {
    const url = `${base}${p}`;
    const res = await fetch(url, { redirect: 'manual' });
    if (!res.ok) {
      console.error(`FAIL ${url} → ${res.status}`);
      process.exit(1);
    }
    if (p === '/health') {
      const body = await res.json().catch(() => ({}));
      if (body.status !== 'OK') {
        console.error('FAIL /health body', body);
        process.exit(1);
      }
    }
    console.log(`OK ${url}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
