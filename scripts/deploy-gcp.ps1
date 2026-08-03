<#
.SYNOPSIS
  Deploy VoiceHire (app + phone-agent) to Google Cloud Run.

.DESCRIPTION
  Manual, step-by-step deploy script. Not CI/CD — run sections yourself, in order,
  and read the output between steps (some later steps need values printed by
  earlier ones). Safe to re-run individual steps once secrets/APIs already exist.

  Order matters: phone-agent is deployed first (so its URL is known before app is
  deployed), then app, then both services get a fast `services update` pass to
  wire in each other's real URLs.

  ngrok / local dev is NOT touched by this script or by the deployed services
  themselves: phone-agent only reads PUBLIC_BASE_URL in prod (never
  NGROK_API_URL, which is intentionally never set here), so docker-compose.yml
  and local .env continue to work unchanged.

.NOTES
  Requires: gcloud CLI authenticated (`gcloud auth login`), a GCP project with
  billing enabled, and the secret values on hand locally (never commit them).

  This script does not execute anything by itself — copy/paste sections as you
  go, or dot-source it after setting $ProjectId/$Region/etc. Treat it as a
  runbook, not a black box.
#>

param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [string]$Region = "us-central1",
  [string]$AppService = "voicehire-app",
  [string]$PhoneAgentService = "voicehire-phone-agent"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Step 0: Project setup ===" -ForegroundColor Cyan
gcloud config set project $ProjectId
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com

Write-Host ""
Write-Host "=== Step 1: Secret Manager (one-time) ===" -ForegroundColor Cyan
Write-Host "Run these manually, once, with real secret values loaded from a local secure file (never inline on the command line):"
Write-Host @'
  # Repeat for: JWT_SECRET, GOOGLE_CLIENT_SECRET, GEMINI_API_KEY,
  #             AWS_SECRET_ACCESS_KEY, VOICEHIRE_SERVICE_TOKEN,
  #             TWILIO_AUTH_TOKEN, MONGODB_URI
  gcloud secrets create <NAME> --replication-policy=automatic
  gcloud secrets versions add <NAME> --data-file=<path-to-local-secret-file>

  # Grant the Cloud Run runtime service account access to each secret:
  $ProjectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
  $RuntimeSA = "$ProjectNumber-compute@developer.gserviceaccount.com"
  gcloud secrets add-iam-policy-binding <NAME> --member="serviceAccount:$RuntimeSA" --role="roles/secretmanager.secretAccessor"
'@

Write-Host ""
Write-Host "=== Step 2: Pre-flight checklist (verify manually, no commands) ===" -ForegroundColor Cyan
Write-Host "- MongoDB Atlas Network Access allows Cloud Run egress (server hard-fails to boot otherwise)"
Write-Host "- Google OAuth Console project ready for a new redirect URI once app's URL is known"
Write-Host "- Check Twilio Console for an inbound webhook pointed at an old ngrok URL (update after Step 4c if so)"

Write-Host ""
Write-Host "=== Step 3: Deploy phone-agent ===" -ForegroundColor Cyan
Write-Host "Fill in TWILIO_ACCOUNT_SID / TWILIO_PHONE_NUMBER below before running."
$phoneAgentDeployCmd = @"
gcloud run deploy $PhoneAgentService \`
  --source ./phone-agent \`
  --region $Region \`
  --allow-unauthenticated \`
  --timeout=1800 \`
  --no-cpu-throttling \`
  --min-instances=1 \`
  --concurrency=10 \`
  --set-env-vars="NODE_ENV=production,GEMINI_MODEL=gemini-2.0-flash,TWILIO_ACCOUNT_SID=<sid>,TWILIO_PHONE_NUMBER=<number>" \`
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,TWILIO_AUTH_TOKEN=TWILIO_AUTH_TOKEN:latest,VOICEHIRE_SERVICE_TOKEN=VOICEHIRE_SERVICE_TOKEN:latest"
"@
Write-Host $phoneAgentDeployCmd
Write-Host ""
Write-Host "After it completes, capture the printed Service URL as `$PhoneAgentUrl, e.g.:"
Write-Host '  $PhoneAgentUrl = gcloud run services describe' $PhoneAgentService '--region' $Region '--format="value(status.url)"'

Write-Host ""
Write-Host "=== Step 4: Deploy app ===" -ForegroundColor Cyan
Write-Host "VITE_API_BASE_URL is deliberately NOT set as a build arg -- client/src/lib/api.ts falls back to relative"
Write-Host "'/api' when unset, so the SPA calls same-origin and app never needs a second rebuild for its own URL."
Write-Host "Confirm the current gcloud flag name for build-time substitutions (has shifted across gcloud versions)"
Write-Host "against 'gcloud run deploy --help' before running -- shown below as --set-build-env-vars, verify first."
$appDeployCmd = @"
gcloud run deploy $AppService \`
  --source . \`
  --region $Region \`
  --allow-unauthenticated \`
  --min-instances=0 \`
  --set-build-env-vars="VITE_GOOGLE_CLIENT_ID=<prod-google-client-id>" \`
  --set-env-vars="NODE_ENV=production,SERVE_SPA=1,GEMINI_MODEL=gemini-2.0-flash,AWS_REGION=us-east-1,AWS_S3_BUCKET_NAME=<bucket>,AWS_ACCESS_KEY_ID=<key-id>,GOOGLE_CLIENT_ID=<client-id>,PHONE_AGENT_BASE_URL=`$PhoneAgentUrl" \`
  --set-secrets="JWT_SECRET=JWT_SECRET:latest,MONGODB_URI=MONGODB_URI:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,AWS_SECRET_ACCESS_KEY=AWS_SECRET_ACCESS_KEY:latest,VOICEHIRE_SERVICE_TOKEN=VOICEHIRE_SERVICE_TOKEN:latest"
"@
Write-Host $appDeployCmd
Write-Host ""
Write-Host "After it completes, capture the printed Service URL as `$AppUrl, e.g.:"
Write-Host '  $AppUrl = gcloud run services describe' $AppService '--region' $Region '--format="value(status.url)"'

Write-Host ""
Write-Host "=== Step 4a: External manual step ===" -ForegroundColor Cyan
Write-Host 'Add $AppUrl/api/calendar/oauth/callback to the Google OAuth client Authorized Redirect URIs (Google Cloud Console).'

Write-Host ""
Write-Host "=== Step 4b: Patch cross-service env vars (fast update, no rebuild) ===" -ForegroundColor Cyan
$patchCmd = @"
gcloud run services update $AppService --region $Region \`
  --set-env-vars="ALLOWED_ORIGINS=`$AppUrl,GOOGLE_CALENDAR_REDIRECT_URI=`$AppUrl/api/calendar/oauth/callback"

gcloud run services update $PhoneAgentService --region $Region \`
  --set-env-vars="PUBLIC_BASE_URL=`$PhoneAgentUrl,VOICEHIRE_API_BASE_URL=`$AppUrl"
"@
Write-Host $patchCmd

Write-Host ""
Write-Host "=== Step 4c: External manual step (if applicable) ===" -ForegroundColor Cyan
Write-Host 'If Twilio has an inbound number webhook configured, point it at $PhoneAgentUrl/twilio/voice in the Twilio Console.'

Write-Host ""
Write-Host "=== Done printing the runbook. Nothing above was executed automatically. ===" -ForegroundColor Green
