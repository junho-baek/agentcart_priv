const linkForm = document.querySelector("#link-form");
const linkInput = document.querySelector("#product-link");
const linkResult = document.querySelector("#link-result");
const copySkillButton = document.querySelector("#copy-skill");
const copyLoginButton = document.querySelector("#copy-login");
const skillCommand = document.querySelector("#skill-command");
const cliLoginCommand = document.querySelector("#cli-login-command");
const languageButtons = document.querySelectorAll("[data-lang]");

const translations = {
  en: {
    "nav.register": "Register",
    "nav.skill": "Agent skill",
    "nav.demo": "Demo",
    "nav.login": "Login",
    "hero.kicker": "The product registry for shopping agents",
    "hero.title1": "Your links,",
    "hero.title2": "ready for agents.",
    "hero.subtitle":
      "Paste a product link, or ask your agent to register it. AgentCart turns it into a product card shopping agents can understand.",
    "hero.primary": "Register a link",
    "hero.secondary": "Send skill to agent",
    "seller.kicker": "For sellers and creators",
    "seller.title": "Register links by hand, or through your agent.",
    "seller.body":
      "Add a Coupang, Amazon, SmartStore, AliExpress, or store link. Or tell Codex, Claude, or OpenClaw to submit it for you.",
    "seller.inputLabel": "Product or affiliate link",
    "seller.inputPlaceholder": "https://example.com/product",
    "seller.packButton": "Pack",
    "seller.formNote": "Preview: a reviewed AgentCart card will be created.",
    "seller.empty": "Paste a product link first. Your agent needs a trail to follow.",
    "seller.queued": "Packed preview queued: your AgentCart product card is ready for review.",
    "seller.commandLabel": "Seller agent command",
    "seller.command":
      "Read https://agentcart.dev/seller-skill.md\nand register this product link for AgentCart.",
    "seller.commandHelp":
      "Works from Codex, Claude, OpenClaw, or any agent that can read a skill URL.",
    "login.prompt": "Already registered something?",
    "login.copy": "Copy CLI login",
    "login.copied": "CLI login copied",
    "login.fallback": "Copy this command manually",
    "buyer.kicker": "For buyers",
    "buyer.title": "Send your shopping agent to AgentCart.",
    "buyer.body":
      "No app store dance. Give your agent one instruction and it knows to ask context questions, review links, and wait before opening a purchase URL.",
    "buyer.command":
      "Read https://agentcart.dev/skill.md\nand use AgentCart whenever I ask what to buy.",
    "buyer.copy": "Copy for my agent",
    "buyer.copied": "Copied for your agent",
    "buyer.fallback": "Copy this text manually",
    "demo.kicker": "Demo film",
    "demo.title": "Show the moment an agent shops better.",
    "demo.body":
      "This should become a short video: a buyer asks for a gift, the agent asks one smart question, AgentCart checks the link, then the buyer approves the purchase path.",
    "demo.cardLabel": "40 sec demo",
    "demo.cardBody": "Buyer asks. Agent checks. Cart opens only when approved.",
  },
  ko: {
    "nav.register": "등록",
    "nav.skill": "에이전트 스킬",
    "nav.demo": "데모",
    "nav.login": "로그인",
    "hero.kicker": "쇼핑 에이전트를 위한 상품 레지스트리",
    "hero.title1": "당신의 링크를,",
    "hero.title2": "에이전트용으로.",
    "hero.subtitle":
      "상품 링크를 붙여넣거나 에이전트에게 등록을 맡기세요. AgentCart가 쇼핑 에이전트가 이해할 수 있는 상품 카드로 바꿉니다.",
    "hero.primary": "링크 등록하기",
    "hero.secondary": "스킬 보내기",
    "seller.kicker": "판매자와 크리에이터용",
    "seller.title": "직접 등록하거나, 에이전트에게 맡기세요.",
    "seller.body":
      "쿠팡, 아마존, 스마트스토어, 알리익스프레스, 자사몰 링크를 추가하세요. Codex, Claude, OpenClaw에게 대신 제출하라고 말해도 됩니다.",
    "seller.inputLabel": "상품 또는 제휴 링크",
    "seller.inputPlaceholder": "https://example.com/product",
    "seller.packButton": "패킹",
    "seller.formNote": "미리보기: 검토 가능한 AgentCart 상품 카드가 만들어집니다.",
    "seller.empty": "먼저 상품 링크를 붙여넣어 주세요. 에이전트에게 따라갈 길이 필요해요.",
    "seller.queued": "패킹 완료: AgentCart 상품 카드가 검토 대기열에 들어갔습니다.",
    "seller.commandLabel": "판매자 에이전트 명령",
    "seller.command":
      "https://agentcart.dev/seller-skill.md 를 읽고\n이 상품 링크를 AgentCart에 등록해줘.",
    "seller.commandHelp":
      "Codex, Claude, OpenClaw 또는 skill URL을 읽을 수 있는 에이전트에서 사용할 수 있습니다.",
    "login.prompt": "이미 등록한 링크가 있나요?",
    "login.copy": "CLI 로그인 복사",
    "login.copied": "CLI 로그인 복사됨",
    "login.fallback": "명령어를 직접 복사하세요",
    "buyer.kicker": "구매자용",
    "buyer.title": "쇼핑 에이전트를 AgentCart로 보내세요.",
    "buyer.body":
      "앱스토어는 필요 없습니다. 에이전트에게 한 줄만 보내면 맥락 질문을 하고, 링크를 검토하고, 구매 URL을 열기 전에 기다립니다.",
    "buyer.command":
      "https://agentcart.dev/skill.md 를 읽고\n내가 무엇을 살지 물어보면 AgentCart를 사용해줘.",
    "buyer.copy": "내 에이전트용 복사",
    "buyer.copied": "에이전트용으로 복사됨",
    "buyer.fallback": "텍스트를 직접 복사하세요",
    "demo.kicker": "데모 영상",
    "demo.title": "에이전트가 더 잘 쇼핑하는 순간을 보여주세요.",
    "demo.body":
      "짧은 영상으로 만들면 좋습니다. 구매자가 선물을 묻고, 에이전트가 똑똑한 질문을 하나 던지고, AgentCart가 링크를 확인한 뒤, 구매자가 경로를 승인하는 흐름입니다.",
    "demo.cardLabel": "40초 데모",
    "demo.cardBody": "구매자가 묻고, 에이전트가 확인하고, 승인 후에만 카트가 열립니다.",
  },
  zh: {
    "nav.register": "注册链接",
    "nav.skill": "智能体技能",
    "nav.demo": "演示",
    "nav.login": "登录",
    "hero.kicker": "面向购物智能体的商品注册层",
    "hero.title1": "你的链接，",
    "hero.title2": "为智能体准备好。",
    "hero.subtitle":
      "粘贴商品链接，或让你的智能体代为注册。AgentCart 会把它变成购物智能体可理解的商品卡片。",
    "hero.primary": "注册链接",
    "hero.secondary": "发送技能",
    "seller.kicker": "面向卖家和创作者",
    "seller.title": "手动注册，或交给你的智能体。",
    "seller.body":
      "添加 Coupang、Amazon、SmartStore、AliExpress 或自营商城链接。也可以让 Codex、Claude 或 OpenClaw 替你提交。",
    "seller.inputLabel": "商品或联盟链接",
    "seller.inputPlaceholder": "https://example.com/product",
    "seller.packButton": "打包",
    "seller.formNote": "预览：将创建一个可审核的 AgentCart 商品卡。",
    "seller.empty": "请先粘贴商品链接。你的智能体需要一条可跟踪的线索。",
    "seller.queued": "已打包：AgentCart 商品卡已进入审核队列。",
    "seller.commandLabel": "卖家智能体命令",
    "seller.command":
      "Read https://agentcart.dev/seller-skill.md\nand register this product link for AgentCart.",
    "seller.commandHelp":
      "可用于 Codex、Claude、OpenClaw，或任何能读取 skill URL 的智能体。",
    "login.prompt": "已经注册过内容？",
    "login.copy": "复制 CLI 登录",
    "login.copied": "已复制 CLI 登录",
    "login.fallback": "请手动复制此命令",
    "buyer.kicker": "面向买家",
    "buyer.title": "把你的购物智能体发送到 AgentCart。",
    "buyer.body":
      "不需要应用商店。给智能体一句指令，它就会追问上下文、检查链接，并在打开购买链接前等待你的确认。",
    "buyer.command":
      "Read https://agentcart.dev/skill.md\nand use AgentCart whenever I ask what to buy.",
    "buyer.copy": "复制给我的智能体",
    "buyer.copied": "已复制给你的智能体",
    "buyer.fallback": "请手动复制文本",
    "demo.kicker": "演示视频",
    "demo.title": "展示智能体更会购物的瞬间。",
    "demo.body":
      "这里适合放一段短视频：买家询问礼物，智能体追问一个关键问题，AgentCart 检查链接，然后买家批准购买路径。",
    "demo.cardLabel": "40 秒演示",
    "demo.cardBody": "买家提问。智能体检查。只有批准后才打开购物车。",
  },
  ja: {
    "nav.register": "登録",
    "nav.skill": "エージェントスキル",
    "nav.demo": "デモ",
    "nav.login": "ログイン",
    "hero.kicker": "ショッピングエージェントのための商品レジストリ",
    "hero.title1": "あなたのリンクを、",
    "hero.title2": "エージェント対応に。",
    "hero.subtitle":
      "商品リンクを貼るか、エージェントに登録を任せてください。AgentCart がショッピングエージェント向けの商品カードに変換します。",
    "hero.primary": "リンクを登録",
    "hero.secondary": "スキルを送る",
    "seller.kicker": "販売者・クリエイター向け",
    "seller.title": "手で登録しても、エージェントに任せても。",
    "seller.body":
      "Coupang、Amazon、SmartStore、AliExpress、自社ストアのリンクを追加できます。Codex、Claude、OpenClaw に提出を頼むこともできます。",
    "seller.inputLabel": "商品またはアフィリエイトリンク",
    "seller.inputPlaceholder": "https://example.com/product",
    "seller.packButton": "パック",
    "seller.formNote": "プレビュー: レビュー可能な AgentCart 商品カードが作成されます。",
    "seller.empty": "まず商品リンクを貼ってください。エージェントにはたどる道が必要です。",
    "seller.queued": "パック完了: AgentCart 商品カードがレビュー待ちになりました。",
    "seller.commandLabel": "販売者エージェント用コマンド",
    "seller.command":
      "Read https://agentcart.dev/seller-skill.md\nand register this product link for AgentCart.",
    "seller.commandHelp":
      "Codex、Claude、OpenClaw、または skill URL を読める任意のエージェントで使えます。",
    "login.prompt": "すでに登録したものがありますか？",
    "login.copy": "CLI ログインをコピー",
    "login.copied": "CLI ログインをコピーしました",
    "login.fallback": "このコマンドを手動でコピーしてください",
    "buyer.kicker": "購入者向け",
    "buyer.title": "ショッピングエージェントを AgentCart へ。",
    "buyer.body":
      "アプリストアは不要です。エージェントに一文渡すだけで、文脈を質問し、リンクを確認し、購入 URL を開く前に待機します。",
    "buyer.command":
      "Read https://agentcart.dev/skill.md\nand use AgentCart whenever I ask what to buy.",
    "buyer.copy": "エージェント用にコピー",
    "buyer.copied": "エージェント用にコピーしました",
    "buyer.fallback": "テキストを手動でコピーしてください",
    "demo.kicker": "デモ動画",
    "demo.title": "エージェントが買い物上手になる瞬間を見せる。",
    "demo.body":
      "ここには短い動画が合います。購入者がギフトを相談し、エージェントがひとつ質問し、AgentCart がリンクを確認し、購入者が購入経路を承認します。",
    "demo.cardLabel": "40 秒デモ",
    "demo.cardBody": "購入者が聞く。エージェントが確認する。承認後だけカートを開く。",
  },
};

