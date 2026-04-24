# Platform-Safe Affiliate Registry

## Definition

AgentCart is a platform-safe affiliate/product registry for shopping agents.

It lets a contributor register product links, affiliate disclosures, price snapshots, product claims, and agent-readable JSON so that shopping agents can search, compare, review risk, and recommend products before opening the original purchase URL.

## Positioning

- Not: "제휴 링크용 페이지 빌더."
- Better: "제휴 링크를 AI 쇼핑 에이전트가 추천할 수 있는 상품 레지스트리에 등록하세요."
- Developer framing: "Open-source the trust layer. Own the commerce graph."

## Why Platform Status Is Not Enough

"우리는 인포크링크처럼 플랫폼만 제공한다"는 포지션은 비즈니스적으로 맞지만, 약관/규제 리스크를 완전히 없애지는 않는다.

AgentCart still influences:

- Which links are stored.
- How product claims are summarized.
- Whether disclosures are visible.
- Whether stale prices look current.
- Whether the buyer agent opens a monetized link.
- Whether rankings are affected by commission.

Therefore compliance must be a product feature, not a footnote.

## Product Rules

- Require `affiliate_disclosure_text`.
- Require `contributor_profile` and `approved_channel_url` where the platform profile requires it.
- Store `original_url`, `normalized_url`, `final_url`, `source_domain`, and `redirect_chain`.
- Store `price_snapshot` with `captured_at`, currency, and source; never label it as current price unless refreshed through an allowed source.
- Store `review_source_type`: contributor_claim, official_api, buyer_review, editorial_review, unknown.
- Store `policy_profile`: amazon_associates, coupang_partners, naver_connect, aliexpress_affiliate, direct_seller, unknown.
- Default to `auto_open=false`; open only after buyer selection.
- Default to `ranking_uses_commission_rate=false`.

## Submission Pipeline

1. Raw submission is accepted into an append-only queue.
2. Platform/domain is detected.
3. Link is expanded and redirect chain is saved.
4. Contributor authority and approved media/channel are checked.
5. Disclosure text is checked.
6. Price, image, review, and claim fields are classified by allowed source type.
7. Risk flags are assigned.
8. Product becomes `published`, `pending_review`, or `rejected`.

## Buyer-Agent Output Rules

- Say that the link may compensate the contributor before opening.
- Show `captured_at` beside any price snapshot.
- Mention that final price and availability must be checked on the retailer site.
- Do not imply AgentCart verified the seller unless a review source supports it.
- Do not rank primarily by commission.

## Platform Hazards

- Amazon: approved site/channel, Special Link formatting, price/API restrictions, Program Content restrictions, ML/model-use restrictions.
- Coupang: economic-interest disclosure, no forced redirect/ad hijacking, channel approval uncertainty, price/image/API uncertainty.
- Naver: Brand/Shopping Connect rules plus Korea FTC disclosure rules, contributor role and content rights.
- AliExpress: required media/contact information, tracking integrity, fraud rules, seller-content uncertainty.

## Related Pages

- [Amazon Associates Program Policies](../sources/amazon-associates-program-policies.md)
- [FTC Endorsement Guides](../sources/ftc-endorsement-guides.md)
- [Korea FTC Recommendation And Endorsement Guidelines](../sources/korea-ftc-recommendation-endorsement-guidelines.md)
- [Coupang Partners Guide](../sources/coupang-partners-guide.md)
- [Naver Brand Connect Creator Terms](../sources/naver-brand-connect-creator-terms.md)
- [AliExpress Affiliate Program Service Agreement](../sources/aliexpress-affiliate-service-agreement.md)
