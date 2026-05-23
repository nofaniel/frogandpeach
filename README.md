# Flat Hub

Locally hosted home dashboard for the flat. Weather + tides for Newquay, shopping lists, notes, custom "cute pages", and a network info panel. Phone-friendly, LAN-only, free APIs.

## Run

```
npm install
copy .env.example .env   :: edit if you want
npm start
```

Then open `http://localhost:8080/` on this PC, or `http://<this-PC-LAN-IP>:8080/` on your phone (same Wi-Fi).

## Backup

The whole app's state lives in `hub.db`. Copy it anywhere to back up. `scripts/backup.ps1` writes a dated copy to `./backups/`.

## Auto-start on boot (optional)

Install [NSSM](https://nssm.cc/), then:

```
nssm install FlatHub "C:\Program Files\nodejs\node.exe" "N:\code\Frog&Peach-Claudisus\server.js"
nssm set FlatHub AppDirectory "N:\code\Frog&Peach-Claudisus"
nssm start FlatHub
```
