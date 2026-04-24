import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";

import { createServer } from "../api/server.js";
import { getCuratorRoom } from "../registry/curator.js";
import { formatRecommendationResponse, searchCards } from "../registry/recommend.js";
import {
  addCard,
  loadRegistry,
  registryPathFor,
  seedRegistry,
} from "../registry/store.js";
import { writeSkill } from "../registry/skill.js";

function normalizeWorkDir(workDir = process.cwd()) {
  return isAbsolute(workDir) ? workDir : join(process.cwd(), workDir);
}

function makePrinter(print) {
  return typeof print === "function" ? print : () => {};
}

function flagValue(args, name) {
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function hasFlag(args, name) {
  return args.includes(name);
}

function positionalArgs(args) {
  const values = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg.startsWith("--")) {
      index += 1;
      continue;
    }

    values.push(arg);
  }

  return values;
}

function sessionPathFor(workDir) {
  return join(workDir, ".agentcart", "session.json");
}

function makeDeviceCode() {
  return `AC-${randomBytes(3).toString("hex").toUpperCase()}-${randomBytes(2)
    .toString("hex")
    .toUpperCase()}`;
}

function helpText() {
  return `AgentCart CLI

Usage:
  agentcart help
  agentcart seed
  agentcart serve [--port 8787]
  agentcart search "query" [--budget 100000]
  agentcart submit --title <title> --url <url> --curator <handle> --category <category> --best-for <csv> --not-for <csv> --note <text> [--disclosure <text>] [--price <amount>] [--currency <code>] [--keywords <csv>] [--display-name <name>]
  agentcart curator:room <handle>
  agentcart install-skill --target generic|codex|claude|openclaw [--output <path>]
  agentcart open <slug-or-id> [--dry-run]
  agentcart login [--email creator@example.com]
  agentcart whoami
  agentcart logout

Local development:
  node cli.js seed
  node cli.js search "10만원 이하 leather wallet" --budget 100000
  node cli.js serve --port 8787
  node cli.js login --email creator@example.com
`;
}

async function readSession(sessionPath) {
  try {
    return JSON.parse(await readFile(sessionPath, "utf8"));
  } catch {
    return null;
  }
}

async function runLogin(args, { workDir, stdout }) {
  const email = flagValue(args, "--email") ?? null;
  const deviceCode = makeDeviceCode();
  const createdAt = new Date().toISOString();
  const sessionPath = sessionPathFor(workDir);
  const session = {
    version: 1,
    accountId: `acct_${randomUUID().replaceAll("-", "").slice(0, 16)}`,
    email,
    loginMethod: "cli",
    deviceCode,
    loginUrl: `https://agentcart.dev/cli-login?code=${deviceCode}`,
    createdAt,
  };

  await mkdir(dirname(sessionPath), { recursive: true });
  await writeFile(sessionPath, `${JSON.stringify(session, null, 2)}\n`, "utf8");

  stdout("AgentCart CLI login created");
  stdout(`Session: ${sessionPath}`);
  stdout(`Device code: ${deviceCode}`);
  stdout(`Login URL: ${session.loginUrl}`);
  stdout(email ? `Signed in as: ${email}` : "Signed in as: local CLI user");

  return 0;
}

async function runWhoami({ workDir, stdout }) {
  const session = await readSession(sessionPathFor(workDir));

  if (!session) {
    stdout("Not logged in. Run: agentcart login");
    return 1;
  }

  stdout("AgentCart CLI session");
  stdout(`Account: ${session.email ?? "local CLI user"}`);
  stdout(`Method: ${session.loginMethod}`);
  stdout(`Created: ${session.createdAt}`);

  return 0;
}

async function runLogout({ workDir, stdout }) {
  await rm(sessionPathFor(workDir), { force: true });
  stdout("AgentCart CLI session removed");

  return 0;
}

async function runSeed({ workDir, stdout }) {
  const registry = await seedRegistry(registryPathFor(workDir));

  stdout(`Seeded ${registry.cards.length} AgentCart cards`);

  return 0;
}

async function runSearch(args, { workDir, stdout }) {
  const query = positionalArgs(args).join(" ");
  const registry = await loadRegistry(registryPathFor(workDir));
  const budget = flagValue(args, "--budget");
  const context = {};

  if (budget !== undefined) {
    context.budgetAmount = Number(budget);
  }

  const cards = searchCards(query, registry.cards, context);
  stdout(formatRecommendationResponse(cards, query));

  return 0;
}

