import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG = path.join(__dirname, '..', 'network.json');

export default async function network(app) {
  app.get('/', async (req, reply) => {
    let cfg = {};
    try { cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch {}
    const lanIps = lanAddresses();
    const wifi = {
      ssid: process.env.WIFI_SSID || '',
      password: process.env.WIFI_PASSWORD || '',
      security: process.env.WIFI_SECURITY || 'WPA',
    };
    return reply.view('network', {
      title: 'Network',
      cfg, lanIps, wifi,
      hostname: os.hostname(),
    });
  });
}

function lanAddresses() {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) out.push({ iface: name, ip: a.address });
    }
  }
  return out;
}
