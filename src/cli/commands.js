import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";

import { createServer } from "../api/server.js";
import { getCuratorPersona, getCuratorRoom } from "../registry/curator.js";
import {
  buildAgentProductContext,
  buildRecommenderPersona,
  validateProtocolObject,
} from "../registry/protocol.js";
import {
  FREE_BETA_LIMITS,
  entriesFromRegistrationDraft,
  normalizeAccountEmail,
  personasFromRegistrationDraft,
  validateRegistrationDraft,
} from "../registry/registration.js";
import { formatRecommendationResponse, searchCards } from "../registry/recommend.js";
import {
  addCard,
  addCuratorPersona,
  countAccountCards,
  loadRegistry,
  registryPathFor,
  seedRegistry,
  upsertAccount,
} from "../registry/store.js";
import { writeSkill } from "../registry/skill.js";

const VALUE_FLAGS = new Set([
  "--best-for",
  "--budget",
  "--category",
  "--currency",
  "--curator",
  "--disclosure",
  "--display-name",
  "--email",
  "--file",
  "--host",
  "--keywords",
  "--not-for",
  "--note",
  "--output",
  "--port",
  "--price",
  "--target",
  "--title",
  "--url",
]);

function normalizeWorkDir(workDir = process.cwd()) {
  return isAbsolute(workDir) ? workDir : join(process.cwd(), workDir);
}

function makePrinter(print) {
  return typeof print === "function" ? print : () => {};
}

