---
name: agentcart-browser-purchase-assist
description: Use when the user asks to open, inspect, search, compare, sign in to, use .env.local credentials for, add to cart, prepare checkout, or use Risk Mode for AgentCart shopping links in a browser, especially Coupang
---

# AgentCart Browser Purchase Assist

Companion to `agentcart-shopping`. Use this after the user selects an AgentCart card or shopping link and wants visible browser help. The browser is a purchase-assist layer, not a hidden autonomous buyer.

## Browser Surface

- Prefer `browser-use:browser` with the Browser `iab` backend for Coupang and other AgentCart purchase-assist flows.
- Use the Browser skill's Node REPL `browser-client` runtime first. Inside that runtime, `tab.playwright` is allowed for DOM snapshots, locators, screenshots, and stable clicks because it controls the in-app browser tab.
- Avoid opening shopping pages through the external Playwright MCP browser tools when `browser-use:browser` is available, because that can create a separate browser surface from the user's in-app browser.
- Use Computer Use MCP only as a visual/desktop fallback when Browser `iab` cannot target an element, the user is actively looking at the in-app browser, or a site control is only reliably accessible by coordinates.
- Do not switch between Browser `iab`, external Playwright MCP, and Computer Use in the same flow unless there is a concrete failure or visibility reason. Keep the user's visible in-app browser as the source of truth.

## Interaction Order

For product pages, cart pages, search results, and other non-sensitive shopping surfaces, use this default loop:

1. Capture: get a visible screenshot first so actions match what the user sees.
2. DOM: take a fresh DOM snapshot or focused locator check to identify stable controls and state.
3. CUA: act with Browser CUA coordinates when the visible UI is clearer than the DOM, or with a DOM locator when it is uniquely stable.
4. Verify: after the action, check URL/title/visible state and repeat the capture -> DOM -> CUA loop if needed.

## Modes

- Browse Mode: open product pages, search, scroll, inspect options/reviews, compare visible details.
- Safe Handoff: navigate to login or checkout-adjacent pages, then let the user enter sensitive data.
- High-Risk Login Mode: enter and submit credentials only when the current request names the destination and provides the exact account/password or they are visibly typed by the user.
- Credential Source Mode: read `.env.local` only when the current request explicitly authorizes that exact destination, e.g. Coupang login.
- Risk Mode: move faster with shorter wording for high-friction purchase tests. If the user already named a specific AgentCart card or product and asked to buy/open/continue, disclose once and proceed to open that exact product page in the same turn. Never skip required action-time confirmation for money movement, credentials, OTP, payment secrets, address, or account changes.

Never store, remember, print, summarize, copy, upload, or save credentials.

## Risk Mode

Use when the user explicitly says `위험 모드`, `risk mode`, `실험 모드`, or asks to reduce repeated confirmation friction during browser purchase testing.

Risk Mode changes style, not safety boundaries:

- Keep confirmations short and action-oriented.
- Treat a current-turn request like `구매해줘`, `열어줘`, `진행해`, or `한 턴에 끝내` for a named/selected AgentCart card as permission to open that exact monetized product URL after showing the required disclosure. Do not ask a second `열까요?` confirmation for opening the product page.
- In Risk Mode, do the maximum safe work in one turn: open the selected product page, inspect visible product/price/option state, click non-final navigation such as product page login or cart/checkout-adjacent setup when it does not submit payment, then stop only at a hard stop or final money movement.
- For Coupang flows that are gated by a 6-digit payment-password screen, treat product-page `바로구매`/`구매하기` and checkout-page `결제하기` as purchase-flow advancement when the user has already asked to buy the exact product. Do not pause for a separate confirmation at each of those buttons; continue until login, payment-password, OTP/CAPTCHA, address/payment edit, or order-complete state.
- Use compact status updates while acting; avoid long preambles once the exact product/link is clear.
- Do not require the user to repeat a long exact phrase when the product, merchant, and amount were already stated immediately before the final action.
- A short current-turn reply such as `눌러`, `진행`, `결제해`, or `오케이` can authorize the next named action only if the immediately preceding assistant message stated the exact site, product/order, approximate amount, and consequence.
- If the immediately preceding message did not name those details, ask one compact confirmation first.
- Never use Risk Mode to bypass OTP, CAPTCHA, payment password, card entry, address/profile entry, account creation, password saving, payment saving, or deletion confirmation.

