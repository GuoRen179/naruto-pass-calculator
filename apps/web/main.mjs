import {
  calculateCoinsFromLevel,
  calculateLevelPurchaseCoupons,
  calculateNinjaCoins,
  calculatePassLevelProgress,
  calculateRecommendedPlans,
  calculateRequiredSeasons,
  calculateSeasonCoins,
  calculateSecretScrollCoins,
  calculateTimeRemaining,
  calculateWeeksToAfford,
  hasExchangeEligibility,
  NINJAS,
  PASS_TYPES,
  SECRET_SCROLLS
} from "../../packages/core/src/index.mjs";

const appShell = document.querySelector("#app-shell");
const passTypeSelect = document.querySelector("#pass-type");
const extraLevelsInput = document.querySelector("#extra-levels");
const currentPassLevelInput = document.querySelector("#current-pass-level");
const currentPassExpInput = document.querySelector("#current-pass-exp");
const remainingWeeklyExpInput = document.querySelector("#remaining-weekly-exp");
const remainingActivityExpInput = document.querySelector("#remaining-activity-exp");
const coinSourceSelect = document.querySelector("#coin-source");
const currentCoinsInput = document.querySelector("#current-coins");
const seasonEndTimeInput = document.querySelector("#season-end-time");
const seasonCoinsNode = document.querySelector("#season-coins");
const levelCouponsNode = document.querySelector("#level-coupons");
const effectiveCurrentCoinsNode = document.querySelector("#effective-current-coins");
const levelCoinsNode = document.querySelector("#level-coins");
const nextWeekCoinsNode = document.querySelector("#next-week-coins");
const finalPassLevelNode = document.querySelector("#final-pass-level");
const seasonLeftTimeNode = document.querySelector("#season-left-time");
const seasonLeftWeeksNode = document.querySelector("#season-left-weeks");
const levelExpLabel = document.querySelector("#level-exp-label");
const levelExpBar = document.querySelector("#level-exp-bar");
const weeklyExpLabel = document.querySelector("#weekly-exp-label");
const weeklyExpBar = document.querySelector("#weekly-exp-bar");
const ninjaForm = document.querySelector("#ninja-form");
const scrollForm = document.querySelector("#scroll-form");
const ninjaIdInput = document.querySelector("#ninja-id");
const ninjaPicker = document.querySelector("#ninja-picker");
const scrollIdInput = document.querySelector("#scroll-id");
const scrollPicker = document.querySelector("#scroll-picker");
const ninjaResult = document.querySelector("#ninja-result");
const scrollResult = document.querySelector("#scroll-result");
const dirtyFields = new Set();
let latestExportText = "";

for (const ninja of NINJAS) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ninja-option";
  button.dataset.ninjaId = ninja.id;
  button.setAttribute("role", "option");
  button.innerHTML = `
    ${renderNinjaAvatar(ninja)}
    <span class="option-name">${ninja.name}</span>
    ${ninja.alias ? `<span class="option-subtitle">${ninja.alias}</span>` : ""}
  `;
  button.addEventListener("click", () => {
    selectNinja(ninja.id);
    flashElement(button);
    render();
  });
  ninjaPicker.append(button);
}

for (const scroll of SECRET_SCROLLS) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scroll-option";
  button.dataset.scrollId = scroll.id;
  button.setAttribute("role", "option");
  button.innerHTML = `
    ${renderScrollIcon(scroll)}
    <span class="option-name">${scroll.name}</span>
  `;
  button.addEventListener("click", () => {
    selectScroll(scroll.id);
    flashElement(button);
    render();
  });
  scrollPicker.append(button);
}

ninjaIdInput.value = NINJAS[0].id;
scrollIdInput.value = SECRET_SCROLLS[0].id;

function formatSeasons(seasons) {
  if (seasons === Number.POSITIVE_INFINITY) {
    return "无法兑换";
  }

  if (seasons === 0) {
    return "无需赛季";
  }

  return `${seasons} 个赛季`;
}

function formatLevelPacks(packs) {
  if (!packs || packs.length === 0) {
    return "未购买等级";
  }

  return packs
    .map((pack) => {
      const limitText =
        pack.levels === 50 && pack.coupons === 1980 ? "，198档位50级一期忍法帖限购两次" : "";

      return `${pack.levels}级包 x${pack.count}（${pack.coupons}点券${limitText}）`;
    })
    .join(" + ");
}

function formatRemainingTime(remaining) {
  return `${remaining.days}天${remaining.hours}小时`;
}

function parseBeijingDateTime(datetimeLocalValue) {
  if (!datetimeLocalValue) {
    return new Date();
  }

  return new Date(`${datetimeLocalValue}:00+08:00`);
}

