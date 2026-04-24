const linkForm = document.querySelector("#link-form");
const linkInput = document.querySelector("#product-link");
const linkResult = document.querySelector("#link-result");
const copyButton = document.querySelector("#copy-skill");
const skillCommand = document.querySelector("#skill-command");

linkForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const value = linkInput.value.trim();
  if (!value) {
    linkResult.textContent = "Paste a product link first. Your agent needs a trail to follow.";
    linkInput.focus();
    return;
  }

  linkResult.textContent =
    "Packed preview queued: link safety, disclosure, and price snapshot will be reviewed.";
});

copyButton?.addEventListener("click", async () => {
  const text = skillCommand.textContent.trim();

  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "Copied for your agent";
  } catch {
    copyButton.textContent = "Copy this text manually";
  }

  window.setTimeout(() => {
    copyButton.textContent = "Copy for my agent";
  }, 2200);
});
