# Agent-Assisted Purchase Protocol

## Thesis

AgentCart can include a purchase-assist skill, but it should not silently complete purchases.

The safe product boundary is:

```text
Agent researches, reviews, selects, and prepares checkout.
Human logs in, confirms sensitive data, and approves final payment.
```

## Observed Coupang Flow

Tested on 2026-04-24 with a Coupang product link for `김치사발면 86g, 6개`.

The agent could:

- Open the product page.
- Read product name, price, option, delivery promise, review count, and product number.
- Click `바로구매`.

Coupang then redirected to login:

```text
login.coupang.com/login/login.pang?rtnUrl=...checkout.coupang.com/direct/checkout/...item[]=3000104081:1...
```

This means Coupang preserved checkout intent after login, but required user authentication before checkout.

After the user logged in manually, Coupang resumed the checkout page with:

- saved delivery destination
- saved payment method
- product summary
- total payment amount
- final `결제하기` button

No payment was submitted by the agent. This is the correct stop point for the purchase-assist protocol.

## Safety Boundary

Allowed for AgentCart purchase skill:

- Open product URL.
- Review product and link risk.
- Select option if user approved the product.
- Add to cart or start checkout when this is not the final purchase step.
- Stop at login, address, payment, OTP, CAPTCHA, or final order confirmation.

Requires user handoff or explicit action-time confirmation:

- Typing login credentials.
- Typing address, phone number, or other sensitive personal data.
- Solving CAPTCHA.
- Selecting or saving payment methods.
- Clicking final order/payment confirmation.

## Product UX

Recommended flow:

```text
Buyer: Buy this if it looks okay.

AgentCart:
1. Reviews product fit and risk.
2. Shows price snapshot and delivery promise.
3. Asks: "장바구니/구매 페이지까지 열까요?"
4. Opens checkout intent.
5. Stops at login or payment.
6. Says: "여기서부터는 직접 로그인/결제 확인이 필요합니다."
```

## Strategic Take

Purchase-assist is a strong feature, but not the initial promise.

Initial promise:

```text
AgentCart helps shopping agents recommend safely.
```

Later promise:

```text
AgentCart can prepare checkout, but the buyer stays in control of money movement.
```

This protects buyer trust and avoids turning AgentCart into a risky auto-buyer.
