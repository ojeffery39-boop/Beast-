# Independent Beast sandbox

This is a **self-hostable runtime** independent of Floot and app builders. It does **not** create a cloud VM or an always-on deployment.

## Requirements
A computer or server running Docker Compose, internet access for Gemini, and a Gemini API key. The current chat server is local-development only and **has no authentication**. Do not expose port 3000 publicly.

## Run
1. Copy `.env.example` to `.env` on your own machine and enter your API key. Never put the key in GitHub source.
2. Run `docker compose up --build -d`.
3. Open `http://127.0.0.1:3000` on that machine.
4. Run `docker compose logs --tail=50 beast` for diagnostics.
5. Run `docker compose down` to stop it. Add `-v` only if you explicitly want to delete its Docker volume.

## Boundaries and limitations
- Container is non-root, has a read-only root filesystem, no added Linux capabilities, and local-only published port.
- The container **has network egress** to call Gemini. This is not a fully network-isolated execution sandbox.
- The Docker volume `beast-data` exists for future persistent storage. The current chat implementation does **not** persist conversations or memory to it.
- The server binds to the container interface using HOST=0.0.0.0, while Compose publishes its port only on the host loopback address. This does not provide authentication.
- The current chat is a single-user prototype with no authentication or rate limiting; do not put it on a public host.
- Gemini usage may be subject to free-tier limits. GitHub Actions secrets do not automatically populate the host's `.env`.
- Beast does not yet autonomously schedule research, modify source, or deploy code. Independent evaluation is a future integration.
