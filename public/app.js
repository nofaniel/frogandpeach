// Render Wi-Fi QR if the element is present and qrcode lib is loaded.
function renderWifiQr() {
  const el = document.getElementById('wifi-qr');
  if (!el || typeof QRCode === 'undefined') return;
  const ssid = el.dataset.ssid || '';
  const pass = el.dataset.pass || '';
  const sec = el.dataset.sec || 'WPA';
  if (!ssid) return;
  // WIFI:T:WPA;S:mynetwork;P:mypass;H:false;;
  const esc = s => s.replace(/([\\;,:"])/g, '\\$1');
  const payload = `WIFI:T:${sec};S:${esc(ssid)};P:${esc(pass)};;`;
  el.innerHTML = '';
  new QRCode(el, { text: payload, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M });
}

document.addEventListener('DOMContentLoaded', renderWifiQr);

// PWA registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/static/sw.js').catch(() => {});
  });
}
