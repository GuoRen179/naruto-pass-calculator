import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateLevelPurchaseCoupons,
  calculateNinjaCoins,
  calculateNextWeekCoins,
  calculatePlan,
  calculateRecommendedPlans,
  calculateSeasonCoins,
  calculateTimeRemaining,
  calculatePassLevelProgress,
  calculateWeeksToAfford,
  calculateCoinsFromLevel,
  calculateSecretScrollCoins,
  calculateSecretScroll,
  PASS_TYPES
} from "../src/index.mjs";

test("198 元档基础兑换币为 620", () => {
  assert.equal(calculateSeasonCoins(PASS_TYPES.LEGEND, 0), 620);
});

test("推荐方案使用当前剩余兑换币，不混入等级理论币", () => {
  const plans = calculateRecommendedPlans({
    passType: PASS_TYPES.LEGEND,
    requiredCoins: 550,
    currentCoins: 10,
    currentLevel: 218,
    remainingWeeks: 2
  });

  assert.equal(plans[0].id, "current-season-buy-levels");
  assert.equal(plans[0].coupons, 1980);
  assert.equal(plans[0].coinsAfterPlan, 0);
  assert.equal(plans.find((plan) => plan.id === "future-1").coinsAfterPlan, 70);

  const fullSeasonPlans = calculateRecommendedPlans({
    passType: PASS_TYPES.LEGEND,
    requiredCoins: 550,
    currentCoins: 580,
    currentLevel: 218,
    remainingWeeks: 2
  });

  assert.equal(fullSeasonPlans[0].id, "current-season-free");
  assert.equal(fullSeasonPlans[0].coinsAfterPlan, 70);
});

test("额外购买等级每级增加 10 兑换币", () => {
  assert.equal(calculateSeasonCoins(PASS_TYPES.LEGEND, 50), 1120);
});

test("非 198 元档没有兑换币", () => {
  assert.equal(calculateSeasonCoins(PASS_TYPES.NORMAL, 200), 0);
  assert.equal(calculateSeasonCoins(PASS_TYPES.NONE, 200), 0);
});

test("可按当前等级计算理论兑换币", () => {
  assert.equal(calculateCoinsFromLevel(PASS_TYPES.LEGEND, 160), 0);
  assert.equal(calculateCoinsFromLevel(PASS_TYPES.LEGEND, 170), 100);
  assert.equal(calculateCoinsFromLevel(PASS_TYPES.LEGEND, 222), 620);
  assert.equal(calculateCoinsFromLevel(PASS_TYPES.LEGEND, 240), 620);
});

test("可计算下周预计新增兑换币", () => {
  assert.equal(calculateNextWeekCoins(PASS_TYPES.LEGEND, 155), 50);
  assert.equal(calculateNextWeekCoins(PASS_TYPES.LEGEND, 170), 100);
  assert.equal(calculateNextWeekCoins(PASS_TYPES.LEGEND, 218, 20), 40);
});

test("可按剩余经验计算最终等级和剩余可得兑换币", () => {
  const progress = calculatePassLevelProgress({
    passType: PASS_TYPES.LEGEND,
    currentLevel: 221,
    currentExp: 300,
    remainingWeeklyExp: 0,
    remainingActivityExp: 1300
  });

  assert.equal(progress.gainedLevels, 1);
  assert.equal(progress.finalLevel, 222);
  assert.equal(progress.finalExp, 600);
  assert.equal(progress.remainingTaskCoins, 10);
});

test("老 S 忍整卡需要 3000 兑换币", () => {
  assert.equal(calculateNinjaCoins("hozuki-gengetsu", 0).coins, 3000);
});

test("老 S 忍已拥有 80 片时后 20 片按 50 币计算", () => {
  assert.equal(calculateNinjaCoins("hozuki-gengetsu", 80).coins, 1000);
});

test("新 S 忍整卡需要 1500 兑换币", () => {
  assert.equal(calculateNinjaCoins("six-tails-naruto", 0).coins, 1500);
});

test("秘卷 0 到 10 级需要 660 兑换币", () => {
  assert.deepEqual(calculateSecretScroll(0, 10), {
    currentLevel: 0,
    currentLevelFragments: 0,
    nextLevelRequirement: 5,
    targetLevel: 10,
    fragments: 325,
    coins: 660,
    packs: 22
  });
});