function clampInputNumber(input, min, max) {
  const number = Number(input.value);
  if (!Number.isFinite(number)) {
    input.value = min;
    return;
  }

  input.value = Math.min(max, Math.max(min, Math.trunc(number)));
}

function renderNinjaAvatar(ninja) {
  if (!ninja.avatar) {
    return `<span class="ninja-avatar ninja-avatar-placeholder">未</span>`;
  }

  return `<img class="ninja-avatar" src="${ninja.avatar}" alt="${ninja.name}" />`;
}

function renderScrollIcon(scroll) {
  return `<img class="scroll-icon" src="${scroll.icon}" alt="${scroll.name}" />`;
}

function selectNinja(ninjaId) {
  ninjaIdInput.value = ninjaId;

  for (const option of ninjaPicker.querySelectorAll(".ninja-option")) {
    const selected = option.dataset.ninjaId === ninjaId;
    option.classList.toggle("is-selected", selected);
    option.setAttribute("aria-selected", String(selected));
  }
}

function selectScroll(scrollId) {
  scrollIdInput.value = scrollId;

  for (const option of scrollPicker.querySelectorAll(".scroll-option")) {
    const selected = option.dataset.scrollId === scrollId;
    option.classList.toggle("is-selected", selected);
    option.setAttribute("aria-selected", String(selected));
  }
}

function getPassState() {
  const passType = passTypeSelect.value;
  const extraLevels = extraLevelsInput.value;
  const currentLevel = currentPassLevelInput.value;
  const currentExp = currentPassExpInput.value;
  const remainingWeeklyExp = remainingWeeklyExpInput.value;
  const remainingActivityExp = remainingActivityExpInput.value;
  const coinSource = coinSourceSelect.value;
  const seasonEndTime = parseBeijingDateTime(seasonEndTimeInput.value);
  const timeRemaining = calculateTimeRemaining(new Date(), seasonEndTime);
  const seasonCoins = calculateSeasonCoins(passType, extraLevels);
  const levelPurchase = calculateLevelPurchaseCoupons(extraLevels);
  const levelCoins = calculateCoinsFromLevel(passType, currentLevel);
  const availableCoins = coinSource === "level" ? levelCoins : Number(currentCoinsInput.value);
  const levelProgress = calculatePassLevelProgress({
    passType,
    currentLevel,
    currentExp,
    remainingWeeklyExp,
    remainingActivityExp
  });

  return {
    availableCoins,
    coinSource,
    currentExp: Number(currentExp),
    currentLevel: Number(currentLevel),
    eligible: hasExchangeEligibility(passType),
    levelCoins,
    levelProgress,
    levelPurchase,
    passType,
    remainingWeeklyExp: Number(remainingWeeklyExp),
    seasonCoins,
    timeRemaining
  };
}

function setFormDisabled(form, disabled) {
  for (const element of form.elements) {
    element.disabled = disabled;
  }
}

function getFormValue(form, fieldName) {
  return new FormData(form).get(fieldName);
}

function renderUnavailable() {
  const message = `
    <div class="empty-state">
      <strong>当前档位无兑换资格</strong>
      <span>只有 198 元传说版可以获得往期商店兑换币。</span>
    </div>
  `;

  ninjaResult.innerHTML = message;
  scrollResult.innerHTML = message;
}

function renderStatusBanner(progress) {
  if (progress.affordableNow) {
    return `
      <div class="status-banner status-success">
        <strong>恭喜，现在就能补出来</strong>
        <span>当前可用兑换币已经足够，直接去往期商店兑换即可。</span>
      </div>
    `;
  }

  if (progress.affordableThisSeason) {
    return `
      <div class="status-banner status-warning">
        <strong>本期可以补出来</strong>
        <span>当前还差 ${progress.coinsShortNow} 币，按剩余经验预计还能新增 ${progress.nextWeekCoins} 币。</span>
      </div>
    `;
  }

  return `
    <div class="status-banner status-danger">
      <strong>当期兑换币不够</strong>
      <span>当前还差 ${progress.coinsShortNow} 币，剩余经验预计新增后仍不足以覆盖。</span>
    </div>
  `;
}

function renderPendingBanner(type) {
  const targetText =
    type === "ninja"
      ? "填写已有碎片和当前兑换币后，这里会显示补出判断。"
      : "填写秘卷等级、等级内碎片和当前兑换币后，这里会显示补出判断。";

  return `
    <div class="status-banner status-pending">
      <strong>等待输入数据</strong>
      <span>${targetText}</span>
    </div>
  `;
}

