const REPORT_INTERVAL_MS = 30 * 1000;
const STOP_GRACE_MS = 60 * 1000;

let lastTitle = null;
let lastReport = 0;
let stopTimer = null;

function detectService() {
  const host = location.hostname;
  if (host.includes('primevideo') || location.pathname.includes('/gp/video')) return 'Prime Video';
  if (host.includes('netflix')) return 'Netflix';
  if (host.includes('disneyplus')) return 'Disney+';
  return null;
}

function findVideo() {
  return document.querySelector('video');
}

function firstText(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }
  }
  return null;
}

function stripSuffix(text, suffixRegex) {
  return text.replace(suffixRegex, '').trim();
}

function getTitlePrime() {
  const title = firstText([
    '[data-automation-id="title"]',
    'h1[data-automation-id="title"]',
    'h1.atvwebplayersdk-title-text',
    '.atvwebplayersdk-title-text',
    '.webPlayerUIContainer h1',
  ]) || stripSuffix(document.title, /\s*[-|]\s*Prime Video.*$/i);

  const sub = firstText([
    '.atvwebplayersdk-subtitle-text',
    '[data-automation-id="subtitle"]',
    '.webPlayerUIContainer h2',
  ]);

  if (!title) return null;
  return sub ? `${title} — ${sub}` : title;
}

function getTitleNetflix() {
  const title = firstText([
    '[data-uia="video-title"] h4',
    '[data-uia="video-title"]',
    '.video-title h4',
    '.video-title',
    '.PlayerControlsNeue__player-title',
  ]) || stripSuffix(document.title, /\s*[-|]\s*Netflix.*$/i);

  const sub = firstText([
    '[data-uia="video-title"] span',
    '.video-title span',
  ]);

  if (!title) return null;
  return sub && sub !== title ? `${title} — ${sub}` : title;
}

function getTitleDisney() {
  const title = firstText([
    '.title-field',
    '[data-testid="title-field"]',
    '.hero-title',
    '.btm-media-overlays-container .title-field',
  ]) || stripSuffix(document.title, /\s*[-|]\s*Disney\+.*$/i);

  const sub = firstText([
    '.subtitle-field',
    '[data-testid="subtitle-field"]',
    '.btm-media-overlays-container .subtitle-field',
  ]);

  if (!title) return null;
  return sub ? `${title} — ${sub}` : title;
}

function getTitleForService(service) {
  switch (service) {
    case 'Prime Video': return getTitlePrime();
    case 'Netflix': return getTitleNetflix();
    case 'Disney+': return getTitleDisney();
    default: return null;
  }
}

function report(service, title) {
  lastReport = Date.now();
  chrome.runtime.sendMessage({
    type: 'update',
    payload: { title, service, url: location.href },
  });
}

function scheduleStop() {
  clearTimeout(stopTimer);
  stopTimer = setTimeout(() => {
    chrome.runtime.sendMessage({ type: 'clear' });
    lastTitle = null;
  }, STOP_GRACE_MS);
}

function cancelStop() {
  clearTimeout(stopTimer);
  stopTimer = null;
}

function tick() {
  const service = detectService();
  if (!service) return;

  const video = findVideo();
  if (!video) return;

  if (!video.paused && !video.ended && video.currentTime > 0) {
    const title = getTitleForService(service);
    if (!title) return;
    cancelStop();
    if (title !== lastTitle || Date.now() - lastReport > REPORT_INTERVAL_MS) {
      lastTitle = title;
      report(service, title);
    }
  } else {
    scheduleStop();
  }
}

setInterval(tick, 5000);

function hookVideo() {
  const video = findVideo();
  if (!video || video.__tracked) return;
  video.__tracked = true;
  video.addEventListener('play', tick);
  video.addEventListener('pause', scheduleStop);
  video.addEventListener('ended', scheduleStop);
}

setInterval(hookVideo, 2000);
hookVideo();

window.addEventListener('pagehide', () => {
  chrome.runtime.sendMessage({ type: 'clear' });
});
