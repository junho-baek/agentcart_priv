import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const countOccurrences = (content, needle) =>
  (content.match(new RegExp(`"${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g")) || []).length;

test("landing page feels like an installable agent skill, not a dense explainer", async () => {
  const html = await readFile(new URL("../web/index.html", import.meta.url), "utf8");

  assert.match(html, /Give shopping links/);
  assert.match(html, /a skill your agents can call\./);
  assert.match(html, /npm run agentcart -- install-skill --target codex/);
  assert.match(html, /Paste a product or affiliate link/);
  assert.match(html, /Campaign rules \+ disclosure\./);
  assert.match(html, /See what converts, not just what clicks\./);
  assert.match(html, /Start free, then move the right supply into paid workflows\./);
  assert.match(html, /Brand Campaign Kit/);
  assert.match(html, /Merchant Feed Sync/);
  assert.match(html, /The page should make people think, “oh, this belongs in an agent skill\.”/);
  assert.match(html, /npm run agentcart -- submit/);
  assert.doesNotMatch(html, /Copy CLI login/);
  assert.doesNotMatch(html, /Already have a persona\?/);
  assert.doesNotMatch(html, /OpenClaw/);
});

test("landing translations keep the key sections aligned across four languages", async () => {
  const main = await readFile(new URL("../web/main.js", import.meta.url), "utf8");
  const keys = [
    "hero.kicker",
    "hero.title1",
    "hero.title2",
    "install.title",
    "try.inputLabel",
    "brand.title",
    "creator.title",
    "merchant.title",
    "reports.title",
    "packages.title",
    "packages.creator.title",
    "packages.brand.title",
    "packages.merchant.title",
    "demo.title",
  ];

  for (const key of keys) {
    assert.equal(countOccurrences(main, key), 4, `${key} should appear once per language`);
  }

  assert.doesNotMatch(main, /Copy CLI login/);
  assert.doesNotMatch(main, /OpenClaw/);
});
