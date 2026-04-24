# FTC Endorsement Guides

## Source

- [FTC Endorsement Guides: What People Are Asking](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking)
- Checked: 2026-04-24

## Sourced Facts

- The FTC says endorsement disclosure depends on the overall context and does not create a safe harbor.
- Social media recommendations can be endorsements when consumers may believe they reflect an independent opinion.
- Financial relationships that affect how consumers weigh a recommendation should be disclosed clearly and conspicuously.
- A disclosure should be placed where ordinary consumers are unlikely to miss it and should be easy to understand.
- The FTC says "affiliate link" by itself may not be adequate because consumers may not understand that purchases can pay the link publisher.
- For affiliate links embedded in product reviews, a disclosure near the review and link may be sufficient in some contexts.
- Platform tools alone may not always be sufficient if the overall presentation still hides the material connection.

## AgentCart Interpretation

- AgentCart buyer output should not say only "affiliate link." It should say, in ordinary language, that purchases through the link may compensate the link registrant.
- Disclosure needs to appear in the agent response, the agent-readable JSON, and the open-link confirmation.
- Ranking should not be determined by commission rate. Store `ranking_uses_commission_rate=false` and make that auditable.
- If AgentCart gives sellers templates or distribution tooling, it should include education, defaults, monitoring, and policy enforcement instead of outsourcing disclosure entirely to contributors.

## Open Questions

- How FTC will treat agent-generated recommendations where a registry, contributor, model provider, and retail platform each influence the final recommendation.
- Whether AgentCart should distinguish between neutral registry results and endorsement-style recommendations in UI/agent wording.