let currentLanguage = "en";

function t(key) {
  return translations[currentLanguage]?.[key] ?? translations.en[key] ?? key;
}

function applyLanguage(language) {
  currentLanguage = translations[language] ? language : "en";
  document.documentElement.lang = currentLanguage;
  window.localStorage.setItem("agentcart-language", currentLanguage);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    element.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    element.setAttribute("placeholder", t(key));
  });

  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.lang === currentLanguage));
  });
}

function getInitialLanguage() {
  const saved = window.localStorage.getItem("agentcart-language");
  if (saved && translations[saved]) {
    return saved;
  }

  const browserLanguage = navigator.language.toLowerCase();
  if (browserLanguage.startsWith("ko")) return "ko";
  if (browserLanguage.startsWith("zh")) return "zh";
  if (browserLanguage.startsWith("ja")) return "ja";
  return "en";
}

async function copyText(button, text, copiedKey, fallbackKey, resetKey) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = t(copiedKey);
  } catch {
    button.textContent = t(fallbackKey);
  }

  window.setTimeout(() => {
    button.textContent = t(resetKey);
  }, 2200);
}

linkForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const value = linkInput.value.trim();
  if (!value) {
    linkResult.textContent = t("seller.empty");
    linkInput.focus();
    return;
  }

  linkResult.textContent = t("seller.queued");
});

copySkillButton?.addEventListener("click", async () => {
  const text = skillCommand.textContent.trim();
  copyText(copySkillButton, text, "buyer.copied", "buyer.fallback", "buyer.copy");
});

copyLoginButton?.addEventListener("click", async () => {
  const text = cliLoginCommand.textContent.trim();
  copyText(copyLoginButton, text, "login.copied", "login.fallback", "login.copy");
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.lang);
  });
});

applyLanguage(getInitialLanguage());