function hasProgressInput() {
  return (
    dirtyFields.has("currentPassLevel") ||
    dirtyFields.has("currentPassExp") ||
    dirtyFields.has("remainingWeeklyExp") ||
    dirtyFields.has("remainingActivityExp") ||
    dirtyFields.has("coinSource") ||
    dirtyFields.has("currentCoins") ||
    dirtyFields.has("extraLevels") ||
    dirtyFields.has("seasonEndTime")
  );
}

function hasNinjaInput() {
  return dirtyFields.has("ownedFragments") || hasProgressInput();
}

function hasScrollInput() {
  return (
    dirtyFields.has("currentScrollLevel") ||
    dirtyFields.has("currentScrollFragments") ||
    dirtyFields.has("targetScrollLevel") ||
    hasProgressInput()
  );
}

function markDirty(fieldName) {
  dirtyFields.add(fieldName);
}

function calculateProgress(requiredCoins, passState) {
  return calculateWeeksToAfford({
    passType: passState.passType,
    requiredCoins,
    currentCoins: passState.availableCoins,
    currentLevel: passState.currentLevel,
    remainingTaskCoins: passState.levelProgress.remainingTaskCoins,
    maxWeeks: passState.timeRemaining.weeks,
    seasonCoins: passState.seasonCoins
  });
}

function renderRecommendedPlans(requiredCoins, passState) {
  const plans = calculateRecommendedPlans({
    passType: passState.passType,
    requiredCoins,
    currentCoins: passState.availableCoins,
    currentLevel: passState.currentLevel,
    remainingTaskCoins: passState.levelProgress.remainingTaskCoins,
    remainingWeeks: passState.timeRemaining.weeks
  });

  if (plans.length === 0) {
    return "";
  }

  return `
    <div class="recommend-panel">
      <div class="recommend-heading">
        <span>推荐套餐</span>
        <strong>跨期兑换币按清空后重新计算</strong>
      </div>
      <div class="recommend-list">
        ${plans.map(renderRecommendedPlan).join("")}
      </div>
    </div>
  `;
}

function renderRecommendedPlan(plan) {
  const timeText = plan.months === 0 ? "本期" : `${plan.months}个月`;
  const couponText = plan.coupons === 0 ? "不买等级" : `${plan.coupons}点券`;
  const purchaseCombo = plan.levelPurchase?.packs?.length
    ? formatLevelPacks(plan.levelPurchase.packs)
    : "";

  return `
    <article class="recommend-card">
      <strong>${plan.title}</strong>
      <p>${plan.description}</p>
      <dl>
        <div><dt>耗时</dt><dd>${timeText}</dd></div>
        <div><dt>总点券花费</dt><dd>${couponText}</dd></div>
        <div><dt>方案后剩余币</dt><dd>${plan.coinsAfterPlan}</dd></div>
      </dl>
      ${purchaseCombo ? `<p class="purchase-combo">购买搭配：${purchaseCombo}</p>` : ""}
    </article>
  `;
}

function renderNinja(passState) {
  const ninja = calculateNinjaCoins(
    getFormValue(ninjaForm, "ninjaId"),
    getFormValue(ninjaForm, "ownedFragments")
  );
  const seasons = calculateRequiredSeasons(ninja.coins, passState.seasonCoins);
  const progress = calculateProgress(ninja.coins, passState);
  const priceMode = ninja.ninja.era === "old" ? "老 S 分段计价" : "新 S 统一 15 币/片";
  const banner = hasNinjaInput() ? renderStatusBanner(progress) : renderPendingBanner("ninja");
  latestExportText = [
    `S忍目标：${ninja.ninja.name}`,
    `还缺碎片：${ninja.missingFragments}片`,
    `还需兑换币：${ninja.coins}`,
    `当前可用余额：${passState.availableCoins}`,
    `剩余任务新增：${passState.levelProgress.remainingTaskCoins}`,
    `预计赛季数：${formatSeasons(seasons)}`
  ].join("\n");

  ninjaResult.innerHTML = `
    ${banner}
    <div class="selected-target">
      ${renderNinjaAvatar(ninja.ninja)}
      <div>
        <span>当前目标</span>
        <strong>${ninja.ninja.name}</strong>
      </div>
    </div>
    <div class="primary-result">
      <span>还需兑换币</span>
      <strong>${ninja.coins}</strong>
    </div>
    <dl class="result-list">
      <div><dt>目标</dt><dd>${ninja.ninja.name}</dd></div>
      <div><dt>计价</dt><dd>${priceMode}</dd></div>
      <div><dt>还缺碎片</dt><dd>${ninja.missingFragments} 片</dd></div>
      <div><dt>预计赛季数</dt><dd>${formatSeasons(seasons)}</dd></div>
    </dl>
    ${hasNinjaInput() ? renderRecommendedPlans(ninja.coins, passState) : ""}
  `;
  flashElement(ninjaResult);
}

