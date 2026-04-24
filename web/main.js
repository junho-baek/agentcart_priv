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
    "nav.skill": "Agent skill",
    "nav.demo": "Demo",
    "nav.login": "Login",
    "hero.kicker": "Open-source skill install for shopping agents",
    "hero.title1": "Install the",
    "hero.title2": "shopping skill.",
    "hero.subtitle":
      "AgentCart is the commission-link shopping protocol for AI agents. Install the skill so your agent can recommend with disclosure, curator context, and approval before any purchase path opens.",
    "hero.primary": "Install the skill",
    "hero.secondary": "Register a link",
    "install.kicker": "Install AgentCart",
    "install.title": "Put commission-link recommendations inside your agent chat.",
    "install.body":
      "AgentCart's frontend is the agent chat. Install the skill, run the registry API, and let Claude, Codex, or OpenClaw recommend with disclosure and curator context.",
    "install.command": "npm run agentcart -- install-skill --target codex",
    "install.copy": "Copy install command",
    "install.copied": "Install command copied",
    "install.fallback": "Copy this command manually",
    "seller.kicker": "For sellers and creators",
    "seller.title": "Provide your link with the story agents need.",
    "seller.body":
      "Add a product link, affiliate disclosure, target customer, benefits, cautions, and price snapshot. Or tell Codex, Claude, or OpenClaw to package it for you.",
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
    "buyer.title": "Let your agent recommend through a buying protocol.",
    "buyer.body":
      "AgentCart gives shopping agents a process: ask context, compare options, explain the tradeoffs, disclose incentives, and wait for approval before opening a purchase link.",
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
    "demo.chatUser": "Recommend a leather wallet under 100,000 won with AgentCart.",
    "demo.chatAgent":
      "First I will show the commission-link disclosure, then recommend only three options that fit your context.",
  },
  ko: {
    "nav.install": "설치",
    "nav.register": "등록",
    "nav.skill": "에이전트 스킬",
    "nav.demo": "데모",
    "nav.login": "로그인",
    "hero.kicker": "쇼핑 에이전트를 위한 오픈소스 스킬 설치",
    "hero.title1": "쇼핑 스킬을",
    "hero.title2": "에이전트에 설치.",
    "hero.subtitle":
      "AgentCart는 AI 에이전트를 위한 커미션 링크 쇼핑 프로토콜입니다. 스킬을 설치하면 에이전트가 고지, 큐레이터 맥락, 승인 흐름을 갖춰 추천합니다.",
    "hero.primary": "스킬 설치하기",
    "hero.secondary": "링크 등록하기",
    "install.kicker": "AgentCart 설치",
    "install.title": "커미션 링크 추천을 에이전트 채팅 안으로 가져오세요.",
    "install.body":
      "AgentCart의 프론트엔드는 에이전트 채팅입니다. 스킬을 설치하고 레지스트리 API를 실행하면 Claude, Codex, OpenClaw가 고지와 큐레이터 맥락을 포함해 추천할 수 있습니다.",
    "install.command": "npm run agentcart -- install-skill --target codex",
    "install.copy": "설치 명령 복사",
    "install.copied": "설치 명령 복사됨",
    "install.fallback": "명령어를 직접 복사하세요",
    "seller.kicker": "판매자와 크리에이터용",
    "seller.title": "링크만이 아니라, 에이전트가 이해할 설명까지.",
    "seller.body":
      "상품 링크, 제휴 고지, 추천 대상, 장점, 주의사항, 가격 스냅샷을 함께 제공합니다. Codex, Claude, OpenClaw에게 패키징을 맡길 수도 있습니다.",
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
    "buyer.title": "에이전트가 구매 프로토콜을 따라 추천하게 하세요.",
    "buyer.body":
      "AgentCart는 쇼핑 에이전트에게 절차를 제공합니다. 맥락을 묻고, 후보를 비교하고, 이유와 이해관계를 설명하고, 승인 후에만 구매 링크를 엽니다.",
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
    "demo.chatUser": "AgentCart로 10만원 이하 가죽지갑 추천해줘.",
    "demo.chatAgent": "먼저 커미션 링크 고지를 표시하고, 맥락에 맞는 3개만 추천할게요.",
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
      "Read https://agentcart.dev/seller-skill.md\nand register this product link for AgentCart.",
    "seller.commandHelp":
      "可用于 Codex、Claude、OpenClaw，或任何能读取 skill URL 的智能体。",
    "login.prompt": "已经注册过内容？",
    "login.copy": "复制 CLI 登录",
    "login.copied": "已复制 CLI 登录",
    "login.fallback": "请手动复制此命令",
    "buyer.kicker": "面向买家",
    "buyer.title": "让你的智能体按照购买协议来推荐。",
    "buyer.body":
      "AgentCart 为购物智能体提供流程：追问上下文、比较选项、解释取舍、披露激励，并在获得批准后才打开购买链接。",
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
      "Read https://agentcart.dev/seller-skill.md\nand register this product link for AgentCart.",
    "seller.commandHelp":
      "Codex、Claude、OpenClaw、または skill URL を読める任意のエージェントで使えます。",
    "login.prompt": "すでに登録したものがありますか？",
    "login.copy": "CLI ログインをコピー",
    "login.copied": "CLI ログインをコピーしました",
    "login.fallback": "このコマンドを手動でコピーしてください",
    "buyer.kicker": "購入者向け",
    "buyer.title": "エージェントに購入プロトコルで推薦させる。",
    "buyer.body":
      "AgentCart はショッピングエージェントに手順を与えます。文脈を聞き、候補を比較し、理由と利害関係を説明し、承認後にだけ購入リンクを開きます。",
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
