// Downloads an extra content pack after install, while the app is open, and
// keeps it on the device in IndexedDB so it works offline afterwards.
// Demo-only switches for screenshots (see the hidden controls below): "slow"
// throttles the download and "fail" drops the connection halfway through.

const CACHE = 'picture-guides-v1';
// Royalty-free photos from Unsplash; sources are listed in photo-credits.tsv.
const GUIDES = [
  ['tomatoes', 'Tomatoes'],
  ['beans', 'Beans'],
  ['maize', 'Maize'],
  ['cabbage', 'Cabbage'],
  ['onions', 'Onions'],
  ['seedlings', 'Seedlings'],
  ['soil', 'Healthy soil'],
  ['compost', 'Composting'],
  ['pests', 'Pest control'],
  ['mulching', 'Mulching'],
  ['harvest', 'Harvesting'],
];
const FILES = GUIDES.map(([name]) => `pack/${name}.jpg`);
const TITLES = Object.fromEntries(GUIDES.map(([name, title]) => [`pack/${name}.jpg`, title]));

const FLAGS_KEY = 'demo-flags';
const readFlags = () => {
  try {
    return JSON.parse(localStorage.getItem(FLAGS_KEY)) || {};
  } catch {
    return {};
  }
};
const writeFlags = (flags) => localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));

const flags = readFlags();
const slow = !!flags.slow;
const failHalfway = !!flags.fail;

const $ = (id) => document.getElementById(id);
const states = ['idle', 'loading', 'ready', 'failed'];

function show(state, badgeText, badgeClass = '') {
  states.forEach((s) => ($(`state-${s}`).hidden = s !== state));
  $('badge').textContent = badgeText;
  $('badge').className = `badge ${badgeClass}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Files are kept in IndexedDB rather than the Cache Storage API: on iOS a
// Capacitor app is served from capacitor://localhost, and Cache Storage only
// accepts http(s) requests, so cache.put() fails there.
function openStore() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CACHE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(mode, run) {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', mode);
    const req = run(tx.objectStore('files'));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
  });
}

const getFile = (file) => store('readonly', (s) => s.get(file));
const putFile = (file, blob) => store('readwrite', (s) => s.put(blob, file));
const clearFiles = () => store('readwrite', (s) => s.clear());

async function cachedCount() {
  const hits = await Promise.all(FILES.map(getFile));
  return hits.filter(Boolean).length;
}

async function renderReady() {
  const grid = $('thumbs');
  grid.innerHTML = '';
  for (const file of FILES.slice(0, 6)) {
    const blob = await getFile(file);
    const img = document.createElement('img');
    img.alt = TITLES[file];
    img.src = URL.createObjectURL(blob);
    const caption = document.createElement('span');
    caption.textContent = TITLES[file];
    const cell = document.createElement('div');
    cell.className = 'thumb';
    cell.append(img, caption);
    grid.appendChild(cell);
  }
  $('ready-text').textContent = `${FILES.length} guides saved on this phone. Works offline.`;
  show('ready', 'Saved offline', 'ok');
}

async function download() {
  show('loading', 'Downloading', 'busy');
  let done = 0;

  for (const file of FILES) {
    // Skip what is already saved, so a retry resumes instead of restarting.
    if (await getFile(file)) {
      done++;
      continue;
    }
    if (failHalfway && done === Math.floor(FILES.length / 2)) {
      $('failed-text').textContent = `${done} of ${FILES.length} guides saved. The rest will continue from here.`;
      show('failed', 'Paused', 'warn');
      return;
    }
    const res = await fetch(file, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${file}: ${res.status}`);
    await putFile(file, await res.blob());
    done++;
    const pct = Math.round((done / FILES.length) * 100);
    $('fill').style.width = `${pct}%`;
    $('progress-text').textContent = `Downloading ${done} of ${FILES.length} (${pct}%)`;
    if (slow) await sleep(900);
  }
  await renderReady();
}

$('download').addEventListener('click', () => download().catch(onError));
$('retry').addEventListener('click', () => {
  writeFlags({ ...readFlags(), fail: false });
  location.reload();
});
// Hidden demo controls, so screenshots show only the app: tap the badge to
// clear the saved guides, the app name to toggle "slow", the greeting for "fail".
$('badge').addEventListener('click', async () => {
  await clearFiles();
  location.reload();
});
const toggle = (name) => {
  writeFlags({ ...readFlags(), [name]: !flags[name] });
  location.reload();
};
document.querySelector('.eyebrow').addEventListener('click', () => toggle('slow'));
document.querySelector('h1').addEventListener('click', () => toggle('fail'));

function onError(err) {
  console.error(err);
  $('failed-text').textContent = 'Something went wrong while saving the guides.';
  show('failed', 'Paused', 'warn');
}

(async () => {
  const count = await cachedCount();
  if (count === FILES.length) return renderReady();
  if (count > 0 && !failHalfway) {
    $('pack-size').textContent = `${count} of ${FILES.length} guides saved. Continue downloading the rest.`;
    $('download').textContent = 'Continue download';
  }
  show('idle', count ? `${count}/${FILES.length} saved` : 'Not downloaded');
})();
