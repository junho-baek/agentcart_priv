# AgentCart Landing

Futuristic single-page landing site for AgentCart.

## Run

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

## Build

```sh
npm run build
```

The production output is written to `web/dist/`.

## CLI Login

```sh
npm run agentcart -- login --email creator@example.com
npm run agentcart -- whoami
npm run agentcart -- logout
```

The local MVP session is stored under `.agentcart/session.json`.