test("秘卷当前等级内多出的碎片会抵扣需求", () => {
  const scroll = calculateSecretScrollCoins({
    currentLevel: 6,
    currentLevelFragments: 5,
    targetLevel: 10
  });

  assert.equal(scroll.nextLevelRequirement, 45);
  assert.equal(scroll.fragments, 205);
  assert.equal(scroll.coins, 420);
});

test("50 级优惠包限购 2 次", () => {
  assert.equal(calculateLevelPurchaseCoupons(100).coupons, 3960);
  assert.equal(calculateLevelPurchaseCoupons(150).coupons, 8960);
});

test("不足 50 级时也可选择更划算的 50 级特惠包", () => {
  const purchase = calculateLevelPurchaseCoupons(42);

  assert.equal(purchase.coupons, 1980);
  assert.equal(purchase.purchasedLevels, 50);
  assert.deepEqual(purchase.packs, [
    {
      levels: 50,
      coupons: 1980,
      count: 1,
      limit: 2
    }
  ]);
});

test("秘卷买等级推荐同样使用 198 档位 50 级特惠包", () => {
  const plans = calculateRecommendedPlans({
    passType: PASS_TYPES.LEGEND,
    requiredCoins: 420,
    currentCoins: 0,
    currentLevel: 160,
    remainingTaskCoins: 0
  });

  assert.equal(plans[0].id, "current-season-buy-levels");
  assert.equal(plans[0].coupons, 1980);
  assert.equal(plans[0].levelPurchase.purchasedLevels, 50);
  assert.equal(plans[0].coinsAfterPlan, 80);
});

test("完整方案返回所需赛季数", () => {
  const plan = calculatePlan({
    passType: PASS_TYPES.LEGEND,
    extraLevels: 0,
    ninjaId: "six-tails-naruto",
    ownedFragments: 0,
    currentScrollLevel: 0,
    targetScrollLevel: 10
  });

  assert.equal(plan.ninja.seasons, 3);
  assert.equal(plan.secretScroll.seasons, 2);
});

test("可按当前兑换币和等级计算还需几周", () => {
  const progress = calculateWeeksToAfford({
    passType: PASS_TYPES.LEGEND,
    requiredCoins: 1500,
    currentCoins: 1300,
    seasonCoins: 1500,
    currentLevel: 200
  });

  assert.equal(progress.affordableNow, false);
  assert.equal(progress.affordableThisSeason, true);
  assert.equal(progress.weeks, 2);
});

test("可按北京时间赛季结束时间计算剩余周数", () => {
  const remaining = calculateTimeRemaining("2026-05-20T00:00:00+08:00", "2026-05-31T12:00:00+08:00");

  assert.equal(remaining.days, 11);
  assert.equal(remaining.hours, 12);
  assert.equal(remaining.weeks, 2);
});

test("剩余周数不足时不会显示本期可补", () => {
  const progress = calculateWeeksToAfford({
    passType: PASS_TYPES.LEGEND,
    requiredCoins: 620,
    currentCoins: 0,
    seasonCoins: 620,
    currentLevel: 160,
    maxWeeks: 2
  });

  assert.equal(progress.affordableThisSeason, false);
  assert.equal(progress.weeks, Number.POSITIVE_INFINITY);
});

test("可生成本期买等级和跨期推荐方案", () => {
  const plans = calculateRecommendedPlans({
    passType: PASS_TYPES.LEGEND,
    requiredCoins: 1500,
    currentCoins: 1000,
    currentLevel: 200,
    remainingWeeks: 1
  });

  assert.equal(plans[0].id, "current-season-buy-levels");
  assert.equal(plans.find((plan) => plan.id === "future-3").coinsAfterPlan, 360);
});

test("当前兑换币足够时显示现在可补", () => {
  const progress = calculateWeeksToAfford({
    passType: PASS_TYPES.LEGEND,
    requiredCoins: 1500,
    currentCoins: 1500,
    seasonCoins: 1500,
    currentLevel: 200
  });

  assert.equal(progress.affordableNow, true);
  assert.equal(progress.weeks, 0);
});