function renderScroll(passState) {
  const scrollId = getFormValue(scrollForm, "scrollId");
  const scroll = SECRET_SCROLLS.find((item) => item.id === scrollId);
  const calculation = calculateSecretScrollCoins({
    currentLevel: getFormValue(scrollForm, "currentScrollLevel"),
    currentLevelFragments: getFormValue(scrollForm, "currentScrollFragments"),
    targetLevel: getFormValue(scrollForm, "targetScrollLevel")
  });
  const seasons = calculateRequiredSeasons(calculation.coins, passState.seasonCoins);
  const progress = calculateProgress(calculation.coins, passState);
  const banner = hasScrollInput() ? renderStatusBanner(progress) : renderPendingBanner("scroll");

  scrollResult.innerHTML = `
    ${banner}
    <div class="selected-target">
      ${renderScrollIcon(scroll)}
      <div>
        <span>当前秘卷</span>
        <strong>${scroll.name}</strong>
      </div>
    </div>
    <div class="primary-result">
      <span>还需兑换币</span>
      <strong>${calculation.coins}</strong>
    </div>
    <dl class="result-list">
      <div><dt>秘卷</dt><dd>${scroll.name}</dd></div>
      <div>
        <dt>当前进度</dt>
        <dd>${calculation.currentLevel} 级 (${calculation.currentLevelFragments}/${calculation.nextLevelRequirement})</dd>
      </div>
      <div><dt>目标等级</dt><dd>${calculation.targetLevel} 级</dd></div>
      <div><dt>还需碎片</dt><dd>${calculation.fragments} 片</dd></div>
      <div><dt>兑换包数</dt><dd>${calculation.packs} 包</dd></div>
      <div><dt>预计赛季数</dt><dd>${formatSeasons(seasons)}</dd></div>
    </dl>
    ${hasScrollInput() ? renderRecommendedPlans(calculation.coins, passState) : ""}
  `;
  flashElement(scrollResult);
}

function renderProgressBars(passState) {
  const levelPercent = Math.min(100, Math.max(0, (passState.currentExp / 1000) * 100));
  const weeklyPercent = Math.min(100, Math.max(0, (passState.remainingWeeklyExp / 3500) * 100));

  levelExpLabel.textContent = `${passState.currentExp}/1000`;
  weeklyExpLabel.textContent = `${passState.remainingWeeklyExp}/3500`;
  levelExpBar.style.width = `${levelPercent}%`;
  weeklyExpBar.style.width = `${weeklyPercent}%`;
}

function flashElement(element) {
  element.classList.remove("is-flashing");
  window.requestAnimationFrame(() => {
    element.classList.add("is-flashing");
  });
}

function render() {
  clampInputNumber(currentPassExpInput, 0, 999);
  clampInputNumber(remainingWeeklyExpInput, 0, 3500);

  const passState = getPassState();

  extraLevelsInput.disabled = passState.passType !== PASS_TYPES.LEGEND;
  currentPassLevelInput.disabled = !passState.eligible;
  currentPassExpInput.disabled = !passState.eligible;
  remainingWeeklyExpInput.disabled = !passState.eligible;
  remainingActivityExpInput.disabled = !passState.eligible;
  coinSourceSelect.disabled = !passState.eligible;
  currentCoinsInput.disabled = !passState.eligible || passState.coinSource === "level";
  setFormDisabled(ninjaForm, !passState.eligible);
  setFormDisabled(scrollForm, !passState.eligible);

  seasonCoinsNode.textContent = passState.seasonCoins;
  levelCouponsNode.textContent = passState.levelPurchase.coupons;
  levelCouponsNode.title = formatLevelPacks(passState.levelPurchase.packs);
  effectiveCurrentCoinsNode.textContent = passState.availableCoins;
  levelCoinsNode.textContent = passState.levelCoins;
  nextWeekCoinsNode.textContent = passState.levelProgress.remainingTaskCoins;
  finalPassLevelNode.textContent =
    `${passState.levelProgress.finalLevel}级 (${passState.levelProgress.finalExp}/1000)`;
  seasonLeftTimeNode.textContent = formatRemainingTime(passState.timeRemaining);
  seasonLeftWeeksNode.textContent = passState.timeRemaining.weeks;
  renderProgressBars(passState);

  if (!passState.eligible) {
    renderUnavailable();
    return;
  }

  renderNinja(passState);
  renderScroll(passState);
}

