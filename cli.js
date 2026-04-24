#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";

const sessionPath = resolve(".agentcart/session.json");

function getFlag(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function makeDeviceCode() {
  return `AC-${randomBytes(3).toString("hex").toUpperCase()}-${randomBytes(2)
    .toString("hex")
    .toUpperCase()}`;
}

function printHelp() {
  console.log(`AgentCart CLI

Usage:
  agentcart login [--email creator@example.com]
  agentcart whoami
  agentcart logout

Local development:
  node cli.js login --email creator@example.com
`);
}

async function readSession() {
  try {
    return JSON.parse(await readFile(sessionPath, "utf8"));
  } catch {
    return null;
  }
}

async function login() {
  const email = getFlag("--email") ?? null;
  const deviceCode = makeDeviceCode();
  const createdAt = new Date().toISOString();
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
  await writeFile(sessionPath, `${JSON.stringify(session, null, 2)}\n`);

  console.log("AgentCart CLI login created");
  console.log(`Session: ${sessionPath}`);
  console.log(`Device code: ${deviceCode}`);
  console.log(`Login URL: ${session.loginUrl}`);
  console.log(email ? `Signed in as: ${email}` : "Signed in as: local CLI user");
}

async function whoami() {
  const session = await readSession();
  if (!session) {
    console.log("Not logged in. Run: agentcart login");
    process.exitCode = 1;
    return;
  }

  console.log("AgentCart CLI session");
  console.log(`Account: ${session.email ?? "local CLI user"}`);
  console.log(`Method: ${session.loginMethod}`);
  console.log(`Created: ${session.createdAt}`);
}

async function logout() {
  await rm(sessionPath, { force: true });
  console.log("AgentCart CLI session removed");
}

async function main() {
  const command = process.argv[2];

  if (!command || command === "help" || hasFlag("--help") || hasFlag("-h")) {
    printHelp();
    return;
  }

  if (command === "login") {
    await login();
    return;
  }

  if (command === "whoami") {
    await whoami();
    return;
  }

  if (command === "logout") {
    await logout();
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