async function runSubmit(args, { workDir, stdout, stderr }) {
  const requiredFlags = [
    "--title",
    "--url",
    "--curator",
    "--category",
    "--best-for",
    "--not-for",
    "--note",
  ];
  const missingFlags = requiredFlags.filter((flag) => !flagValue(args, flag));

  if (missingFlags.length > 0) {
    stderr(`Missing required flags: ${missingFlags.join(", ")}`);
    return 1;
  }

  const card = await addCard(registryPathFor(workDir), {
    title: flagValue(args, "--title"),
    originalUrl: flagValue(args, "--url"),
    curator: {
      handle: flagValue(args, "--curator"),
      displayName: flagValue(args, "--display-name"),
    },
    category: flagValue(args, "--category"),
    bestFor: flagValue(args, "--best-for"),
    notFor: flagValue(args, "--not-for"),
    curationNote: flagValue(args, "--note"),
    disclosure: flagValue(args, "--disclosure"),
    priceAmount:
      flagValue(args, "--price") === undefined ? undefined : Number(flagValue(args, "--price")),
    currency: flagValue(args, "--currency"),
    searchKeywords: flagValue(args, "--keywords"),
  });

  stdout(`Registered card: ${card.title} (${card.slug})`);

  return 0;
}

async function runCuratorRoom(args, { workDir, stdout, stderr }) {
  const handle = positionalArgs(args)[0];
  const registry = await loadRegistry(registryPathFor(workDir));
  const room = getCuratorRoom(registry, handle);

  if (!room) {
    stderr(`Curator room not found: ${handle ?? ""}`.trim());
    return 1;
  }

  stdout(`@${room.handle}`);
  stdout(room.displayName);
  stdout(`큐레이터 온도: ${room.trustTemperature}`);
  stdout("");

  for (const card of room.cards) {
    const price = card.priceSnapshot ? ` - ${card.priceSnapshot}` : "";
    stdout(`- ${card.title} (${card.platform})${price}`);
  }

  return 0;
}

async function runInstallSkill(args, { workDir, stdout }) {
  const target = flagValue(args, "--target") ?? "generic";
  const output = flagValue(args, "--output");
  const outputPath = await writeSkill({ target, output, workDir });

  stdout(`Installed AgentCart skill: ${outputPath}`);

  return 0;
}

async function runOpen(args, { workDir, stdout, stderr }) {
  const slugOrId = positionalArgs(args)[0];
  const registry = await loadRegistry(registryPathFor(workDir));
  const card = (Array.isArray(registry.cards) ? registry.cards : []).find(
    (candidate) => candidate.slug === slugOrId || candidate.id === slugOrId
  );

  if (!card) {
    stderr(`Card not found: ${slugOrId ?? ""}`.trim());
    return 1;
  }

  if (hasFlag(args, "--dry-run")) {
    stdout(`Dry run: ${card.originalUrl}`);
    return 0;
  }

  stdout("AgentCart will not auto-open monetized purchase links without approval.");
  stdout(`Card: ${card.title}`);
  stdout(`URL: ${card.originalUrl}`);
  stdout(`Open after explicit approval: ${card.originalUrl}`);

  return 0;
}

async function runServe(args, { workDir, stdout }) {
  const port = Number(flagValue(args, "--port") ?? process.env.PORT ?? 8787);
  const host = flagValue(args, "--host") ?? "127.0.0.1";
  const server = createServer({ registryPath: registryPathFor(workDir) });

  await new Promise((resolve) => server.listen(port, host, resolve));
  stdout(`AgentCart registry server listening at http://${host}:${port}`);

  await new Promise(() => {});
}

export async function run(args = [], options = {}) {
  const stdout = makePrinter(options.stdout ?? console.log);
  const stderr = makePrinter(options.stderr ?? console.error);
  const workDir = normalizeWorkDir(options.workDir);
  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    if (!command || command === "help" || hasFlag(args, "--help") || hasFlag(args, "-h")) {
      stdout(helpText());
      return 0;
    }

    if (command === "login") {
      return await runLogin(commandArgs, { workDir, stdout });
    }

    if (command === "whoami") {
      return await runWhoami({ workDir, stdout });
    }

    if (command === "logout") {
      return await runLogout({ workDir, stdout });
    }

    if (command === "seed") {
      return await runSeed({ workDir, stdout });
    }

    if (command === "search") {
      return await runSearch(commandArgs, { workDir, stdout });
    }

    if (command === "submit") {
      return await runSubmit(commandArgs, { workDir, stdout, stderr });
    }

    if (command === "curator:room") {
      return await runCuratorRoom(commandArgs, { workDir, stdout, stderr });
    }

    if (command === "install-skill") {
      return await runInstallSkill(commandArgs, { workDir, stdout });
    }

    if (command === "open") {
      return await runOpen(commandArgs, { workDir, stdout, stderr });
    }

    if (command === "serve") {
      return await runServe(commandArgs, { workDir, stdout });
    }

    stderr(`Unknown command: ${command}`);
    stdout(helpText());
    return 1;
  } catch (error) {
    stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
