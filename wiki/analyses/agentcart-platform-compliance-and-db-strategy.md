# AgentCart Platform Compliance And DB Strategy

## Question

AgentCart is more like Inpock Link or shopping shorts infrastructure than a direct affiliate publisher. If creators and sellers bring their own affiliate/product links, can AgentCart safely be a platform? And should the DB be Supabase/Postgres, SQLite, or NoSQL?

## Short Answer

The platform model is viable, but "we are only the platform" is not enough.

AgentCart should be positioned as an agent-safe affiliate/product registry. The product has to make policy compliance visible and enforceable: contributor authority, disclosure, source-domain transparency, price snapshot age, no forced redirects, no hidden ranking by commission, and platform-specific rules.

For DB, start with SQLite/libSQL-style published registry shards, not one big transactional app DB. Use append-only intake and review workers before publishing to compact read-optimized shards.

## Office-Hours Judgment

This is a better category than "page builder":

- AgentCart is the product skill layer for agent commerce.
- The user-facing promise is "내 제휴 링크를 AI 쇼핑 에이전트가 안전하게 추천할 수 있는 상품 레지스트리에 등록하세요."
- The wedge is trust, not page design.
- Open-source the trust layer; own the hosted commerce graph, distribution, contributor reputation, and agent traffic.

## Terms And Policy Risks By Platform

Amazon Associates:

- Highest risk for cached product data, prices, images, reviews, and star ratings.
- Requires approved site/channel thinking.
- Avoid displaying Amazon prices as current unless sourced through allowed APIs.
- Avoid using Program Content to train or improve models.

Coupang Partners:

- Require clear economic-interest disclosure.
- Avoid forced redirect, popups, background opens, or ad-hijacking-like flows.
- Verify whether AgentCart-hosted pages/skill cards are allowed as registered media.
- Confirm price/image/API rules from logged-in policy before using them beyond snapshots.

Naver Brand/Shopping Connect:

- Treat as Korea FTC disclosure plus Naver ecosystem rules.
- Store contributor role and approved channel.
- Confirm whether external registry cards are permitted distribution surfaces.

AliExpress Affiliate:

- Contributor profile data matters because required media/contact information can affect account/API/payment status.
- Do not interfere with tracking.
- Do not use robotic/scripted opens.
- Do not promise commission reliability.

Direct sellers:

- Easier on affiliate-program terms, harder on consumer protection, seller verification, counterfeit, refund/CS, medical/health claims, and product liability.

## MVP Schema Additions

- `policy_profile`
- `contributor_profile_url`
- `approved_channel_url`
- `affiliate_program_name`
- `affiliate_disclosure_text`
- `original_url`
- `final_url`
- `redirect_chain`
- `source_domain`
- `price_snapshot_captured_at`
- `current_price_verified_at`
- `review_source_type`
- `ranking_uses_commission_rate`
- `auto_open_allowed`
- `policy_status`

## Hard Defaults

- `auto_open_allowed=false`
- `ranking_uses_commission_rate=false`
- `current_price_verified_at=null` unless refreshed through an allowed source
- missing disclosure means `pending_review` or `do_not_recommend`
- unknown platform means conservative policy profile

## Do Not Build Yet

- Commission guarantee.
- Lowest-price claims.
- Auto-redirect monetization.
- Review/star scraping.
- Retailer image reuse without allowed source.
- "Verified seller" claims without verification evidence.
- One global SQLite writer for all viral submissions.

## Research Gaps

- Coupang Partners logged-in latest terms and operating policy.
- Naver Shopping Connect exact external distribution rules.
- Temu, Shopee, Rakuten, Impact, CJ, Awin, and Partnerize program rules.
- Whether agent skill output is treated as creator content, software/app distribution, or a separate media surface per affiliate network.
