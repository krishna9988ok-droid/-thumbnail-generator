const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const PORT = Number(process.env.PORT) || 3000;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const OUTPUT_DIR = path.join(os.tmpdir(), 'thumbnail-generator');

const PRESETS = [
  { key: 'youtube', label: 'YouTube thumbnail', width: 1280, height: 720 },
  { key: 'youtube-shorts', label: 'Shorts / Reels / TikTok', width: 1080, height: 1920 },
  { key: 'instagram-portrait', label: 'Instagram portrait', width: 1080, height: 1350 },
  { key: 'instagram-square', label: 'Instagram square', width: 1080, height: 1080 },
  { key: 'x-post', label: 'X post', width: 1600, height: 900 },
  { key: 'facebook-post', label: 'Facebook post', width: 1200, height: 630 },
  { key: 'linkedin-post', label: 'LinkedIn post', width: 1200, height: 627 },
  { key: 'web-thumb', label: 'Compact web thumbnail', width: 400, height: 400 },
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/generated', express.static(OUTPUT_DIR, { maxAge: '1h', fallthrough: false }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/presets', (req, res) => {
  res.json({ presets: PRESETS });
});

app.post('/api/generate', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Choose an image first.' });
  }

  let meta;
  try {
    meta = await sharp(req.file.buffer).metadata();
  } catch {
    return res.status(415).json({ error: 'That file is not a supported image.' });
  }
  if (!meta.width || !meta.height) {
    return res.status(415).json({ error: 'That image has no readable dimensions.' });
  }

  const id = crypto.randomUUID();
  try {
    const results = await Promise.all(
      PRESETS.map(async (preset) => {
        const filename = `${id}-${preset.key}.jpg`;
        const info = await sharp(req.file.buffer)
          .rotate()
          .resize({
            width: preset.width,
            height: preset.height,
            fit: 'cover',
            position: 'attention',
          })
          .jpeg({ quality: 86, mozjpeg: true })
          .toFile(path.join(OUTPUT_DIR, filename));

        return {
          key: preset.key,
          label: preset.label,
          width: preset.width,
          height: preset.height,
          bytes: info.size,
          url: `/generated/${filename}`,
        };
      })
    );

    res.json({
      source: {
        width: meta.width,
        height: meta.height,
        format: meta.format,
        bytes: req.file.size,
      },
      results,
    });
  } catch (err) {
    console.error('Thumbnail generation failed:', err);
    res.status(500).json({ error: 'Could not generate thumbnails. Try another image.' });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Image is larger than 15 MB.' });
    }
    return res.status(400).json({ error: 'Could not read that upload.' });
  }
  if (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Thumbnail Studio listening on http://0.0.0.0:${PORT}`);
  console.log(`Generated thumbnails are written to ${OUTPUT_DIR}`);
});

process.on('SIGTERM', async () => {
  await fsp.rm(OUTPUT_DIR, { recursive: true, force: true }).catch(() => {});
  process.exit(0);
});
