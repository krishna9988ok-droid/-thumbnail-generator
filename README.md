# Thumbnail Studio

Upload one image and download ready-to-post thumbnails for every major platform:
YouTube, Shorts/Reels/TikTok, Instagram (portrait and square), X, Facebook, LinkedIn and
a compact web thumbnail.

Built with Node.js, Express and [sharp](https://sharp.pixelplumbing.com/) for resizing.
No database and no external services are required.

## Run locally with Docker

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

The app is served on <http://localhost:3000>. The container installs dependencies on
startup and runs `nodemon`, so edits under `public/` appear instantly and `server.js`
restarts automatically.

## Run without Docker

```bash
npm install
npm start        # or: npm run dev
```

## How it works

- `GET /api/presets` — the supported output sizes.
- `POST /api/generate` — multipart upload in the `image` field (max 15 MB); returns the
  generated thumbnail URLs along with the source image dimensions.
- `GET /api/health` — health probe used by the compose healthcheck.
- Uploaded files are kept in memory and generated JPEGs are written to the container's
  temporary directory (`/tmp/thumbnail-generator`), served under `/generated/`.
