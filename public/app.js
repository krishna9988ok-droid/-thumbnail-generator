const MAX_BYTES = 15 * 1024 * 1024;

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const selection = document.getElementById('selection');
const preview = document.getElementById('preview');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const removeButton = document.getElementById('remove');
const generateButton = document.getElementById('generate');
const status = document.getElementById('status');
const results = document.getElementById('results');
const resultsNote = document.getElementById('results-note');
const grid = document.getElementById('grid');

let selectedFile = null;
let previewUrl = null;
let busy = false;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}

function openPicker() {
  if (!busy) fileInput.click();
}

function clearSelection() {
  selectedFile = null;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  preview.removeAttribute('src');
  fileInput.value = '';
  selection.hidden = true;
  dropzone.hidden = false;
  generateButton.disabled = true;
}

function handleFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setStatus('Please choose an image file (JPG, PNG or WebP).', true);
    return;
  }
  if (file.size > MAX_BYTES) {
    setStatus('That image is larger than 15 MB. Pick a smaller one.', true);
    return;
  }

  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  selectedFile = file;
  preview.src = previewUrl;
  fileName.textContent = file.name;
  fileSize.textContent = `${formatBytes(file.size)} · ready to generate`;
  selection.hidden = false;
  dropzone.hidden = true;
  generateButton.disabled = false;
  results.hidden = true;
  grid.replaceChildren();
  setStatus('');
}

function renderResults(data) {
  grid.replaceChildren();

  data.results.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'thumb-card';

    const frame = document.createElement('div');
    frame.className = 'thumb-frame';
    frame.style.setProperty('--ratio', `${item.width} / ${item.height}`);

    const img = document.createElement('img');
    img.src = item.url;
    img.alt = `${item.label} preview`;
    img.loading = 'lazy';
    img.width = item.width;
    img.height = item.height;
    frame.append(img);

    const body = document.createElement('div');
    body.className = 'thumb-body';

    const label = document.createElement('p');
    label.className = 'thumb-label';
    label.textContent = item.label;

    const meta = document.createElement('p');
    meta.className = 'thumb-meta';
    meta.textContent = `${item.width} × ${item.height} · ${formatBytes(item.bytes)}`;

    const link = document.createElement('a');
    link.className = 'download-button';
    link.href = item.url;
    link.download = `${item.key}.jpg`;
    link.textContent = 'Download';

    body.append(label, meta, link);
    card.append(frame, body);
    grid.append(card);
  });

  const source = data.source;
  resultsNote.textContent = `From ${source.width} × ${source.height} ${source.format.toUpperCase()} · ${data.results.length} sizes`;
  results.hidden = false;
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function generate() {
  if (!selectedFile || busy) return;

  busy = true;
  generateButton.disabled = true;
  generateButton.textContent = 'Generating…';
  setStatus('Resizing your image for every platform…');

  const body = new FormData();
  body.append('image', selectedFile, selectedFile.name);

  try {
    const response = await fetch('/api/generate', { method: 'POST', body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Could not generate thumbnails.');
    }
    renderResults(data);
    setStatus(`${data.results.length} thumbnails ready — download the ones you need.`);
  } catch (error) {
    setStatus(error.message || 'Could not generate thumbnails. Try again.', true);
  } finally {
    busy = false;
    generateButton.disabled = false;
    generateButton.textContent = 'Generate thumbnails';
  }
}

dropzone.addEventListener('click', openPicker);
dropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openPicker();
  }
});

fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

['dragenter', 'dragover'].forEach((type) => {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragging');
  });
});

['dragleave', 'drop'].forEach((type) => {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
  });
});

dropzone.addEventListener('drop', (event) => {
  const file = event.dataTransfer && event.dataTransfer.files[0];
  if (file) handleFile(file);
});

removeButton.addEventListener('click', () => {
  clearSelection();
  openPicker();
});

generateButton.addEventListener('click', generate);

window.addEventListener('beforeunload', () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
});
