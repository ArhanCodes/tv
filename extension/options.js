const apiUrl = document.getElementById('apiUrl');
const authToken = document.getElementById('authToken');
const save = document.getElementById('save');
const status = document.getElementById('status');

chrome.storage.sync.get(['apiUrl', 'authToken'], (cfg) => {
  if (cfg.apiUrl) apiUrl.value = cfg.apiUrl;
  if (cfg.authToken) authToken.value = cfg.authToken;
});

save.addEventListener('click', () => {
  chrome.storage.sync.set(
    { apiUrl: apiUrl.value.trim(), authToken: authToken.value.trim() },
    () => {
      status.textContent = 'Saved.';
      setTimeout(() => (status.textContent = ''), 2000);
    }
  );
});