function flagValue(args, name) {
  const equalsPrefix = `${name}=`;
  const equalsArg = args.find((arg) => arg.startsWith(equalsPrefix));

  if (equalsArg) {
    return equalsArg.slice(equalsPrefix.length);
  }

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
      if (VALUE_FLAGS.has(arg)) {
        index += 1;
      }

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
  agentcart register:draft <file>
  agentcart curator:room <handle>
  agentcart protocol:context <slug-or-id>
  agentcart protocol:persona <handle>
  agentcart protocol:validate <file>
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
  stdout(formatRecommendationResponse(cards, query, {
    curatorPersonas: registry.curatorPersonas,
  }));

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

function cardInputFromCurationEntry(entry) {
  return {
    title: entry.title,
    originalUrl: entry.originalUrl ?? entry.productUrl,
    curator: {
      handle: entry.curator?.handle ?? entry.curatorHandle,
      displayName: entry.curator?.displayName ?? entry.curatorDisplayName,
    },
    category: entry.category,
    bestFor: entry.bestFor ?? entry.fit,
    notFor: entry.notFor ?? entry.avoid,
    curationNote: entry.curationNote ?? entry.recommendationReason ?? entry.note,
    disclosure: entry.disclosureHint ?? entry.disclosure,
    priceAmount: entry.priceAmount,
    currency: entry.currency,
    searchKeywords: entry.searchKeywords,
    riskFlags: entry.riskFlags,
    accountEmail: entry.accountEmail,
    visibility: entry.visibility,
    publicationStatus: entry.publicationStatus,
  };
}

function personaInputFromRecommenderPersona(persona) {
  return {
    handle: persona.handle,
    displayName: persona.displayName,
    personaName: persona.personaName,
    tagline: persona.tagline,
    greeting: persona.greeting,
    adviceMode: persona.adviceMode,
    commercialRole: persona.commercialRole,
    voiceTraits: persona.voiceTraits,
    curationPrinciples: persona.curationPrinciples,
    defaultOneLiner: persona.defaultOneLiner,
    categoryOneLiners: persona.categoryOneLiners,
    disclosureText:
      persona.disclosureText ?? persona.disclosurePolicy?.requiredDisclosureText,
    accountEmail: persona.accountEmail,
    firstPartyPriority: persona.disclosurePolicy?.firstPartyPriority,
    competitorInclusionPolicy: persona.disclosurePolicy?.competitorInclusionPolicy,
    sponsoredCampaign: persona.disclosurePolicy?.sponsoredCampaign,
    officialBrandPersona: persona.disclosurePolicy?.officialBrandPersona,
    conflictPolicy: persona.conflictPolicy,
  };
}

async function runRegisterDraft(args, { workDir, stdout, stderr }) {
  const filePath = flagValue(args, "--file") ?? positionalArgs(args)[0];

  if (!filePath) {
    stderr("Missing registration draft file");
    return 1;
  }

  let draft;

  try {
    draft = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    stderr(`Invalid registration draft JSON: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const registryPath = registryPathFor(workDir);
  const accountEmail = normalizeAccountEmail(flagValue(args, "--email") ?? draft.accountEmail);
  const validation = validateRegistrationDraft(draft, {
    ...FREE_BETA_LIMITS,
    accountEmail,
  });

  if (!validation.ok) {
    stderr(`Registration draft invalid: ${validation.errors.join(", ")}`);
    return 1;
  }

  const registry = await loadRegistry(registryPath);
  const existingAccountCardCount = countAccountCards(registry, accountEmail);

  if (existingAccountCardCount + validation.entryCount > FREE_BETA_LIMITS.maxEntries) {
    stderr("Registration draft invalid: account_entry_limit_exceeded");
    return 1;
  }

  const personas = personasFromRegistrationDraft(draft);
  const entries = entriesFromRegistrationDraft(draft);
  const registeredPersonas = [];
  const registeredCards = [];

  await upsertAccount(registryPath, {
    email: accountEmail,
    plan: "free_beta",
    maxPersonas: FREE_BETA_LIMITS.maxPersonas,
    maxEntries: FREE_BETA_LIMITS.maxEntries,
  });

  for (const persona of personas) {
    registeredPersonas.push(
      await addCuratorPersona(registryPath, {
        ...personaInputFromRecommenderPersona(persona),
        accountEmail,
      })
    );
  }

  for (const entry of entries) {
    registeredCards.push(
      await addCard(registryPath, {
        ...cardInputFromCurationEntry(entry),
        accountEmail,
        visibility: entry.visibility ?? draft.visibility ?? "curator_scoped",
        publicationStatus: entry.publicationStatus ?? draft.publicationStatus ?? "draft",
      })
    );
  }

  if (registeredPersonas.length === 0 && registeredCards.length === 0) {
    stderr("Registration draft contains no personas or curation entries");
    return 1;
  }

  stdout(
    `Registered draft: ${registeredPersonas.length} persona, ${registeredCards.length} card`
  );

  for (const persona of registeredPersonas) {
    stdout(`Persona: @${persona.handle}`);
  }

  for (const card of registeredCards) {
    stdout(`Card: ${card.title} (${card.slug})`);
  }

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
  if (room.persona?.personaName) {
    stdout(room.persona.personaName);
  }
  if (room.persona?.tagline) {
    stdout(room.persona.tagline);
  }
  stdout(`큐레이터 온도: ${room.trustTemperature}`);
  stdout("");

  for (const card of room.cards) {
    const price = card.priceSnapshot ? ` - ${card.priceSnapshot}` : "";
    stdout(`- ${card.title} (${card.platform})${price}`);
  }

  return 0;
}

function findCard(registry, slugOrId) {
  return (Array.isArray(registry.cards) ? registry.cards : []).find(
    (candidate) => candidate.slug === slugOrId || candidate.id === slugOrId
  );
}

async function runProtocolContext(args, { workDir, stdout, stderr }) {
  const slugOrId = positionalArgs(args)[0];
  const registry = await loadRegistry(registryPathFor(workDir));
  const card = findCard(registry, slugOrId);

  if (!card) {
    stderr(`Protocol context not found: ${slugOrId ?? ""}`.trim());
    return 1;
  }

  const persona = getCuratorPersona(registry, card.curator?.handle);
  stdout(JSON.stringify(buildAgentProductContext(card, { persona }), null, 2));

  return 0;
}

async function runProtocolPersona(args, { workDir, stdout, stderr }) {
  const handle = positionalArgs(args)[0];
  const registry = await loadRegistry(registryPathFor(workDir));
  const persona = getCuratorPersona(registry, handle);

  if (!persona) {
    stderr(`Protocol persona not found: ${handle ?? ""}`.trim());
    return 1;
  }

  stdout(JSON.stringify(buildRecommenderPersona(persona), null, 2));

  return 0;
}

async function runProtocolValidate(args, { stdout, stderr }) {
  const filePath = positionalArgs(args)[0];

  if (!filePath) {
    stderr("Missing protocol object file");
    return 1;
  }

  let object;

  try {
    object = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    stderr(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const result = validateProtocolObject(object);

  if (!result.ok) {
    stderr(`Protocol object invalid: ${result.errors.join(", ")}`);
    return 1;
  }

  stdout(`Protocol object valid: ${object.kind}`);

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
  const card = findCard(registry, slugOrId);

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

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    function cleanup() {
      server.off("error", onError);
    }

    function onError(error) {
      cleanup();
      reject(error);
    }

    server.once("error", onError);
    server.listen(port, host, () => {
      cleanup();
      resolve();
    });
  });
}

async function runServe(args, { workDir, stdout, serveKeepAlive, onServer, onListen }) {
  const port = Number(flagValue(args, "--port") ?? process.env.PORT ?? 8787);
  const host = flagValue(args, "--host") ?? "127.0.0.1";
  const server = createServer({ registryPath: registryPathFor(workDir) });

  await listen(server, port, host);

  const address = server.address();
  const listeningPort = typeof address === "object" && address ? address.port : port;
  const url = `http://${host}:${listeningPort}`;

  stdout(`AgentCart registry server listening at ${url}`);
  onServer?.(server);
  onListen?.({ server, url, host, port: listeningPort });

  if (!serveKeepAlive) {
    return 0;
  }

  await new Promise(() => {});
}

export async function run(args = [], options = {}) {
  const stdout = makePrinter(options.stdout ?? console.log);
  const stderr = makePrinter(options.stderr ?? console.error);
  const workDir = normalizeWorkDir(options.workDir);
  const serveKeepAlive = options.serveKeepAlive ?? true;
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

    if (command === "register:draft") {
      return await runRegisterDraft(commandArgs, { workDir, stdout, stderr });
    }

    if (command === "curator:room") {
      return await runCuratorRoom(commandArgs, { workDir, stdout, stderr });
    }

    if (command === "protocol:context") {
      return await runProtocolContext(commandArgs, { workDir, stdout, stderr });
    }

    if (command === "protocol:persona") {
      return await runProtocolPersona(commandArgs, { workDir, stdout, stderr });
    }

    if (command === "protocol:validate") {
      return await runProtocolValidate(commandArgs, { stdout, stderr });
    }

    if (command === "install-skill") {
      return await runInstallSkill(commandArgs, { workDir, stdout });
    }

    if (command === "open") {
      return await runOpen(commandArgs, { workDir, stdout, stderr });
    }

    if (command === "serve") {
      return await runServe(commandArgs, {
        workDir,
        stdout,
        serveKeepAlive,
        onServer: options.onServer,
        onListen: options.onListen,
      });
    }

    stderr(`Unknown command: ${command}`);
    stdout(helpText());
    return 1;
  } catch (error) {
    stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
