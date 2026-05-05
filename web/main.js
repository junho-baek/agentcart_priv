const tryForm = document.querySelector("#try-form");
const linkInput = document.querySelector("#product-link");
const tryResult = document.querySelector("#try-result");
const copyInstallButton = document.querySelector("#copy-install");
const copyDemoButton = document.querySelector("#copy-demo");
const installCommand = document.querySelector("#install-command");
const demoCommand = document.querySelector("#demo-command");
const languageButtons = document.querySelectorAll("[data-lang]");

const translations = {
  en: {
    "nav.install": "Install",
    "nav.personas": "Use cases",
    "nav.reports": "Reports",
    "nav.demo": "Demo",
    "hero.kicker": "Agent skill / commerce context",
    "hero.title1": "Give shopping links",
    "hero.title2": "a skill your agents can call.",
    "hero.subtitle":
      "Disclosure, fit notes, and approval gates in one calm layer.",
    "hero.primary": "Install the skill",
    "hero.secondary": "See the flow",
    "hero.pill1": "Brands",
    "hero.pill2": "Creators",
    "hero.pill3": "Merchants",
    "hero.mascotTag": "Cute, but callable.",
    "hero.mascotLine": "The shopping layer agents actually want.",
    "hero.flow1": "install",
    "hero.flow2": "draft",
    "hero.flow3": "approve",
    "install.kicker": "Start with one command",
    "install.title": "Install the skill, then keep the flow readable.",
    "install.body":
      "One command. One link. One draft the agent can use.",
    "install.commandLabel": "Install command",
    "install.command": "npm run agentcart -- install-skill --target codex",
    "install.copy": "Copy install command",
    "install.copied": "Install command copied",
    "install.fallback": "Copy this command manually",
    "try.inputLabel": "Paste a product or affiliate link",
    "try.inputPlaceholder": "https://example.com/product",
    "try.action": "Draft card",
    "try.note": "Preview: an agent-readable card is ready to draft.",
    "try.empty": "Paste a product link first. Your agent needs a trail to follow.",
    "try.queued": "Draft queued: the agent-readable card is ready for review.",
    "personas.kicker": "Who this is for",
    "personas.title": "Make the agent feel useful before it feels clever.",
    "personas.body":
      "Different audiences need a slightly different kind of context. The landing should make that obvious in one glance.",
    "brand.tag": "Brand",
    "brand.title": "Campaign rules + disclosure.",
    "brand.body":
      "Keep approvals, messaging, and incentives together.",
    "brand.hint": "Clean campaign brief.",
    "creator.tag": "Creator",
    "creator.title": "Taste and boundaries.",
    "creator.body":
      "Sound like you, but stay honest about fit.",
    "creator.hint": "Persona with boundaries.",
    "merchant.tag": "Merchant",
    "merchant.title": "Catalog context that matches better.",
    "merchant.body":
      "Give price, category, and product detail.",
    "merchant.hint": "Product structure, not fluff.",
    "reports.kicker": "For suppliers",
    "reports.title": "See what converts, not just what clicks.",
    "reports.body": "Agents can return conversion, campaign lift, and next-action notes in one report.",
    "reports.overview.tag": "Overview",
    "reports.overview.title": "Conversion at a glance.",
    "reports.overview.body": "Clicks, purchases, approval rate, and top referrers in one snapshot.",
    "reports.overview.hint": "Daily pulse.",
    "reports.campaign.tag": "Campaign",
    "reports.campaign.title": "Which message actually moved intent.",
    "reports.campaign.body": "Compare hooks, product cards, and creator prompts side by side.",
    "reports.campaign.hint": "Campaign pulse.",
    "reports.summary.tag": "Agent summary",
    "reports.summary.title": "Next steps in plain language.",
    "reports.summary.body": "The agent explains what to keep, what to cut, and what to test next.",
    "reports.summary.hint": "Ready for the next round.",
    "demo.kicker": "Show the moment it clicks",
    "demo.title": "Make it feel like an agent skill, not a brochure.",
    "demo.body": "Short chat, one command, and approval before purchase.",
    "demo.chatLabel": "Chat preview",
    "demo.chatUser":
      "Recommend a leather wallet under 100,000 won with AgentCart.",
    "demo.chatAgent":
      "I’ll show disclosure first, then three options that fit your context and budget.",
    "demo.commandLabel": "Agent skill command",
    "demo.command":
      'npm run agentcart -- submit --title "Product title" --url "https://example.com/product" --best-for "who it helps" --note "why it is worth recommending"',
    "demo.copy": "Copy for my agent",
    "demo.copied": "Copied for your agent",
    "demo.fallback": "Copy this command manually",
    "demo.flow1": "disclose",
    "demo.flow2": "compare",
    "demo.flow3": "approve",
  },
  ko: {
    "nav.install": "설치",
    "nav.personas": "사용 사례",
    "nav.reports": "리포트",
    "nav.demo": "데모",
    "hero.kicker": "에이전트 스킬 / 커머스 컨텍스트",
    "hero.title1": "쇼핑 링크를",
    "hero.title2": "에이전트가 부를 스킬로 바꾸세요.",
    "hero.subtitle":
      "AgentCart는 고지, 적합도 메모, 승인 게이트를 차분하게 묶어 브랜드·크리에이터·머천트가 지저분한 링크 대신 맥락을 전달하게 합니다.",
    "hero.primary": "스킬 설치하기",
    "hero.secondary": "흐름 보기",
    "hero.pill1": "브랜드",
    "hero.pill2": "크리에이터",
    "hero.pill3": "머천트",
    "hero.mascotTag": "귀엽지만, 호출 가능.",
    "hero.mascotLine": "에이전트가 실제로 원하던 쇼핑 레이어.",
    "hero.flow1": "설치",
    "hero.flow2": "초안",
    "hero.flow3": "승인",
    "install.kicker": "한 줄 명령부터",
    "install.title": "스킬을 설치하고, 흐름은 읽기 쉽게 유지하세요.",
    "install.body":
      "중요한 건 단순합니다. 설치 명령 하나, 링크 입력 하나, 그리고 에이전트가 바로 행동할 수 있는 결과 하나면 충분합니다.",
    "install.commandLabel": "설치 명령",
    "install.command": "npm run agentcart -- install-skill --target codex",
    "install.copy": "설치 명령 복사",
    "install.copied": "설치 명령 복사됨",
    "install.fallback": "명령어를 직접 복사하세요",
    "try.inputLabel": "상품 또는 제휴 링크 붙여넣기",
    "try.inputPlaceholder": "https://example.com/product",
    "try.action": "카드 초안",
    "try.note": "미리보기: 에이전트가 읽을 수 있는 카드 초안이 준비됩니다.",
    "try.empty": "먼저 상품 링크를 붙여넣어 주세요. 에이전트에게 따라갈 길이 필요해요.",
    "try.queued": "초안 대기: 에이전트가 읽을 수 있는 카드가 검토 대기열에 들어갔습니다.",
    "personas.kicker": "누구를 위한가",
    "personas.title": "에이전트가 똑똑해 보이기 전에, 먼저 쓸모 있어 보여야 합니다.",
    "personas.body":
      "각 대상은 필요한 맥락이 조금씩 다릅니다. 랜딩은 그 차이를 한눈에 보이게 해야 합니다.",
    "brand.tag": "브랜드",
    "brand.title": "캠페인 규칙과 고지를 한 번에.",
    "brand.body":
      "승인, 메시지, 인센티브를 존중하는 추천 레이어를 배포하세요.",
    "brand.hint": "깔끔한 캠페인 브리프가 필요할 때 가장 잘 맞습니다.",
    "creator.tag": "크리에이터",
    "creator.title": "취향, audience, 그리고 추천하지 말아야 할 것.",
    "creator.body":
      "적합도와 스폰서십을 솔직하게 유지하면서도 에이전트가 당신처럼 말하게 하세요.",
    "creator.hint": "경계가 있는 페르소나가 필요할 때 가장 잘 맞습니다.",
    "merchant.tag": "머천트",
    "merchant.title": "더 좋은 매칭으로 바뀌는 카탈로그 맥락.",
    "merchant.body":
      "가격, 카테고리, 상품 상세를 줘서 에이전트가 자신 있게 추천하도록 하세요.",
    "merchant.hint": "허울보다 상품 구조가 필요할 때 가장 잘 맞습니다.",
    "reports.kicker": "공급자용",
    "reports.title": "클릭이 아니라 전환을 보세요.",
    "reports.body": "에이전트가 전환, 캠페인 상승폭, 다음 액션을 한 번에 리포트해줍니다.",
    "reports.overview.tag": "개요",
    "reports.overview.title": "전환을 한눈에.",
    "reports.overview.body": "클릭, 구매, 승인율, 주요 유입처를 한 장에서 봅니다.",
    "reports.overview.hint": "데일리 펄스.",
    "reports.campaign.tag": "캠페인",
    "reports.campaign.title": "어떤 메시지가 진짜 먹혔는지.",
    "reports.campaign.body": "훅, 상품 카드, 크리에이터 프롬프트를 나란히 비교합니다.",
    "reports.campaign.hint": "캠페인 펄스.",
    "reports.summary.tag": "에이전트 요약",
    "reports.summary.title": "다음 액션을 쉬운 말로.",
    "reports.summary.body": "에이전트가 무엇을 유지하고, 무엇을 줄이고, 무엇을 다음에 실험할지 설명합니다.",
    "reports.summary.hint": "다음 라운드 준비.",
    "demo.kicker": "이 순간이 중요합니다",
    "demo.title": "이 페이지를 보면, ‘아 이건 에이전트 스킬로 써야겠다’가 떠올라야 합니다.",
    "demo.body":
      "증거는 짧고 또렷해야 합니다. 짧은 채팅, 한 줄 명령, 그리고 구매 전 승인 대기라는 약속이면 충분합니다.",
    "demo.chatLabel": "채팅 미리보기",
    "demo.chatUser": "AgentCart로 10만원 이하 가죽지갑 추천해줘.",
    "demo.chatAgent":
      "먼저 고지를 보여주고, 그다음 맥락과 예산에 맞는 3개만 추천할게요.",
    "demo.commandLabel": "에이전트 스킬 명령",
    "demo.command":
      'npm run agentcart -- submit --title "상품명" --url "https://example.com/product" --best-for "추천 대상" --note "추천 이유"',
    "demo.copy": "내 에이전트용 복사",
    "demo.copied": "에이전트용으로 복사됨",
    "demo.fallback": "명령어를 직접 복사하세요",
    "demo.flow1": "고지",
    "demo.flow2": "비교",
    "demo.flow3": "승인",
  },
  zh: {
    "nav.install": "安装",
    "nav.personas": "使用场景",
    "nav.reports": "报告",
    "nav.demo": "演示",
    "hero.kicker": "智能体技能 / 商务上下文",
    "hero.title1": "把购物链接",
    "hero.title2": "变成智能体可调用的技能。",
    "hero.subtitle":
      "AgentCart 将披露、适配说明和批准流程打包成安静、易读的一层，让品牌、创作者和商家传递真正可用的上下文。",
    "hero.primary": "安装技能",
    "hero.secondary": "查看流程",
    "hero.pill1": "品牌",
    "hero.pill2": "创作者",
    "hero.pill3": "商家",
    "hero.mascotTag": "可爱，但可调用。",
    "hero.mascotLine": "智能体真正想要的购物层。",
    "hero.flow1": "安装",
    "hero.flow2": "草稿",
    "hero.flow3": "批准",
    "install.kicker": "从一条命令开始",
    "install.title": "先安装技能，再让流程保持清晰。",
    "install.body":
      "最重要的部分很简单：一个安装命令、一个链接输入、一个智能体可以立即采取行动的结果。",
    "install.commandLabel": "安装命令",
    "install.command": "npm run agentcart -- install-skill --target codex",
    "install.copy": "复制安装命令",
    "install.copied": "安装命令已复制",
    "install.fallback": "请手动复制此命令",
    "try.inputLabel": "粘贴商品或联盟链接",
    "try.inputPlaceholder": "https://example.com/product",
    "try.action": "生成草稿",
    "try.note": "预览：一个可供智能体读取的卡片草稿已准备好。",
    "try.empty": "请先粘贴商品链接。你的智能体需要一条可跟踪的线索。",
    "try.queued": "草稿已排队：可供智能体读取的卡片正在等待审阅。",
    "personas.kicker": "适合谁",
    "personas.title": "在智能体看起来聪明之前，先让它看起来有用。",
    "personas.body":
      "不同受众需要的上下文略有不同。落地页应该一眼就把这件事讲明白。",
    "brand.tag": "品牌",
    "brand.title": "把活动规则和披露放在一起。",
    "brand.body": "发布一个尊重审批、信息表达和激励披露的推荐层。",
    "brand.hint": "当智能体需要清晰的活动简介时最合适。",
    "creator.tag": "创作者",
    "creator.title": "品味、受众，以及不要推荐什么。",
    "creator.body": "让智能体像你说话，同时对适配和赞助保持诚实。",
    "creator.hint": "当智能体需要有边界的人设时最合适。",
    "merchant.tag": "商家",
    "merchant.title": "能转化为更好匹配的目录上下文。",
    "merchant.body": "提供价格、类别和商品细节，让智能体更有信心地推荐。",
    "merchant.hint": "当智能体需要产品结构而不是空话时最合适。",
    "reports.kicker": "面向供应方",
    "reports.title": "看转化，不只看点击。",
    "reports.body": "智能体可以把转化、活动提升和下一步建议整合成一份报告。",
    "reports.overview.tag": "概览",
    "reports.overview.title": "一眼看懂转化。",
    "reports.overview.body": "点击、购买、批准率和主要来源汇总在一张卡片里。",
    "reports.overview.hint": "每日脉冲。",
    "reports.campaign.tag": "活动",
    "reports.campaign.title": "到底是哪条消息推动了意图。",
    "reports.campaign.body": "并排比较钩子、商品卡和创作者提示语。",
    "reports.campaign.hint": "活动脉冲。",
    "reports.summary.tag": "智能体总结",
    "reports.summary.title": "下一步用大白话说清。",
    "reports.summary.body": "智能体会说明保留什么、删掉什么，以及下一轮该测试什么。",
    "reports.summary.hint": "准备下一轮。",
    "demo.kicker": "展示它成立的那一刻",
    "demo.title": "这个页面应该让人想到：‘哦，这就该放进一个智能体技能里。’",
    "demo.body":
      "证明要小而清楚：一段简短对话、一条命令路径，以及智能体在购买前等待批准的承诺。",
    "demo.chatLabel": "聊天预览",
    "demo.chatUser": "请用 AgentCart 推荐 10 万韩元以内的皮革钱包。",
    "demo.chatAgent":
      "我会先显示披露，然后只推荐 3 个符合你的上下文和预算的选项。",
    "demo.commandLabel": "智能体技能命令",
    "demo.command":
      'npm run agentcart -- submit --title "Product title" --url "https://example.com/product" --best-for "who it helps" --note "why it is worth recommending"',
    "demo.copy": "复制给我的智能体",
    "demo.copied": "已复制给你的智能体",
    "demo.fallback": "请手动复制此命令",
    "demo.flow1": "披露",
    "demo.flow2": "比较",
    "demo.flow3": "批准",
  },
  ja: {
    "nav.install": "インストール",
    "nav.personas": "ユースケース",
    "nav.reports": "レポート",
    "nav.demo": "デモ",
    "hero.kicker": "エージェントスキル / 商取引の文脈",
    "hero.title1": "ショッピングリンクを",
    "hero.title2": "エージェントが呼べるスキルに。",
    "hero.subtitle":
      "AgentCart は、開示・適合メモ・承認フローを静かで読みやすい層にまとめ、ブランド、クリエイター、マーチャントがノイズではなく文脈を渡せるようにします。",
    "hero.primary": "スキルをインストール",
    "hero.secondary": "フローを見る",
    "hero.pill1": "ブランド",
    "hero.pill2": "クリエイター",
    "hero.pill3": "マーチャント",
    "hero.mascotTag": "かわいい、でも呼び出せる。",
    "hero.mascotLine": "エージェントが本当に欲しかったショッピング層。",
    "hero.flow1": "インストール",
    "hero.flow2": "下書き",
    "hero.flow3": "承認",
    "install.kicker": "まずは一つのコマンドから",
    "install.title": "スキルを入れて、流れは読みやすく保つ。",
    "install.body":
      "大事なのはシンプルです。インストールコマンド一つ、リンク入力一つ、そしてエージェントがすぐ動ける結果一つで十分です。",
    "install.commandLabel": "インストールコマンド",
    "install.command": "npm run agentcart -- install-skill --target codex",
    "install.copy": "インストールコマンドをコピー",
    "install.copied": "インストールコマンドをコピーしました",
    "install.fallback": "このコマンドを手動でコピーしてください",
    "try.inputLabel": "商品またはアフィリエイトリンクを貼る",
    "try.inputPlaceholder": "https://example.com/product",
    "try.action": "カードを下書き",
    "try.note": "プレビュー: エージェントが読めるカードの下書きが準備されます。",
    "try.empty": "まず商品リンクを貼ってください。エージェントにはたどる道が必要です。",
    "try.queued": "下書き待ち: エージェントが読めるカードがレビュー待ちです。",
    "personas.kicker": "誰向けか",
    "personas.title": "エージェントが賢く見える前に、まず役に立つように。",
    "personas.body":
      "受け手によって必要な文脈は少しずつ違います。ランディングはその違いを一目で示すべきです。",
    "brand.tag": "ブランド",
    "brand.title": "キャンペーンルールと開示を一箇所に。",
    "brand.body": "承認、メッセージ、インセンティブを尊重する推薦レイヤーを出しましょう。",
    "brand.hint": "きれいなキャンペーンブリーフが必要な時に最適です。",
    "creator.tag": "クリエイター",
    "creator.title": "好み、オーディエンス、そして薦めないもの。",
    "creator.body": "適合性やスポンサー情報に正直でありながら、あなたらしく話させましょう。",
    "creator.hint": "境界のあるペルソナが必要な時に最適です。",
    "merchant.tag": "マーチャント",
    "merchant.title": "より良い一致を生むカタログ文脈。",
    "merchant.body": "価格、カテゴリ、商品詳細を与えて、エージェントが自信を持って推薦できるように。",
    "merchant.hint": "空気感ではなく商品構造が必要な時に最適です。",
    "reports.kicker": "供給側向け",
    "reports.title": "クリックではなく、転換を見る。",
    "reports.body": "エージェントが転換、キャンペーンの伸び、次のアクションを一つのレポートにまとめます。",
    "reports.overview.tag": "概要",
    "reports.overview.title": "転換をひと目で。",
    "reports.overview.body": "クリック、購入、承認率、主要流入元を一枚で確認できます。",
    "reports.overview.hint": "日次の脈拍。",
    "reports.campaign.tag": "キャンペーン",
    "reports.campaign.title": "どのメッセージが本当に効いたか。",
    "reports.campaign.body": "フック、商品カード、クリエイタープロンプトを並べて比較します。",
    "reports.campaign.hint": "キャンペーンの脈拍。",
    "reports.summary.tag": "エージェント要約",
    "reports.summary.title": "次の一手を平易に。",
    "reports.summary.body": "何を残し、何を削り、次に何を試すかをエージェントが説明します。",
    "reports.summary.hint": "次のラウンドへ。",
    "demo.kicker": "伝わる瞬間を見せる",
    "demo.title": "このページを見た人が『あ、これはエージェントスキルに入れるべきだ』と思えるように。",
    "demo.body":
      "証拠は小さく、読みやすく。短いチャット、一つのコマンド、そして購入前に承認を待つ約束だけで十分です。",
    "demo.chatLabel": "チャットプレビュー",
    "demo.chatUser": "AgentCartで10万ウォン以下の革財布をおすすめして。",
    "demo.chatAgent":
      "まず開示を表示し、その後で文脈と予算に合う3つだけを推薦します。",
    "demo.commandLabel": "エージェントスキルコマンド",
    "demo.command":
      'npm run agentcart -- submit --title "Product title" --url "https://example.com/product" --best-for "who it helps" --note "why it is worth recommending"',
    "demo.copy": "自分のエージェント用にコピー",
    "demo.copied": "エージェント用にコピーしました",
    "demo.fallback": "このコマンドを手動でコピーしてください",
    "demo.flow1": "開示",
    "demo.flow2": "比較",
    "demo.flow3": "承認",
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

tryForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const value = linkInput.value.trim();
  if (!value) {
    tryResult.textContent = t("try.empty");
    linkInput.focus();
    return;
  }

  tryResult.textContent = t("try.queued");
});

copyInstallButton?.addEventListener("click", () => {
  copyText(copyInstallButton, installCommand.textContent.trim(), "install.copied", "install.fallback", "install.copy");
});

copyDemoButton?.addEventListener("click", () => {
  copyText(copyDemoButton, demoCommand.textContent.trim(), "demo.copied", "demo.fallback", "demo.copy");
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.lang);
  });
});

applyLanguage(getInitialLanguage());
