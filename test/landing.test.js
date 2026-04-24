import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const countOccurrences = (content, needle) => content.split(needle).length - 1;

test("landing page positions AgentCart as an installable commission-link protocol", async () => {
  const html = await readFile(new URL("../web/index.html", import.meta.url), "utf8");

  assert.match(html, /commission-link shopping protocol/);
  assert.match(html, /npm run agentcart -- install-skill/);
  assert.match(html, /npm run agentcart -- login/);
  assert.match(html, /\.agentcart\/skills\/agentcart-codex\.md/);
  assert.match(html, /npm run agentcart -- submit/);
  assert.match(html, /id="install"/);
  assert.match(html, /id="copy-install"/);
  assert.match(html, /Recommend a leather wallet under 100,000 won with AgentCart\./);
  assert.match(
    html,
    /First I will show the commission-link disclosure, then recommend only three options that fit your context\./
  );
  assert.doesNotMatch(html, /This should become/);
  assert.doesNotMatch(html, /npx agentcart/);
  assert.doesNotMatch(html, /agentcart\.dev\/skill\.md/);
  assert.doesNotMatch(html, /seller-skill\.md/);
});

test("landing translations keep required keys aligned across four languages", async () => {
  const main = await readFile(new URL("../web/main.js", import.meta.url), "utf8");
  const keys = [
    "hero.kicker",
    "hero.title1",
    "hero.title2",
    "hero.subtitle",
    "install.title",
    "install.command",
    "demo.chatUser",
    "demo.chatAgent",
  ];

  for (const key of keys) {
    assert.equal(countOccurrences(main, key), 4, `${key} should appear once per language`);
  }

  assert.doesNotMatch(main, /npx agentcart/);
  assert.doesNotMatch(main, /agentcart\.dev\/skill\.md/);
  assert.doesNotMatch(main, /seller-skill\.md/);
});