function resetAllInputs() {
  extraLevelsInput.value = 0;
  currentPassLevelInput.value = 160;
  currentPassExpInput.value = 0;
  remainingWeeklyExpInput.value = 0;
  remainingActivityExpInput.value = 0;
  currentCoinsInput.value = 0;
  coinSourceSelect.value = "manual";
  ninjaForm.reset();
  scrollForm.reset();
  dirtyFields.clear();
  selectNinja(NINJAS[0].id);
  selectScroll(SECRET_SCROLLS[0].id);
  render();
}

function saveCurrentConfig() {
  const config = {
    passType: passTypeSelect.value,
    extraLevels: extraLevelsInput.value,
    currentPassLevel: currentPassLevelInput.value,
    currentPassExp: currentPassExpInput.value,
    remainingWeeklyExp: remainingWeeklyExpInput.value,
    remainingActivityExp: remainingActivityExpInput.value,
    coinSource: coinSourceSelect.value,
    currentCoins: currentCoinsInput.value,
    seasonEndTime: seasonEndTimeInput.value,
    ninjaId: ninjaIdInput.value,
    scrollId: scrollIdInput.value
  };

  localStorage.setItem("naruto-pass-config", JSON.stringify(config));
}

async function exportResult() {
  if (!latestExportText) {
    return;
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(latestExportText);
  }
}

function updateMode(mode) {
  appShell.dataset.mode = mode;

  for (const button of document.querySelectorAll("[data-mode-button]")) {
    button.classList.toggle("is-active", button.dataset.modeButton === mode);
  }
}

function bindDirtyInput(input, fieldName) {
  input.addEventListener("input", () => {
    markDirty(fieldName);
    render();
  });
}

passTypeSelect.addEventListener("change", render);
bindDirtyInput(extraLevelsInput, "extraLevels");
bindDirtyInput(currentPassLevelInput, "currentPassLevel");
bindDirtyInput(currentPassExpInput, "currentPassExp");
bindDirtyInput(remainingWeeklyExpInput, "remainingWeeklyExp");
bindDirtyInput(remainingActivityExpInput, "remainingActivityExp");
bindDirtyInput(currentCoinsInput, "currentCoins");

coinSourceSelect.addEventListener("change", () => {
  markDirty("coinSource");
  render();
});

seasonEndTimeInput.addEventListener("input", () => {
  markDirty("seasonEndTime");
  render();
});

for (const button of document.querySelectorAll("[data-mode-button]")) {
  button.addEventListener("click", () => updateMode(button.dataset.modeButton));
}

for (const button of document.querySelectorAll("[data-action]")) {
  button.addEventListener("click", () => {
    if (button.dataset.action === "weekly-zero") {
      remainingWeeklyExpInput.value = 0;
      markDirty("remainingWeeklyExp");
    }

    if (button.dataset.action === "weekly-full") {
      remainingWeeklyExpInput.value = 3500;
      markDirty("remainingWeeklyExp");
    }

    if (button.dataset.action === "activity-1100") {
      remainingActivityExpInput.value = Number(remainingActivityExpInput.value) + 1100;
      markDirty("remainingActivityExp");
    }

    if (button.dataset.action === "activity-1300") {
      remainingActivityExpInput.value = Number(remainingActivityExpInput.value) + 1300;
      markDirty("remainingActivityExp");
    }

    if (button.dataset.action === "activity-clear") {
      remainingActivityExpInput.value = 0;
      markDirty("remainingActivityExp");
    }

    flashElement(button);
    render();
  });
}

for (const button of document.querySelectorAll("[data-command]")) {
  button.addEventListener("click", async () => {
    if (button.dataset.command === "calculate") {
      dirtyFields.add("currentCoins");
      render();
      document.querySelector(".calculator-grid").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (button.dataset.command === "reset") {
      resetAllInputs();
    }

    if (button.dataset.command === "export") {
      await exportResult();
    }

    if (button.dataset.command === "save") {
      saveCurrentConfig();
    }

    flashElement(button);
  });
}

ninjaForm.addEventListener("input", (event) => {
  markDirty(event.target.name);
  render();
});
ninjaForm.addEventListener("change", (event) => {
  markDirty(event.target.name);
  render();
});
scrollForm.addEventListener("input", (event) => {
  markDirty(event.target.name);
  render();
});
scrollForm.addEventListener("change", (event) => {
  markDirty(event.target.name);
  render();
});

selectNinja(NINJAS[0].id);
selectScroll(SECRET_SCROLLS[0].id);
updateMode("all");
render();
