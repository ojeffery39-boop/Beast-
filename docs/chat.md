# Beast chat: local prototype

A mobile-friendly chat UI lives in `web/chat.html`. `server/chat.mjs` proxies requests to Gemini with the server-side `GEMINI_API_KEY` environment variable. The browser never receives the key. Beast may return a `[SILENT]` marker instead of replying. This is a model output convention, not genuine agency or autonomous initiation.

## Local development
Run `GEMINI_API_KEY=... node server/chat.mjs` in a **private local terminal**, then open http://127.0.0.1:3000. Never put the key into source code, browser JavaScript, or GitHub commits.

**Security warning:** This is a local-only development prototype, bound to 127.0.0.1. It has no user authentication, rate limiting, durable database, or independent watchdog. Do not expose it to the internet or deploy it publicly. History is volatile and shared within the single local process.

A GitHub Actions repository secret is available only to workflows explicitly configured to receive it; it does not automatically configure a live web server. A secure hosted backend and authenticated sessions are required before phone access outside the development machine.