Risk Mode opening prompt replacement:

- Instead of asking `이 링크를 열어도 될까요?`, say the disclosure, name the exact card and URL, then open it.
- If the request is ambiguous between multiple products or links, ask one compact disambiguation question before opening anything.

Compact final purchase prompt:

`쿠팡에서 <상품명> 약 <금액> 결제 버튼을 누릅니다. 답장으로 "눌러"라고 하면 바로 1회 클릭할게요.`

In Coupang payment-password-gated flows, use the compact prompt only when the next click may place the order without a password/authentication gate. If the visible/known flow requires the user to enter a 6-digit payment password after `결제하기`, clicking `결제하기` is allowed as part of purchase-flow advancement after the user has already requested purchase of the exact product.

After one final payment click, verify once. If the page stays on checkout and the final button remains, stop instead of repeated clicking unless the user gives a new current-turn confirmation for another click.

## Credential Source Mode

Use only these keys for Coupang:

```env
AGENTCART_COUPANG_EMAIL=
AGENTCART_COUPANG_PASSWORD=
```

Rules:

- Read only the authorized keys from the workspace `.env.local`.
- Treat reading `.env.local` for login as sensitive access and typing those values into the page as transmission.
- Do not create, edit, commit, upload, or copy `.env.local` unless the user separately asks for that exact file action.
- Stop at OTP, CAPTCHA, account recovery, password-save prompts, payment, address, or final purchase.

## Coupang In-App Browser Recipe

Use `browser-use:browser` with the `iab` backend. Prefer Browser `tab.playwright` for stable fields; use Browser CUA or Computer Use MCP for visual targeting or missed clicks.

1. Restate the exact card/link and disclose commission possibility if opening an AgentCart link.
2. Open the Coupang product page. In Risk Mode, do this immediately after the disclosure when the selected card/link is unambiguous.
3. Click `로그인` or use the current Coupang login redirect page.
4. Verify email-login form is visible.
5. Fill ID/email.
6. Fill password only under High-Risk Login Mode or Credential Source Mode.
7. Submit once.
8. If redirected to the product page, continue product assistance.
9. If the user already asked to buy the exact product, click product-page `바로구매`/`구매하기` and proceed through checkout-page `결제하기` until a hard stop appears. These buttons usually advance the Coupang purchase flow and may surface the payment-password gate rather than completing payment immediately.
10. If OTP, CAPTCHA, extra auth, password-save, account recovery, payment-password, payment-method edit, or address edit appears, stop and hand off.

## Coupang Payment Password Gate

When Coupang shows `비밀번호 입력` / `결제 비밀번호 6자리를 입력해주세요`:

- Stop immediately and tell the user to enter the 6-digit payment password directly.
- Do not read `AGENTCART_COUPANG_PAYMENT_PASSWORD`, even if it exists in `.env.local`, unless a future policy explicitly allows payment-secret entry. It is documented as a placeholder only.
- Do not click keypad digits, partially enter digits, test digits, or use screenshots to infer the keypad layout.
- After the user enters the password, continue verification from the resulting page: order complete, additional authentication, error, or still on checkout.

Observed in-app browser coordinate fallback:

- Email field: around `x: 200, y: 207`
- Password field: around `x: 200, y: 270`
- Login button: around `x: 280, y: 360`

Coordinates are viewport-dependent. If a CUA click focuses without submitting or misses, observe again and rebuild the target. Do not repeatedly blind-click.

## Rocket Fresh Minimum Order

Rocket Fresh purchases may require the cart to reach a minimum order amount. If Coupang shows a Rocket Fresh minimum-order block, treat `15,000원` as the target only when the page says so; otherwise follow the displayed page amount.

When blocked:

- Explain that Rocket Fresh checkout requires the cart to be filled to the displayed minimum, commonly `15,000원`.
- Report the visible missing amount when shown, such as `13,310원 이상 추가 시 구매가능`.
- Ask before adding any extra paid products.
- If the user agrees, ask for constraints or use their stated shopping intent, e.g. 자취 식품, 생필품, 최저가, 과일, 라면.
- Do not add arbitrary products just to satisfy the minimum order.

Suggested prompt:

`로켓프레시는 최소 주문금액 15,000원을 채워야 구매가 가능해요. 현재 추가로 약 <부족금액> 이상을 더 담아야 합니다. 필요한 식품이나 생필품으로 더 담아드릴까요?`

## CUA Loop

Use this pattern:

1. Observe with screenshot or DOM.
2. Identify target.
3. `move`, then `click`, `type`, `keypress`, or `scroll`.
4. Verify by URL/title, visible state, or focused page signal.

Common commands:

```js
await tab.cua.get_visible_screenshot()
await tab.cua.move({ x, y })
await tab.cua.click({ x, y })
await tab.cua.type({ text })
await tab.cua.keypress({ keys: ["ENTER"] })
await tab.cua.scroll({ x, y, scrollY, scrollX: 0 })
```

## Post-Click Verification Delay

Coupang can process `바로구매`, checkout, and payment button clicks without an immediate URL change. Do not judge success or failure from the URL right after clicking.

After any purchase-flow click:

1. Wait 5 seconds.
2. Capture a safe narrow screenshot or visible screenshot.
3. Check URL, title, and a fresh DOM snapshot.
4. Judge from combined signals: checkout URL, `주문/결제`, `결제하기`, minimum-order modal, login/auth prompt, order-complete text, error text, or unchanged button state.

Use a small explicit delay in Node REPL instead of Playwright `waitForTimeout`:

```js
await new Promise((resolve) => setTimeout(resolve, 5000))
```

If the page stays unchanged after one final payment click, stop instead of repeated clicking unless the user gives a new current-turn confirmation for another click.

## Checkout Button Discovery

When looking for a checkout, buy, or payment button visually, do not jump straight to a large scroll or blind coordinate hover. Use an incremental visual scan:

1. Confirm the button exists with DOM when possible, e.g. `button "결제하기"`.
2. Capture a narrow viewport crop that avoids address, card, OTP, or payment-secret details when on checkout pages.
3. Scroll a small amount, commonly `300-500` px, from a blank/non-control area.
4. Capture again and compare whether the visible section changed.
5. Repeat the small scroll and capture loop until the button is visible, then move/hover only.

If two captures show the same region after scrolling, stop using bigger scrolls blindly. Refocus a blank page area, try the opposite scroll direction once, or report that the page is stuck at the current section. Never click the final purchase/payment button while searching.

On Coupang checkout, a button can be `visible` in DOM while CUA wheel/key scrolling stays trapped around the payment-method block. In that case, use narrow full-page document-position crops only to locate the button visually, then report the limitation. Do not use DOM visibility as permission to click, and do not force the final payment action from an offscreen locator.

## Screenshots

Default to avoiding screenshots while a password is visibly exposed. If the user explicitly approves login screenshots in the current turn, screenshots may be used for coordination, but do not intentionally quote or print the secret value in text logs. Never show screenshots for OTP, payment, card, address, or auth-code screens.

## Hard Stops

- OTP, SMS/email codes, CAPTCHA, or auth challenges.
- Payment password, credit card, bank, or saved payment confirmation.
- Address, phone, resident ID, or sensitive profile data entry.
- Adding extra paid products only to satisfy minimum order requirements unless the user gives constraints or approves the exact additions.
- Password/payment saving prompts.
- Final purchase, subscription, reservation, or paid order submission without current-turn action-time confirmation.
- Credentials from shell env, logs, clipboard, browser history, or any local file other than an explicitly authorized `.env.local`.

## Failure Patterns

- Successful Coupang login can redirect back to the original affiliate product URL; product title/URL is the success signal.
- Rocket Fresh can block `바로구매` with a minimum-order modal. Report the displayed minimum and missing amount, then ask before adding more paid products.
- Selectors can be stale after navigation; check counts before filling/clicking.
- If login fails, report the visible reason and do not retry credentials repeatedly.
- If price, stock, seller trust, warranty, shipping, or lowest-price status is ambiguous, say so.

## Good Requests

- `쿠팡 링크 열고 상품 정보 확인해줘`
- `검색창에 대파 검색해줘`
- `로그인 페이지까지만 가보고 멈춰`
- `쿠팡 .env.local 로그인으로 상품 페이지까지 열어줘`
- `장바구니 직전까지 준비해줘`
