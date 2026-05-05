# AgentCart Landing

Single-page landing site for AgentCart's agent-native commerce context layer.

The landing page explains the local registry MVP, the agent skill install flow, and the product boundary for brands, creators, and merchants who want AI agents to read shopping context correctly.

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

## Registry Demo

```sh
npm run agentcart -- seed
npm run agentcart -- install-skill --target codex
npm run serve:registry
```

The registry server defaults to `http://127.0.0.1:8787`, and the installed skill uses that API unless a different registry URL is configured. `npm run serve:registry` is long-running, so keep it open in a separate terminal while testing the API or agent skill.
