const linkForm = document.querySelector("#link-form");
const linkInput = document.querySelector("#product-link");
const linkResult = document.querySelector("#link-result");
const copySkillButton = document.querySelector("#copy-skill");
const copyLoginButton = document.querySelector("#copy-login");
const copyInstallButton = document.querySelector("#copy-install");
const skillCommand = document.querySelector("#skill-command");
const cliLoginCommand = document.querySelector("#cli-login-command");
const installCommand = document.querySelector("#install-command");
const languageButtons = document.querySelectorAll("[data-lang]");

const translations = {
  en: {
    "nav.install": "Install",
    "nav.register": "Register",
    "nav.skill": "Protocol",
    "nav.demo": "Demo",
    "nav.login": "Login",
    "hero.kicker": "Agent-native commerce context layer",
    "hero.title1": "Make shopping links",
    "hero.title2": "readable by AI agents.",
    "hero.subtitle":
      "AgentCart packages curator personas, campaign rules, disclosures, and product cards so brands, creators, and merchants can ship context an agent can actually use.",
    "hero.primary": "Install the skill",
    "hero.secondary": "See the persona flow",
    "install.kicker": "Install AgentCart",
    "install.title": "Turn links into agent-readable product cards.",
    "install.body":
      "AgentCart's frontend is the agent chat. Install the skill, run the registry API, and let Claude, Codex, or OpenClaw recommend with disclosure, fit rules, and approval gates.",
    "install.command": "npm run agentcart -- install-skill --target codex",
    "install.copy": "Copy install command",
    "install.copied": "Install command copied",
    "install.fallback": "Copy this command manually",
    "seller.kicker": "For brands, creators, and merchants",
    "seller.title": "Package your link with the context agents need.",
    "seller.body":
      "Add a product link, disclosure, target customer, fit notes, and price context. Or let Codex, Claude, or OpenClaw draft the card for you.",
    "seller.inputLabel": "Product or affiliate link",
    "seller.inputPlaceholder": "https://example.com/product",
    "seller.packButton": "Draft card",
    "seller.formNote": "Preview: an agent-readable product card will be created.",
    "seller.empty": "Paste a product link first. Your agent needs a trail to follow.",
    "seller.queued": "Draft queued: your AgentCart product card is ready for review.",
    "seller.commandLabel": "Seller agent command",
    "seller.command":
      'npm run agentcart -- submit --title "Product title" --url "https://example.com/product" --curator your_handle --category "category" --best-for "who it helps" --not-for "who should skip" --note "why it is worth recommending"',
    "seller.commandHelp":
      "Runs locally through the checked-in AgentCart CLI submit flow.",
    "login.prompt": "Already have a persona?",
    "login.copy": "Copy CLI login",
    "login.copied": "CLI login copied",
    "login.fallback": "Copy this command manually",
    "buyer.kicker": "For buyers",
    "buyer.title": "Let your agent read the context before it shops.",
    "buyer.body":
      "AgentCart gives shopping agents a protocol: ask for context, compare options, explain tradeoffs, disclose incentives, and wait for approval before opening a purchase link.",
    "buyer.command":
      "Run npm run agentcart -- install-skill --target codex\nthen read .agentcart/skills/agentcart-codex.md and use AgentCart whenever I ask what to buy.",
    "buyer.copy": "Copy for my agent",
    "buyer.copied": "Copied for your agent",
    "buyer.fallback": "Copy this text manually",
    "demo.kicker": "Demo film",
    "demo.title": "Show the moment an agent shops with context.",
    "demo.body":
      "Watch the core loop: a buyer asks in chat, AgentCart returns three disclosed recommendations with fit notes, and the agent waits for approval before opening a purchase path.",
    "demo.cardLabel": "40 sec demo",
    "demo.cardBody": "Buyer asks. Agent checks. Cart opens only when approved.",
    "demo.chatUser": "Recommend a leather wallet under 100,000 won with AgentCart.",
    "demo.chatAgent":
      "First I will show the disclosure, then recommend only three options that fit your context and budget.",
  },
  ko: {
    "nav.install": "설치",
    "nav.register": "등록",
    "nav.skill": "프로토콜",
    "nav.demo": "데모",
    "nav.login": "로그인",
    "hero.kicker": "에이전트 네이티브 커머스 컨텍스트 레이어",
    "hero.title1": "쇼핑 링크를",
    "hero.title2": "AI 에이전트가 읽게 하세요.",
    "hero.subtitle":
      "AgentCart는 큐레이터 페르소나, 캠페인 규칙, 고지, 상품 카드를 묶어 브랜드·크리에이터·머천트가 에이전트가 실제로 쓸 수 있는 맥락을 전달하게 합니다.",
    "hero.primary": "스킬 설치하기",
    "hero.secondary": "페르소나 흐름 보기",
    "install.kicker": "AgentCart 설치",
    "install.title": "링크를 에이전트가 읽는 상품 카드로 바꾸세요.",
    "install.body":
      "AgentCart의 프론트엔드는 에이전트 채팅입니다. 스킬을 설치하고 레지스트리 API를 실행하면 Claude, Codex, OpenClaw가 고지, 적합도 규칙, 승인 게이트를 포함해 추천할 수 있습니다.",
    "install.command": "npm run agentcart -- install-skill --target codex",
    "install.copy": "설치 명령 복사",
    "install.copied": "설치 명령 복사됨",
    "install.fallback": "명령어를 직접 복사하세요",
    "seller.kicker": "브랜드·크리에이터·머천트용",
    "seller.title": "에이전트가 필요한 맥락까지 함께 패키징하세요.",
    "seller.body":
      "상품 링크, 고지, 추천 대상, 적합도 메모, 가격 맥락을 함께 제공합니다. Codex, Claude, OpenClaw에게 초안 작성을 맡길 수도 있습니다.",
    "seller.inputLabel": "상품 또는 제휴 링크",
    "seller.inputPlaceholder": "https://example.com/product",
    "seller.packButton": "카드 초안",
    "seller.formNote": "미리보기: 에이전트가 읽을 수 있는 상품 카드가 만들어집니다.",
    "seller.empty": "먼저 상품 링크를 붙여넣어 주세요. 에이전트에게 따라갈 길이 필요해요.",
    "seller.queued": "초안 완료: AgentCart 상품 카드가 검토 대기열에 들어갔습니다.",
    "seller.commandLabel": "판매자 에이전트 명령",
    "seller.command":
      'npm run agentcart -- submit --title "상품명" --url "https://example.com/product" --curator your_handle --category "category" --best-for "추천 대상" --not-for "비추천 대상" --note "추천 이유"',
    "seller.commandHelp":
      "체크인된 AgentCart CLI submit 흐름으로 로컬에서 실행됩니다.",
    "login.prompt": "이미 페르소나가 있나요?",
    "login.copy": "CLI 로그인 복사",
    "login.copied": "CLI 로그인 복사됨",
    "login.fallback": "명령어를 직접 복사하세요",
    "buyer.kicker": "구매자용",
    "buyer.title": "에이전트가 쇼핑 전에 맥락을 읽게 하세요.",
    "buyer.body":
      "AgentCart는 쇼핑 에이전트에게 프로토콜을 제공합니다. 맥락을 묻고, 후보를 비교하고, 이유를 설명하고, 이해관계를 고지한 뒤 승인 후에만 구매 링크를 엽니다.",
    "buyer.command":
      "npm run agentcart -- install-skill --target codex 를 실행한 뒤\n.agentcart/skills/agentcart-codex.md 를 읽고 내가 무엇을 살지 물어보면 AgentCart를 사용해줘.",
    "buyer.copy": "내 에이전트용 복사",
    "buyer.copied": "에이전트용으로 복사됨",
    "buyer.fallback": "텍스트를 직접 복사하세요",
    "demo.kicker": "데모 영상",
    "demo.title": "에이전트가 맥락을 읽고 쇼핑하는 순간을 보여주세요.",
    "demo.body":
      "핵심 흐름을 확인하세요. 구매자가 채팅으로 묻고, AgentCart가 적합도 메모가 포함된 고지된 추천 3개를 반환하며, 에이전트는 구매 경로를 열기 전에 승인을 기다립니다.",
    "demo.cardLabel": "40초 데모",
    "demo.cardBody": "구매자가 묻고, 에이전트가 확인하고, 승인 후에만 카트가 열립니다.",
    "demo.chatUser": "AgentCart로 10만원 이하 가죽지갑 추천해줘.",
    "demo.chatAgent": "먼저 고지를 표시하고, 맥락과 예산에 맞는 3개만 추천할게요.",
  },
  zh: {
    "nav.install": "安装",
    "nav.register": "注册链接",
    "nav.skill": "智能体技能",
    "nav.demo": "演示",
    "nav.login": "登录",
    "hero.kicker": "面向购物智能体的开源技能安装",
    "hero.title1": "安装",
    "hero.title2": "购物技能。",
    "hero.subtitle":
      "AgentCart 是面向 AI 智能体的佣金链接购物协议。安装技能后，你的智能体可以在披露、策展上下文和批准流程下推荐商品。",
    "hero.primary": "安装技能",
    "hero.secondary": "注册链接",
    "install.kicker": "安装 AgentCart",
    "install.title": "把佣金链接推荐放进你的智能体聊天。",
    "install.body":
      "AgentCart 的前端就是智能体聊天。安装技能，运行 registry API，让 Claude、Codex 或 OpenClaw 在披露和策展上下文下进行推荐。",
    "install.command": "npm run agentcart -- install-skill --target codex",
    "install.copy": "复制安装命令",
    "install.copied": "已复制安装命令",
    "install.fallback": "请手动复制此命令",
    "seller.kicker": "面向卖家和创作者",
    "seller.title": "不只是链接，还要给智能体足够的说明。",
    "seller.body":
      "提供商品链接、联盟披露、目标用户、卖点、注意事项和价格快照。也可以让 Codex、Claude 或 OpenClaw 帮你打包。",
    "seller.inputLabel": "商品或联盟链接",
    "seller.inputPlaceholder": "https://example.com/product",
    "seller.packButton": "打包",
    "seller.formNote": "预览：将创建一个可审核的 AgentCart 商品卡。",
    "seller.empty": "请先粘贴商品链接。你的智能体需要一条可跟踪的线索。",
    "seller.queued": "已打包：AgentCart 商品卡已进入审核队列。",
    "seller.commandLabel": "卖家智能体命令",
    "seller.command":
      'npm run agentcart -- submit --title "Product title" --url "https://example.com/product" --curator your_handle --category "category" --best-for "who it helps" --not-for "who should skip" --note "why it is worth recommending"',
    "seller.commandHelp":
      "通过仓库内的 AgentCart CLI submit 流程在本地运行。",
    "login.prompt": "已经注册过内容？",
    "login.copy": "复制 CLI 登录",
    "login.copied": "已复制 CLI 登录",
    "login.fallback": "请手动复制此命令",
    "buyer.kicker": "面向买家",
    "buyer.title": "让你的智能体按照购买协议来推荐。",
    "buyer.body":
      "AgentCart 为购物智能体提供流程：追问上下文、比较选项、解释取舍、披露激励，并在获得批准后才打开购买链接。",
    "buyer.command":
      "Run npm run agentcart -- install-skill --target codex\nthen read .agentcart/skills/agentcart-codex.md and use AgentCart whenever I ask what to buy.",
    "buyer.copy": "复制给我的智能体",
    "buyer.copied": "已复制给你的智能体",
    "buyer.fallback": "请手动复制文本",
    "demo.kicker": "演示视频",
    "demo.title": "展示智能体更会购物的瞬间。",
    "demo.body":
      "查看核心流程：买家在聊天中提问，AgentCart 返回 3 个已披露的推荐，智能体在打开购买路径前等待批准。",
    "demo.cardLabel": "40 秒演示",
    "demo.cardBody": "买家提问。智能体检查。只有批准后才打开购物车。",
    "demo.chatUser": "请用 AgentCart 推荐 10 万韩元以内的皮革钱包。",
    "demo.chatAgent": "我会先显示佣金链接披露，然后只推荐 3 个符合你上下文的选项。",
  },
  ja: {
    "nav.install": "インストール",
    "nav.register": "登録",
    "nav.skill": "エージェントスキル",
    "nav.demo": "デモ",
    "nav.login": "ログイン",
    "hero.kicker": "ショッピングエージェント向けのオープンソーススキル",
    "hero.title1": "ショッピングスキルを",
    "hero.title2": "インストール。",
    "hero.subtitle":
      "AgentCart は AI エージェントのためのコミッションリンク型ショッピングプロトコルです。スキルを入れると、エージェントは開示、キュレーター文脈、承認を含めて推薦できます。",
    "hero.primary": "スキルをインストール",
    "hero.secondary": "リンクを登録",
    "install.kicker": "AgentCart をインストール",
    "install.title": "コミッションリンク推薦をエージェントチャットの中へ。",
    "install.body":
      "AgentCart のフロントエンドはエージェントチャットです。スキルをインストールし、registry API を動かすことで、Claude、Codex、OpenClaw が開示とキュレーター文脈を含めて推薦できます。",
    "install.command": "npm run agentcart -- install-skill --target codex",
    "install.copy": "インストールコマンドをコピー",
    "install.copied": "インストールコマンドをコピーしました",
    "install.fallback": "このコマンドを手動でコピーしてください",
    "seller.kicker": "販売者・クリエイター向け",
    "seller.title": "リンクだけでなく、エージェントが理解できる説明も。",
    "seller.body":
      "商品リンク、アフィリエイト開示、対象顧客、利点、注意点、価格スナップショットを提供します。Codex、Claude、OpenClaw にパッケージ化を任せることもできます。",
    "seller.inputLabel": "商品またはアフィリエイトリンク",
    "seller.inputPlaceholder": "https://example.com/product",
    "seller.packButton": "パック",
    "seller.formNote": "プレビュー: レビュー可能な AgentCart 商品カードが作成されます。",
    "seller.empty": "まず商品リンクを貼ってください。エージェントにはたどる道が必要です。",
    "seller.queued": "パック完了: AgentCart 商品カードがレビュー待ちになりました。",
    "seller.commandLabel": "販売者エージェント用コマンド",
    "seller.command":
      'npm run agentcart -- submit --title "Product title" --url "https://example.com/product" --curator your_handle --category "category" --best-for "who it helps" --not-for "who should skip" --note "why it is worth recommending"',
    "seller.commandHelp":
      "チェックイン済みの AgentCart CLI submit フローでローカル実行します。",
    "login.prompt": "すでに登録したものがありますか？",
    "login.copy": "CLI ログインをコピー",
    "login.copied": "CLI ログインをコピーしました",
    "login.fallback": "このコマンドを手動でコピーしてください",
    "buyer.kicker": "購入者向け",
    "buyer.title": "エージェントに購入プロトコルで推薦させる。",
    "buyer.body":
      "AgentCart はショッピングエージェントに手順を与えます。文脈を聞き、候補を比較し、理由と利害関係を説明し、承認後にだけ購入リンクを開きます。",
    "buyer.command":
      "Run npm run agentcart -- install-skill --target codex\nthen read .agentcart/skills/agentcart-codex.md and use AgentCart whenever I ask what to buy.",
    "buyer.copy": "エージェント用にコピー",
    "buyer.copied": "エージェント用にコピーしました",
    "buyer.fallback": "テキストを手動でコピーしてください",
    "demo.kicker": "デモ動画",
    "demo.title": "エージェントが買い物上手になる瞬間を見せる。",
    "demo.body":
      "中核の流れを見てください。購入者がチャットで相談し、AgentCart が開示付きの推薦を 3 つ返し、エージェントは購入経路を開く前に承認を待ちます。",
    "demo.cardLabel": "40 秒デモ",
    "demo.cardBody": "購入者が聞く。エージェントが確認する。承認後だけカートを開く。",
    "demo.chatUser": "AgentCartで10万ウォン以下の革財布をおすすめして。",
    "demo.chatAgent": "まずコミッションリンクの開示を表示し、文脈に合う3つだけを推薦します。",
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

copyInstallButton?.addEventListener("click", async () => {
  const text = installCommand.textContent.trim();
  copyText(copyInstallButton, text, "install.copied", "install.fallback", "install.copy");
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.lang);
  });
});

applyLanguage(getInitialLanguage());
