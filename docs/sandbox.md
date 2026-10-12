# Independent Beast sandbox

This is a **self-hostable runtime** independent of Floot and app builders. It does **not** create a cloud VM or an always-on deployment.

## Requirements
A computer or server running Docker Compose, internet access for Gemini, and a Gemini API key. The chat server requires a long random access token and is bound to the host loopback interface. Do not expose port 3000 publicly.

## Run
1. Copy `.env.example` to `.env` on your own machine and enter your API key and a unique random BEAST_ACCESS_TOKEN of at least 24 characters. Never put the key in GitHub source.
2. Run `docker compose up --build -d`.
3. Open `http://127.0.0.1:3000` on that machine. The browser asks for Basic authentication: enter any username and your BEAST_ACCESS_TOKEN as the password.
4. Run `docker compose logs --tail=50 beast` for diagnostics.
5. Run `docker compose down` to stop it. Add `-v` only if you explicitly want to delete its Docker volume.

## Boundaries and limitations
- Container is non-root, has a read-only root filesystem, no added Linux capabilities, and local-only published port.
- The container **has network egress** to call Gemini. This is not a fully network-isolated execution sandbox.
- The Docker volume `beast-data` stores the last 20 chat messages as a JSON file. This is minimal conversation persistence, **not** the research memory architecture.
- The server binds to the container interface using HOST=0.0.0.0, while Compose publishes its port only on the host loopback address. This does not provide authentication.
- The current chat is a single-user prototype with Basic authentication but **no rate limiting or TLS termination**. Do not expose it publicly without a TLS reverse proxy and additional protections.
- Gemini usage may be subject to free-tier limits. GitHub Actions secrets do not automatically populate the host's `.env`.
- Beast does not yet autonomously schedule research, modify source, or deploy code. Independent evaluation is a future integration.
