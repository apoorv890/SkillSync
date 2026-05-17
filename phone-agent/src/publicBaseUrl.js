function normalizeBaseUrl(value) {
  let baseUrl = String(value || '').trim().replace(/\/$/, '');
  if (!baseUrl) return '';
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`;
  }
  return baseUrl;
}

function getOriginParts(req) {
  const proto =
    (req.get('x-forwarded-proto') || '').split(',')[0]?.trim() ||
    req.protocol ||
    'https';
  const host =
    (req.get('x-forwarded-host') || '').split(',')[0]?.trim() ||
    req.get('host') ||
    '';
  return { proto, host };
}

export function getPublicBaseUrlFromRequest(req) {
  const { proto, host } = getOriginParts(req);
  return `${proto}://${host}`;
}

export async function resolvePublicBaseUrl(config) {
  if (config.publicBaseUrl) {
    return normalizeBaseUrl(config.publicBaseUrl);
  }

  const ngrokApiUrl = String(config.ngrokApiUrl || '').trim().replace(/\/$/, '');
  if (!ngrokApiUrl) {
    throw new Error(
      'Voice calling requires PUBLIC_BASE_URL or NGROK_API_URL so Twilio can reach the phone-agent',
    );
  }

  let response;
  try {
    response = await fetch(`${ngrokApiUrl}/api/tunnels`);
  } catch (error) {
    throw new Error(
      `Could not reach ngrok API at ${ngrokApiUrl}. Start the ngrok tunnel or Compose voice profile first.`,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new Error(`ngrok API returned ${response.status} from ${ngrokApiUrl}/api/tunnels`);
  }

  const payload = await response.json().catch(() => ({}));
  const tunnels = Array.isArray(payload?.tunnels) ? payload.tunnels : [];
  const httpsTunnel = tunnels.find((tunnel) => typeof tunnel?.public_url === 'string' && /^https:\/\//i.test(tunnel.public_url));

  if (!httpsTunnel?.public_url) {
    throw new Error(
      `No active HTTPS ngrok tunnel found at ${ngrokApiUrl}. Start a tunnel to port 3010 first.`,
    );
  }

  return normalizeBaseUrl(httpsTunnel.public_url);
}

export function toWebSocketBaseUrl(baseUrl) {
  return normalizeBaseUrl(baseUrl).replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
}
