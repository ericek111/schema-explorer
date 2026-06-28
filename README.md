# Schema Explorer

Schema Explorer is a TypeScript web app for inspecting Schema.org JSON-LD on arbitrary web pages. It defaults to `/schema/`, but the mount path is configurable for deployments such as `/explorer/` or `/`.

The app performs Schema.org vocabulary checks only. It is not a Google Rich Results eligibility tester.

For the detailed implementation map and feature-by-feature recreation notes, see [PROJECT_SPEC.md](./PROJECT_SPEC.md).

## Stack

- React, Vite, and TypeScript for the browser app.
- Node, Hono, and TypeScript for the server.
- Vitest for tests.
- A pinned local Schema.org vocabulary index at `src/data/schema-vocab.json`.

## Runtime Shape

Production is one Node process:

1. `GET /schema/` serves the built frontend.
2. `GET /schema/*` falls back to the frontend entrypoint.
3. `GET /schema/api/fetch?url=...` fetches remote HTML for the browser app.

The server owns the fetch proxy. The browser app always calls the server app's configured `<base-path>/api/fetch`; there is no external CORS proxy mode.

## Commands

```sh
npm test
npm run build
npm start
```

After `npm start`, the app is served at:

```text
http://localhost:8787/schema/
```

## Base Path

Use `SCHEMA_BASE_PATH` at build time and runtime when deploying anywhere other than `/schema`.

Examples:

```sh
SCHEMA_BASE_PATH=/explorer npm run build
SCHEMA_BASE_PATH=/explorer npm start
```

For root deployment:

```sh
SCHEMA_BASE_PATH=/ npm run build
SCHEMA_BASE_PATH=/ npm start
```

The value must start with `/`. Trailing slashes are fine. If you build with `/explorer`, also run the server with `/explorer`; the client fetch path is baked into the Vite build.

## TCP Configuration

Environment variables:

- `PORT`: TCP port, default `8787`.
- `HOST`: optional bind host.

Example:

```sh
PORT=9000 HOST=127.0.0.1 npm start
```

## Unix Socket Configuration

The server can listen on a Unix domain socket instead of TCP.

Environment variables:

- `SCHEMA_SOCKET`: socket path, for example `/run/schema-explorer/schema.sock`.
- `SCHEMA_SOCKET_MODE`: optional octal socket mode, for example `666`.
- `SOCKET_PATH` and `SOCKET_MODE` are accepted aliases.

When `SCHEMA_SOCKET` or `SOCKET_PATH` is set, socket mode wins over TCP mode.

Example:

```sh
SCHEMA_SOCKET=/run/schema-explorer/schema.sock SCHEMA_SOCKET_MODE=666 npm start
```

## Nginx

Proxy the configured base path through unchanged. The example below uses the default `/schema`; if `SCHEMA_BASE_PATH=/explorer`, change the two `location` blocks to `/explorer` and `/explorer/`.

```nginx
upstream schema_explorer {
    server unix:/run/schema-explorer/schema.sock;
}

server {
    listen 80;
    server_name example.com;

    location = /schema {
        return 301 /schema/;
    }

    location /schema/ {
        proxy_pass http://schema_explorer;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Systemd

Example unit at `/etc/systemd/system/schema-explorer.service`:

```ini
[Unit]
Description=Schema Explorer
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=schema-explorer
WorkingDirectory=/opt/schema-explorer
Environment=NODE_ENV=production
Environment=SCHEMA_BASE_PATH=/schema
Environment=SCHEMA_SOCKET=/run/schema-explorer/schema.sock
Environment=SCHEMA_SOCKET_MODE=666
RuntimeDirectory=schema-explorer
RuntimeDirectoryMode=0755
ExecStart=/usr/bin/node /opt/schema-explorer/dist-server/index.js
Restart=on-failure
RestartSec=3

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/run/schema-explorer

[Install]
WantedBy=multi-user.target
```

Install and start:

```sh
sudo useradd --system --user-group --home /opt/schema-explorer --shell /usr/sbin/nologin schema-explorer
sudo mkdir -p /opt/schema-explorer
sudo chown schema-explorer:schema-explorer /opt/schema-explorer

npm ci
npm run build

sudo rsync -a --delete dist dist-server package.json package-lock.json node_modules /opt/schema-explorer/
sudo systemctl daemon-reload
sudo systemctl enable --now schema-explorer
sudo systemctl status schema-explorer
```

Check the socket:

```sh
curl -I --unix-socket /run/schema-explorer/schema.sock http://localhost/schema/
```

Then validate and reload nginx:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

## Troubleshooting

### WorkingDirectory Permission Denied

If the service fails with:

```text
Changing to the requested working directory failed: Permission denied
```

systemd could not `chdir` into `WorkingDirectory` before starting Node. This can happen even when `su - schema-explorer` or `su - node` works, because the service unit applies extra sandboxing.

Check:

```sh
sudo -u schema-explorer test -x /opt/schema-explorer
sudo -u schema-explorer test -r /opt/schema-explorer/dist-server/index.js
namei -l /opt/schema-explorer
```

Every parent directory must have execute permission for the service user. For the documented `/opt/schema-explorer` layout:

```sh
sudo chown -R schema-explorer:schema-explorer /opt/schema-explorer
sudo chmod 755 /opt /opt/schema-explorer
```

If the app is under `/home/...`, `ProtectHome=true` can block it. Prefer `/opt/schema-explorer`. If you intentionally deploy from a home directory, relax that hardening line:

```ini
ProtectHome=false
```

Then reload and restart:

```sh
sudo systemctl daemon-reload
sudo systemctl restart schema-explorer
sudo journalctl -u schema-explorer -n 100 --no-pager
```

### Server Still Listens On localhost:8787

If the journal says:

```text
Schema Explorer listening on http://localhost:8787/schema/
```

then the running process did not receive `SCHEMA_SOCKET`, or systemd is starting an older `dist-server/index.js`.

Check:

```sh
sudo systemctl show schema-explorer -p Environment -p ExecStart -p WorkingDirectory
```

You should see:

```text
Environment=NODE_ENV=production SCHEMA_SOCKET=/run/schema-explorer/schema.sock SCHEMA_SOCKET_MODE=666
```

If the environment is correct, rebuild and recopy:

```sh
npm run build
sudo rsync -a --delete dist dist-server package.json package-lock.json node_modules /opt/schema-explorer/
sudo systemctl restart schema-explorer
sudo journalctl -u schema-explorer -n 50 --no-pager
```
