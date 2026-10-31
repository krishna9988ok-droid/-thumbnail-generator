# Repository notes

## What this app is
A single Node/Express service that serves a static frontend from `public/` and resizes
uploaded images with `sharp`. No database, no backend framework beyond Express, no build
step — `public/` is served as-is.

## Running it here
- Use `docker-compose.base44.yml`. It runs `node:22-slim` with the repo bind-mounted at
  `/app`, installs npm dependencies on container start, and runs `nodemon` watching only
  `server.js`.
- `node_modules` lives in an anonymous volume, so it is never written into the repo.
- First boot is slow (npm install + sharp binary); the compose healthcheck has a 60s
  start period and probes `/api/health`.

## Gotchas
- `sharp` is native. It needs a glibc base image — `node:22-slim` works, plain Alpine can
  fail to resolve its prebuilt binary.
- Generated thumbnails are written to `os.tmpdir()/thumbnail-generator`, not the repo, and
  are removed on graceful shutdown. Do not expect them to persist across restarts.
- Uploads are held in memory (multer memory storage); the 15 MB limit is enforced both by
  multer and in the frontend.

## Verify a change
- `curl -s localhost:3000/api/health` → `{"status":"ok"}`
- Full flow: upload an image on `/`, press "Generate thumbnails", confirm the 8 cards
  render and a `/generated/*.jpg` download link returns an image.
- `curl -s -F "image=@some.jpg" localhost:3000/api/generate` exercises the API directly.
