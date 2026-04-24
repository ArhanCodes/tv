async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiUrl', 'authToken'], (cfg) => resolve(cfg || {}));
  });
}

async function send(path, body) {
  const { apiUrl, authToken } = await getConfig();
  if (!apiUrl || !authToken) {
    console.warn('[streaming-tracker] API not configured. Open the extension options.');
    return;
  }
  try {
    await fetch(apiUrl.replace(/\/$/, '') + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    console.warn('[streaming-tracker] failed to send', e);
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'update' && msg.payload) {
    send('/update', msg.payload);
  } else if (msg?.type === 'clear') {
    send('/clear');
  }
});
