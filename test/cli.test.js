import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { run } from "../src/cli/commands.js";
import { loadRegistry, registryPathFor } from "../src/registry/store.js";

async function withCli(runTest) {
  const workDir = await mkdtemp(join(tmpdir(), "agentcart-cli-"));
  const stdout = [];
  const stderr = [];

  try {
    await runTest({
      workDir,
      stdout,
      stderr,
      runCli: (args) =>
        run(args, {
          workDir,
          stdout: (line) => stdout.push(line),
          stderr: (line) => stderr.push(line),
        }),
    });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

test("help lists registry commands and preserved auth commands", async () => {
  await withCli(async ({ runCli, stdout }) => {
    const code = await runCli(["help"]);
    const output = stdout.join("\n");

    assert.equal(code, 0);
    assert.match(output, /seed/);
    assert.match(output, /serve/);
    assert.match(output, /search/);
    assert.match(output, /submit/);
    assert.match(output, /curator:room/);
    assert.match(output, /install-skill/);
    assert.match(output, /open/);
    assert.match(output, /login/);
    assert.match(output, /whoami/);
    assert.match(output, /logout/);
  });
});

test("seed and search return Korean leather wallet demo cards with disclosure", async () => {
  await withCli(async ({ runCli, stdout, workDir }) => {
    const seedCode = await runCli(["seed"]);
    const registry = await loadRegistry(registryPathFor(workDir));
    const searchCode = await runCli(["search", "10만원 이하 가죽지갑", "--budget", "100000"]);
    const output = stdout.join("\n");

    assert.equal(seedCode, 0);
    assert.equal(searchCode, 0);
    assert.match(output, new RegExp(`Seeded ${registry.cards.length} AgentCart cards`));
    assert.match(output, /아래 추천에는 커미션 링크가 포함될 수 있으며/);
    assert.match(output, /블랙 소가죽 반지갑/);
    assert.match(output, /브라운 슬림 카드지갑/);
    assert.equal(output.match(/^\d+\. /gm)?.length, 3);
  });
});

test("curator room prints handle, display name, temperature, and cards", async () => {
  await withCli(async ({ runCli, stdout }) => {
    await runCli(["seed"]);
    const code = await runCli(["curator:room", "@wallet_curator"]);
    const output = stdout.join("\n");

    assert.equal(code, 0);
    assert.match(output, /@wallet_curator/);
    assert.match(output, /Wallet Curator/);
    assert.match(output, /큐레이터 온도:/);
    assert.match(output, /블랙 소가죽 반지갑/);
  });
});

test("missing curator room returns code 1", async () => {
  await withCli(async ({ runCli, stderr }) => {
    await runCli(["seed"]);
    const code = await runCli(["curator:room", "missing"]);

    assert.equal(code, 1);
    assert.match(stderr.join("\n"), /Curator room not found/);
  });
});

test("submit registers a card with normalized addCard fields", async () => {
  await withCli(async ({ runCli, stdout, workDir }) => {
    const code = await runCli([
      "submit",
      "--title",
      "테스트 가죽 벨트",
      "--url",
      "https://brand.example/products/leather-belt",
      "--curator",
      "gift_editor",
      "--display-name",
      "Gift Editor",
      "--category",
      "accessory",
      "--best-for",
      "가죽 선물,직장인 선물",
      "--not-for",
      "비건 소재 선호",
      "--note",
      "지갑이 아닌 가죽 소품 후보입니다.",
      "--price",
      "45000",
      "--currency",
      "KRW",
      "--keywords",
      "가죽 벨트,선물",
    ]);
    const registry = await loadRegistry(registryPathFor(workDir));
    const card = registry.cards.find((candidate) => candidate.title === "테스트 가죽 벨트");

    assert.equal(code, 0);
    assert.match(stdout.join("\n"), /Registered card: 테스트 가죽 벨트 \(테스트-가죽-벨트\)/);
    assert.equal(card.originalUrl, "https://brand.example/products/leather-belt");
    assert.equal(card.curator.displayName, "Gift Editor");
    assert.deepEqual(card.bestFor, ["가죽 선물", "직장인 선물"]);
    assert.deepEqual(card.notFor, ["비건 소재 선호"]);
    assert.deepEqual(card.searchKeywords, ["가죽 벨트", "선물"]);
    assert.equal(card.priceAmount, 45000);
  });
});

test("install-skill writes target skill and prints the path", async () => {
  await withCli(async ({ runCli, stdout, workDir }) => {
    const code = await runCli(["install-skill", "--target", "codex"]);
    const output = stdout.at(-1);
    const outputPath = output.replace("Installed AgentCart skill: ", "");
    const content = await readFile(outputPath, "utf8");

    assert.equal(code, 0);
    assert.equal(
      output,
      `Installed AgentCart skill: ${join(workDir, ".agentcart", "skills", "agentcart-codex.md")}`
    );
    assert.equal(outputPath, join(workDir, ".agentcart", "skills", "agentcart-codex.md"));
    assert.match(content, /name: agentcart-shopping/);
    assert.match(content, /Never auto-open a monetized purchase link\./);
  });
});

test("open dry-run prints URL and default open prints approval boundary", async () => {
  await withCli(async ({ runCli, stdout }) => {
    await runCli(["seed"]);
    const dryRunCode = await runCli(["open", "블랙-소가죽-반지갑", "--dry-run"]);
    const openCode = await runCli(["open", "블랙-소가죽-반지갑"]);
    const output = stdout.join("\n");

    assert.equal(dryRunCode, 0);
    assert.equal(openCode, 0);
    assert.match(output, /Dry run/);
    assert.match(output, /https:\/\/link\.coupang\.com\/a\/evvpLi/);
    assert.match(output, /AgentCart will not auto-open monetized purchase links/);
    assert.match(output, /Open after explicit approval:/);
  });
});

test("open accepts boolean dry-run flag before the slug", async () => {
  await withCli(async ({ runCli, stdout }) => {
    await runCli(["seed"]);
    const code = await runCli(["open", "--dry-run", "블랙-소가죽-반지갑"]);

    assert.equal(code, 0);
    assert.match(stdout.join("\n"), /Dry run: https:\/\/link\.coupang\.com\/a\/evvpLi/);
  });
});

test("protocol context and persona commands print agent-readable JSON", async () => {
  await withCli(async ({ runCli, stdout }) => {
    await runCli(["seed"]);
    const contextCode = await runCli(["protocol:context", "블랙-소가죽-반지갑"]);
    const personaCode = await runCli(["protocol:persona", "junho-baek"]);
    const contextStart = stdout.findIndex((line) => line.includes('"kind": "AgentProductContext"'));
    const personaStart = stdout.findIndex((line) => line.includes('"kind": "RecommenderPersona"'));

    assert.equal(contextCode, 0);
    assert.equal(personaCode, 0);
    assert.notEqual(contextStart, -1);
    assert.notEqual(personaStart, -1);
    assert.match(stdout.slice(contextStart).join("\n"), /"allowedActions"/);
    assert.match(stdout.slice(personaStart).join("\n"), /"adviceMode": "insight_first"/);
  });
});

test("protocol validate accepts valid protocol JSON files", async () => {
  await withCli(async ({ runCli, stdout, workDir }) => {
    const filePath = join(workDir, "context.json");
    await writeFile(
      filePath,
      JSON.stringify({
        kind: "CurationEntry",
        id: "entry-1",
        title: "테스트 상품",
        originalUrl: "https://brand.example/products/1",
        curator: { handle: "tester" },
      }),
      "utf8"
    );

    const code = await runCli(["protocol:validate", filePath]);

    assert.equal(code, 0);
    assert.match(stdout.join("\n"), /Protocol object valid: CurationEntry/);
  });
});

test("missing card open returns code 1", async () => {
  await withCli(async ({ runCli, stderr }) => {
    await runCli(["seed"]);
    const code = await runCli(["open", "missing-card", "--dry-run"]);

    assert.equal(code, 1);
    assert.match(stderr.join("\n"), /Card not found/);
  });
});

test("login, whoami, and logout preserve workDir-scoped sessions", async () => {
  await withCli(async ({ runCli, stdout, workDir }) => {
    const loginCode = await runCli(["login", "--email", "creator@example.com"]);
    const session = JSON.parse(await readFile(join(workDir, ".agentcart", "session.json"), "utf8"));
    const whoamiCode = await runCli(["whoami"]);
    const logoutCode = await runCli(["logout"]);
    const loggedOutCode = await runCli(["whoami"]);
    const output = stdout.join("\n");

    assert.equal(loginCode, 0);
    assert.equal(whoamiCode, 0);
    assert.equal(logoutCode, 0);
    assert.equal(loggedOutCode, 1);
    assert.equal(session.email, "creator@example.com");
    assert.match(output, /AgentCart CLI login created/);
    assert.match(output, /Signed in as: creator@example.com/);
    assert.match(output, /AgentCart CLI session/);
    assert.match(output, /Account: creator@example.com/);
    assert.match(output, /AgentCart CLI session removed/);
    assert.match(output, /Not logged in\. Run: agentcart login/);
  });
});

test("serve can return after listen for in-process tests", async () => {
  await withCli(async ({ runCli, stdout }) => {
    let server;
    const code = await run(["serve", "--port", "0"], {
      serveKeepAlive: false,
      onServer: (listeningServer) => {
        server = listeningServer;
      },
      stdout: (line) => stdout.push(line),
      stderr: () => {},
    });

    assert.equal(code, 0);
    assert.ok(server);
    assert.match(stdout.join("\n"), /AgentCart registry server listening at http:\/\/127\.0\.0\.1:\d+/);

    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
});

test("serve returns code 1 when the port is already in use", async () => {
  await withCli(async ({ stdout, stderr }) => {
    const occupiedServer = http.createServer();
    await new Promise((resolve) => occupiedServer.listen(0, "127.0.0.1", resolve));
    const { port } = occupiedServer.address();

    try {
      const code = await run(["serve", "--port", String(port)], {
        serveKeepAlive: false,
        stdout: (line) => stdout.push(line),
        stderr: (line) => stderr.push(line),
      });

      assert.equal(code, 1);
      assert.match(stderr.join("\n"), /EADDRINUSE/);
    } finally {
      await new Promise((resolve, reject) => {
        occupiedServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});

test("unknown command returns code 1 and prints help", async () => {
  await withCli(async ({ runCli, stdout, stderr }) => {
    const code = await runCli(["wat"]);

    assert.equal(code, 1);
    assert.match(stderr.join("\n"), /Unknown command: wat/);
    assert.match(stdout.join("\n"), /AgentCart CLI/);
  });
});
