# Korea FTC Recommendation And Endorsement Guidelines

## Sources

- [공정거래위원회 보도자료: 추천보증 등에 관한 표시·광고 심사지침 개정](https://www.ftc.go.kr/www/selectBbsNttView.do?bordCd=3&key=12&nttSn=43669&pageIndex=2&pageUnit=10&rltnNttSn=40672&searchCnd=all&searchViolt=0609)
- Search result checked: 2026-04-24. Direct fetch was blocked by the site, so this page should be refreshed from the official PDF/HWP before legal launch.

## Sourced Facts

- 공정거래위원회는 2024-11-15에 추천·보증 등에 관한 표시·광고 심사지침 개정을 공지했고, 2024-12-01 시행을 안내했다.
- 검색 인덱스상 핵심은 블로그 등 문자 매체에서 경제적 이해관계 공개 방식을 개선하고, 경제적 이해관계 의미를 명확히 하는 것이다.
- 공개된 요약에 따르면 문자 중심 매체에서는 제목 또는 첫 부분 등 소비자가 쉽게 인식할 수 있는 위치에 경제적 이해관계를 공개하도록 강화되었다.
- "소정의 수수료를 지급받을 수 있음" 같은 조건부·불확정 표현은 명확하지 않은 표현의 예로 다뤄진다.

## AgentCart Interpretation

- 한국어 buyer answer에는 추천 결과와 구매 버튼 근처에 경제적 이해관계 고지를 붙여야 한다.
- "제휴 링크"라는 짧은 라벨보다 "이 링크로 구매하면 링크 등록자가 수수료를 받을 수 있습니다"처럼 소비자 관점에서 이해되는 문장이 안전하다.
- 건강기능식품, 의료, 미용, 금융성 상품은 일반 제휴 고지 외에도 별도 표시광고, 의료광고, 식품표시광고 리스크를 태그해야 한다.
- 판매자가 고지를 누락하면 `pending_review` 또는 `do_not_recommend` 상태로 두는 것이 낫다.

## Open Questions

- 최신 심사지침 원문 PDF/HWP 확인.
- AI/딥페이크/가상인물 광고 표시 개정안이 agent-generated shopping copy에 주는 영향.
