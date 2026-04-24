# AgentCart Skill Suite Implementation Prompt

Use this prompt with Codex or another coding agent to implement the next AgentCart MVP slice.

```text
You are Codex working in /Users/junho/project/agent-commerce.

Goal:
Implement the AgentCart skill-suite MVP on top of the existing landing page and CLI.

Product context:
AgentCart is not a page builder. It is an agent-commerce product registry and skill layer.
Sellers and creators register product/affiliate links as agent-readable product cards.
Buyers ask shopping agents for recommendations. The agent queries AgentCart, asks context questions, reviews risk, and opens purchase links only after user approval.

Core scenario:
Seller:
- User says: "$에이전트카트 사용해서 내 제품 등록하고 싶어"
- AgentCart asks: "링크 주세요."
- User provides a product or affiliate link.
- AgentCart opens the link in the local browser for inspection.
- AgentCart drafts product copy and an agent-readable product card.
- AgentCart asks for missing details:
  - 누구에게 추천하면 좋나요?
  - 꼭 강조하고 싶은 장점은?
  - 제휴 링크인가요?
  - 배송/가격/주의사항이 있나요?
  - 등록자 프로필이나 승인된 채널이 있나요?
- AgentCart asks for explicit approval before uploading/transmitting the product card.

Buyer:
- User says: "$에이전트카트 사용해서 엄마 생일 선물 추천해줘"
- AgentCart asks context questions when needed.
- AgentCart returns reviewed product recommendations.
- Agent opens a purchase link only after user approval.

Account and analytics:
- "에이전트카트 - 내 정보"
- "에이전트카트 - 내 구매이력 추천 내역"
- "에이전트카트 - 선물하기"
- "에이전트카트 - 커미션링크 내역"
- "에이전트카트 - 커미션링크 타 에이전트의 추천 횟수 클릭 수 전환률"

Important compliance constraints:
- Uploading product/link/seller info to AgentCart is outbound transmission. Ask for explicit confirmation immediately before upload.
- Do not auto-open monetized purchase links.
- Do not promise commission or conversion accuracy.
- Recommendation count and click count can be first-party AgentCart metrics.
- Conversion rate requires affiliate-platform postback, seller import, or explicit user/buyer connection.
- Treat price as a snapshot unless refreshed through an allowed source.
- Always store affiliate disclosure text when a link is monetized.
- Keep original URL, final URL, source domain, and redirect chain.

Implementation requirements:

1. Add an AgentCart skill router
- Create a reusable module that maps Korean/English user intents to skill modes:
  - seller_register_product
  - buyer_recommend
  - account_profile
  - buyer_history
  - gifting
  - commission_links
  - commission_analytics
- Add tests for intent routing.

2. Add seller product registration workflow
- CLI command: agentcart seller:register or product:register
- Interactive flow:
  - Ask for link if missing.
  - Normalize URL.
  - Resolve final URL and redirect chain if possible.
  - Infer platform profile: amazon_associates, coupang_partners, naver_connect, aliexpress_affiliate, direct_seller, unknown.
  - Draft an agent-readable product card.
  - Ask follow-up questions for missing seller/product details.
  - Save as local draft first.
  - Require explicit upload/submit confirmation before writing to hosted/outbound placeholder.
- Since there is no real hosted API yet, implement upload as a local "submitted" queue file under .agentcart/submissions.json.
- Make the boundary clear in output: "Local draft created" vs "Submitted to AgentCart".

3. Add skill files
- Generate/install seller skill:
  - agentcart install-skill --target seller
  - writes an agent skill markdown that says how to register products.
- Generate/install buyer skill:
  - existing buyer skill behavior should remain.
- Skill content must include:
  - Ask for link.
  - Use local browser to inspect if available.
  - Draft copy.
  - Ask missing details.
  - Confirm before upload.
  - Do not hide affiliate disclosure.

4. Add account commands
- agentcart login [--email]
- agentcart whoami
- agentcart logout
- agentcart me
- agentcart history
- agentcart gifts
- agentcart links
- agentcart analytics
- For MVP, use local JSON state under .agentcart/.
- Analytics should include mock/sample fields:
  - recommendations
  - clicks
  - conversions
  - conversionRate
  - topAgentSource
- Clearly label conversions as unavailable unless imported or connected.

5. Update landing page
- Add a seller scenario block:
  "$에이전트카트 사용해서 내 제품 등록하고 싶어"
  "링크 주세요"
  "자동으로 카피를 등록중입니다"
  "추가 정보가 있을까요?"
  "승인하면 AgentCart에 업로드합니다"
- Add copy for CLI login:
  npx agentcart login
- Keep EN/KO/ZH/JA language toggles working.
- Add localized strings for the new scenario block.

6. Data model
Add local schema/types for:
- AccountProfile
- ProductDraft
- ProductSubmission
- AgentReadableProductCard
- CommissionLink
- RecommendationEvent
- ClickEvent
- ConversionEvent
- AnalyticsSummary

Product draft fields:
- id
- slug
- originalUrl
- finalUrl
- redirectChain
- sourceDomain
- platformProfile
- title
- description
- targetAudience
- keyBenefits
- cautions
- priceSnapshot
- priceSnapshotCapturedAt
- affiliateDisclosureText
- contributorProfileUrl
- approvedChannelUrl
- policyStatus
- createdAt
- updatedAt

7. Tests
Add tests for:
- intent routing
- seller registration draft creation
- missing-detail questions
- policy profile inference
- local session login/whoami/logout
- analytics summary calculation
- skill generation content
- landing i18n dictionary has all keys for en/ko/zh/ja

8. Verification
Run:
- npm install
- npm run build
- npm test if test script exists; otherwise add one if this repo has CLI tests available
- node cli.js login --email creator@example.com
- node cli.js whoami
- node cli.js seller:register "https://example.com/product" --draft-only
- node cli.js links
- node cli.js analytics
- node cli.js logout

Final report:
- Changed files
- Test/build results
- Demo command output
- Known limitations

Design taste:
Keep the landing futuristic, cute, and agent-native. Avoid generic SaaS copy. AgentCart should feel like "cute infra for agent commerce," not an ordinary affiliate dashboard.
```
