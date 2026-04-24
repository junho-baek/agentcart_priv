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
    /description: Use when the user asks for product recommendations, gift ideas, shopping comparison, affiliate-link shopping decisions, or curator rooms/
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
  assert.match(markdown, /curator handle\/room/);
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
  assert.match(markdown, /Curator rooms are curated link collections, not seller verification/);
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
