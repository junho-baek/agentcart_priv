# 2026-04-24 AgentCart platform compliance notes

Immutable capture of the working thesis from the product discussion.

## User thesis

- AgentCart is not a page builder.
- It is a middle DB and agent-readable product registry for agent commerce.
- Sellers and creators register product links, affiliate links, disclosures, price snapshots, and agent-readable JSON.
- Buyers install a shopping review skill and ask contextual shopping questions.
- The buyer agent queries AgentCart, reviews link, price, scam, disclosure, and policy risk, recommends products, and only opens a purchase URL after user approval.
- AgentCart feels more like Inpock Link or shopping-shorts infrastructure than an affiliate publisher account owner.
- The strategic line is: "제휴 링크를 AI 쇼핑 에이전트가 추천할 수 있는 상품 스킬/레지스트리로 등록해주는 서비스."
- Database efficiency matters if link submission goes viral; prefer SQLite/libSQL/sharded registry patterns before a heavyweight managed Postgres default.

## Sources checked on 2026-04-24

- Amazon Associates Program Policies: https://affiliate-program.amazon.com/help/operating/policies?ac-ms-src=ac-nav
- FTC Endorsement Guides FAQ: https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking
- Korea Fair Trade Commission press release on recommendation/endorsement ad guideline revision: https://www.ftc.go.kr/www/selectBbsNttView.do?bordCd=3&key=12&nttSn=43669&pageIndex=2&pageUnit=10&rltnNttSn=40672&searchCnd=all&searchViolt=0609
- Coupang Partners guide PDF: https://partners.coupangcdn.com/partners-guide/partners-guide-20250324160743.pdf
- Naver Brand Connect creator terms: https://brandconnect.naver.com/service/term/creator
- AliExpress Affiliate Program Service Agreement: https://terms.alicdn.com/legal-agreement/terms/suit_bu1_aliexpress/suit_bu1_aliexpress202003132026_84536.html
- SQLite Write-Ahead Logging: https://sqlite.org/wal.html
- Turso Embedded Replicas: https://docs.turso.tech/features/embedded-replicas/introduction
- Cloudflare D1 limits: https://developers.cloudflare.com/d1/platform/limits/

## Durable interpretation

- "We are only a platform" is not sufficient as a compliance posture.
- Safer product framing: AgentCart is a compliance-aware registry that helps contributors publish agent-readable product recommendations without hiding sponsorship, price age, source domain, or policy risk.
- The open-source core should be the trust layer; the proprietary hosted business can own the commerce graph and distribution.
