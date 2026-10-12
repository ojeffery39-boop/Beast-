# Deploy Beast from a phone using Cloudflare

This Cloudflare Worker is independent of Floot. It provides a Gemini-backed chat UI, D1 conversation storage, an event timeline, and a six-hour scheduled heartbeat. **It does not yet autonomously research, rewrite itself, or operate continuously.** The event timeline records real app events, not private thoughts.

## Setup in the Cloudflare dashboard
1. Create a D1 database called `beast-memory` in Cloudflare's dashboard.
2. Run the SQL in `cloudflare/schema.sql` using the D1 database's **Console** (or via Wrangler).
3. Copy the D1 database ID from Cloudflare and replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.jsonc`.
4. In Cloudflare Workers & Pages, connect this GitHub repository and configure deployment using Wrangler, with `npx wrangler deploy` as the deploy command. Depending on the dashboard's current build UI, GitHub integration may need a Workers Builds setup. This repository also supports deployment from GitHub Actions after adding the appropriate Cloudflare secrets.
5. Configure Worker **secrets** `GEMINI_API_KEY` and `BEAST_ACCESS_TOKEN`. The access token must be a random string at least 24 characters long. Optionally configure `GEMINI_MODEL`.
6. Open the deployed `*.workers.dev` URL on your phone. Enter your access token into the page and start chatting.

**Never paste secrets into GitHub files, workflow logs, or this chat.** GitHub Actions' existing GEMINI_API_KEY secret is not automatically a Cloudflare Worker secret.

## Security and limits
- All API routes require a bearer token. The token is held only in the open page's JavaScript memory, not localStorage or cookies; re-enter it after reloading.
- Cloudflare serves HTTPS on workers.dev. Anyone who knows the access token can use Beast. This is a single-user prototype, without request rate limiting or account-level authorization.
- D1 stores chat text in plaintext within your Cloudflare account. Do not send sensitive information until you are comfortable with that storage.
- Scheduled heartbeat runs every six hours and writes a factual event. It does not make paid model calls.
- This uses the Cloudflare free tier subject to Cloudflare and Gemini limits. No always-on compute is promised.
