import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  makeSkillMarkdown,
  readCanonicalSkill,
  writeSkill,
} from "../src/registry/skill.js";

test("makeSkillMarkdown includes skill trigger frontmatter and AgentCart positioning", () => {
  const markdown = makeSkillMarkdown({ target: "generic" });

  assert.match(markdown, /^---\nname: agentcart-shopping\n/m);
  assert.match(
    markdown,
    /description: Use when the user asks for product recommendations, gift ideas, shopping comparison, affiliate-link shopping decisions, curator personas, or curator rooms/
  );
  assert.match(markdown, /AgentCart는 커미션 링크 중심의 쇼핑 프로토콜입니다\./);
  assert.match(markdown, /최종 프론트엔드는 에이전트 채팅입니다\./);
});

test("makeSkillMarkdown includes required API reference and recommendation fields", () => {
  const markdown = makeSkillMarkdown({
    target: "codex",
    apiBaseUrl: "https://registry.example",
  });

  assert.match(markdown, /GET <apiBaseUrl>\/api\/search/);
  assert.match(markdown, /GET <apiBaseUrl>\/api\/curators\/<handle>/);
  assert.match(markdown, /POST <apiBaseUrl>\/api\/feedback/);
  assert.match(markdown, /Use `https:\/\/registry\.example` as the default `<apiBaseUrl>`/);
  assert.match(markdown, /Recommend exactly 3 products when 3 or more matching cards are available/);
  assert.match(markdown, /why it fits/);
  assert.match(markdown, /who should avoid it/);
  assert.match(markdown, /platform/);
  assert.match(markdown, /price snapshot/);
  assert.match(markdown, /curator handle\/persona/);
  assert.match(markdown, /Direct monetized link from the card/);
  assert.match(markdown, /큐레이터 한마디/);
});

test("makeSkillMarkdown closes behavioral guardrail loopholes", () => {
  const markdown = makeSkillMarkdown({ target: "generic" });

  assert.match(markdown, /추천 시작 전에 커미션 링크 고지를 먼저 표시하세요\./);
  assert.match(
    markdown,
    /아래 추천에는 커미션 링크가 포함될 수 있으며, 구매 시 링크 등록자가 일정액의 수수료를 받을 수 있습니다\./
  );
  assert.match(markdown, /Do not rank by commission rate\./);
  assert.match(markdown, /Never auto-open a monetized purchase link\./);
  assert.match(markdown, /ask for explicit approval before opening/);
  assert.match(markdown, /Require a separate affirmative confirmation/);
  assert.doesNotMatch(markdown, /unless they have already clearly approved/);
  assert.match(markdown, /Direct links may be shown in chat after disclosure/);
  assert.match(markdown, /Curator personas and rooms are curated link collections, not seller verification/);
  assert.match(markdown, /Prefer curator persona language over "curator room" language/);
  assert.match(markdown, /Do not claim the lowest price/);
  assert.match(markdown, /Do not hide the affiliate relationship/);
  assert.match(markdown, /Do not claim current availability unless the card explicitly says so/);
});

test("makeSkillMarkdown validates supported targets", () => {
  assert.throws(
    () => makeSkillMarkdown({ target: "browser" }),
    /unsupported_skill_target: browser/
  );
});

test("writeSkill writes default target-specific path and content", async () => {
  const workDir = await mkdtemp(join(tmpdir(), "agentcart-skill-"));

  try {
    const outputPath = await writeSkill({
      target: "openclaw",
      workDir,
      apiBaseUrl: "https://registry.example",
    });
    const content = await readFile(outputPath, "utf8");

    assert.equal(outputPath, join(workDir, ".agentcart", "skills", "agentcart-openclaw.md"));
    assert.match(content, /Target: openclaw/);
    assert.match(content, /Use `https:\/\/registry\.example` as the default `<apiBaseUrl>`/);
    assert.match(content, /Never auto-open a monetized purchase link\./);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
});

test("writeSkill honors explicit output paths", async () => {
  const workDir = await mkdtemp(join(tmpdir(), "agentcart-skill-output-"));

  try {
    const explicitOutput = join(workDir, "custom", "skill.md");
    const outputPath = await writeSkill({
      target: "claude",
      output: explicitOutput,
      workDir,
    });
    const content = await readFile(outputPath, "utf8");

    assert.equal(outputPath, explicitOutput);
    assert.match(content, /Target: claude/);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
});

test("readCanonicalSkill matches generated generic skill to avoid drift", async () => {
  const canonical = await readCanonicalSkill();

  assert.equal(canonical, makeSkillMarkdown({ target: "generic" }));
});

test("checked-in purchase assist skill documents browser and payment boundaries", async () => {
  const content = await readFile(
    new URL("../skills/agentcart-browser-purchase-assist-skill.md", import.meta.url),
    "utf8"
  );

  assert.match(content, /^name: agentcart-browser-purchase-assist/m);
  assert.match(content, /browser-use:browser/);
  assert.match(content, /Capture: get a visible screenshot first/);
  assert.match(content, /Coupang Payment Password Gate/);
  assert.match(content, /Do not read `AGENTCART_COUPANG_PAYMENT_PASSWORD`/);
  assert.match(content, /Do not click keypad digits/);
});

test("checked-in curator registration skill documents protocol structures and disclosure", async () => {
  const content = await readFile(
    new URL("../skills/agentcart-curator-registration-skill.md", import.meta.url),
    "utf8"
  );

  assert.match(content, /^name: agentcart-curator-registration/m);
  assert.match(content, /CurationEntry/);
  assert.match(content, /RecommenderPersona/);
  assert.match(content, /Commercial actor persona/);
  assert.match(content, /Do not hide brand, sponsor, affiliate, or merchant relationships/);
});

test("checked-in curator registration skill documents beta registration limits", async () => {
  const content = await readFile(
    new URL("../skills/agentcart-curator-registration-skill.md", import.meta.url),
    "utf8"
  );

  assert.match(content, /accountEmail/);
  assert.match(content, /30/);
  assert.match(content, /curator_scoped/);
  assert.match(content, /Do not promise global search exposure/);
  assert.match(content, /Collect email before registration/);
  assert.match(content, /Do not split one creator across multiple emails to bypass limits/);
});
