
> voiceguard@0.1.0 dev
> concurrently "npm run dev:web" "npm run dev:api"

[0] 
[0] > voiceguard@0.1.0 dev:web
[0] > cd packages/web && npm run dev
[0] 
[1] 
[1] > voiceguard@0.1.0 dev:api
[1] > cd packages/api && python -m uvicorn src.main:app --reload
[1] 
[1] INFO:     Will watch for changes in these directories: ['G:\\Projects\\2025\\VoiceID\\voiceguard\\packages\\api']
[1] INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
[1] INFO:     Started reloader process [17060] using StatReload
[0] 
[0] > voiceguard-web@0.1.0 dev
[0] > next dev
[0] 
[1] INFO:     Started server process [37428]
[1] INFO:     Waiting for application startup.
[1] INFO:     Application startup complete.
[0]   ▲ Next.js 14.2.30
[0]   - Local:        http://localhost:3000
[0] 
[0]  ✓ Starting...
[0]  ✓ Ready in 1840ms
[0]  ✓ Compiled /_error in 401ms (253 modules)
[0]  GET / 404 in 139ms
[0]  ⚠ Fast Refresh had to perform a full reload. Read more: https://nextjs.org/docs/messages/fast-refresh-reload
[0]  GET /_next/static/webpack/b2ef53c12cfb2506.webpack.hot-update.json 404 in 466ms
[0]  GET / 404 in 5ms
Terminate batch job (Y/N)? [0] Terminate batch job (Y/N)? Terminate batch job (Y/N)? INFO:     Shutting down
[0] [?25h
[1] INFO:     Waiting for application shutdown.
[1] INFO:     Application shutdown complete.
[1] INFO:     Finished server process [37428]
[1] INFO:     Stopping reloader process [17060]
[1] npm run dev:api exited with code 1
[0] npm run dev:web exited with code 1

