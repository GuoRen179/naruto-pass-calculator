export const PASS_TYPES = {
  LEGEND: "legend198",
  NORMAL: "normal25",
  NONE: "none"
};

export const BASE_COINS = 620;
export const COINS_PER_EXTRA_LEVEL = 10;
export const EXCHANGE_COIN_START_LEVEL = 160;
export const BASE_EXCHANGE_COIN_END_LEVEL = EXCHANGE_COIN_START_LEVEL + BASE_COINS / COINS_PER_EXTRA_LEVEL;
export const MAX_EXTRA_LEVELS = 200;
export const DEFAULT_WEEKLY_LEVELS = 10;
export const PASS_LEVEL_EXP = 1000;
export const WEEKLY_TASK_EXP_CAP = 3500;
export const ACTIVITY_REWARD_EXPS = [1100, 1300, 1300, 1300, 1300];
export const ACTIVITY_TOTAL_EXP = ACTIVITY_REWARD_EXPS.reduce((total, exp) => total + exp, 0);
export const MILLIS_PER_HOUR = 60 * 60 * 1000;
export const MILLIS_PER_DAY = 24 * MILLIS_PER_HOUR;
export const MILLIS_PER_WEEK = 7 * MILLIS_PER_DAY;
export const S_NINJA_TARGET_FRAGMENTS = 100;
export const OLD_NINJA_CHEAP_FRAGMENT_LIMIT = 80;
export const OLD_NINJA_CHEAP_FRAGMENT_PRICE = 25;
export const OLD_NINJA_EXPENSIVE_FRAGMENT_PRICE = 50;
export const NEW_NINJA_FRAGMENT_PRICE = 15;
export const SECRET_SCROLL_PACK_FRAGMENTS = 15;
export const SECRET_SCROLL_PACK_COINS = 30;

export const LEVEL_PACKS = [
  { levels: 50, coupons: 1980, limit: 2 },
  { levels: 30, coupons: 3000 },
  { levels: 10, coupons: 1000 },
  { levels: 1, coupons: 100 }
];

function createNinja(id, name, alias, era, hasAvatar = true) {
  return {
    id,
    name,
    alias,
    era,
    avatar: hasAvatar ? `assets/ninjas/${id}.png` : ""
  };
}
export const NINJAS = [
  createNinja("hozuki-gengetsu", "鬼灯幻月", "小胡子", "old"),
  createNinja("gold-silver-brothers", "金银角", "", "old"),
  createNinja("mu", "无", "", "old"),
  createNinja("edo-hanzo", "秽土转生半藏", "半藏", "old"),
  createNinja("third-raikage", "三代目雷影", "三代雷", "old"),
  createNinja("tendo-cho", "天道超", "超哥", "old"),
  createNinja("rosa", "罗砂", "", "old"),
  createNinja("founding-madara", "木叶创立斑", "创立斑", "old"),
  createNinja("war-onoki", "忍战大野木", "小土豆", "old"),
  createNinja("kinshiki", "大筒木金式", "大胃袋", "old"),
  createNinja("red-night-obito", "红夜面具男", "红面", "old"),
  createNinja("founding-hashirama", "创立柱间", "", "old"),
  createNinja("momoshiki", "大筒木桃式", "", "old"),
  createNinja("susanoo-shisui", "须佐止水", "绿牛", "old"),
  createNinja("final-toneri", "最终章舍人", "舍人", "old"),
  createNinja("six-tails-naruto", "暴怒六尾鸣人", "六尾", "new"),
  createNinja("five-kage-madara", "五影会谈斑", "假斑", "new"),
  createNinja("majestic-madara", "神驹佑将斑", "马斑", "new"),
  createNinja("urashiki", "大筒木蒲式", "即将上线", "new", false)
];

function createSecretScroll(id, name) {
  return {
    id,
    name,
    icon: `assets/scrolls/${id}.png`
  };
}

export const SECRET_SCROLLS = [
  createSecretScroll("manipulated-shuriken", "操手里剑"),
  createSecretScroll("shadow-clone", "影分身之术"),
  createSecretScroll("frog-transformation", "蛙变之术"),
  createSecretScroll("nintaijutsu-perseverance", "忍体术·毅力"),
  createSecretScroll("healing-jutsu-inspire", "掌仙术·振奋"),
  createSecretScroll("illusion-leaf-obstacle", "幻术·一叶障"),
  createSecretScroll("lightning-gate", "雷遁·雷电门"),
  createSecretScroll("water-balloon", "水遁·水气球"),
  createSecretScroll("flame-array", "火遁·火炎阵"),
  createSecretScroll("magnetic-storm", "雷遁·磁暴术"),
  createSecretScroll("time-reversal", "幻术·时间回溯")
];

export const SECRET_SCROLL_CUMULATIVE_FRAGMENTS = [0, 5, 15, 30, 50, 75, 115, 160, 210, 265, 325];

export function hasExchangeEligibility(passType) {
  return passType === PASS_TYPES.LEGEND;
}

export function clampInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

export function calculateLevelPurchaseCoupons(extraLevelsInput) {
  const requestedLevels = clampInteger(extraLevelsInput, 0, MAX_EXTRA_LEVELS);

  if (requestedLevels === 0) {
    return {
      coupons: 0,
      packs: [],
      purchasedLevels: 0,
      requestedLevels
    };
  }

  let bestPlan = null;

  function search(packIndex, currentPacks, purchasedLevels, coupons) {
    if (packIndex >= LEVEL_PACKS.length) {
      if (purchasedLevels < requestedLevels || purchasedLevels > MAX_EXTRA_LEVELS) {
        return;
      }

      const normalizedPacks = currentPacks.filter((pack) => pack.count > 0);
      const packCount = normalizedPacks.reduce((total, pack) => total + pack.count, 0);
      const candidate = {
        coupons,
        packCount,
        packs: normalizedPacks,
        purchasedLevels,
        requestedLevels
      };

      if (
        !bestPlan ||
        candidate.coupons < bestPlan.coupons ||
        (candidate.coupons === bestPlan.coupons &&
          candidate.purchasedLevels < bestPlan.purchasedLevels) ||
        (candidate.coupons === bestPlan.coupons &&
          candidate.purchasedLevels === bestPlan.purchasedLevels &&
          candidate.packCount < bestPlan.packCount)
      ) {
        bestPlan = candidate;
      }

      return;
    }

    const pack = LEVEL_PACKS[packIndex];
    const maxCount = pack.limit ?? Math.floor(MAX_EXTRA_LEVELS / pack.levels);

    for (let count = 0; count <= maxCount; count += 1) {
      search(
        packIndex + 1,
        [...currentPacks, { levels: pack.levels, coupons: pack.coupons, count, limit: pack.limit }],
        purchasedLevels + pack.levels * count,
        coupons + pack.coupons * count
      );
    }
  }

  search(0, [], 0, 0);
  return bestPlan;
}

export function calculateSeasonCoins(passType, extraLevelsInput) {
  if (!hasExchangeEligibility(passType)) {
    return 0;
  }

  const extraLevels = clampInteger(extraLevelsInput, 0, MAX_EXTRA_LEVELS);
  return BASE_COINS + extraLevels * COINS_PER_EXTRA_LEVEL;
}

export function calculateCoinsFromLevel(passType, levelInput) {
  if (!hasExchangeEligibility(passType)) {
    return 0;
  }

  const level = clampInteger(levelInput, 1, 999);
  const cappedLevel = Math.min(level, BASE_EXCHANGE_COIN_END_LEVEL);
  const coinLevels = Math.max(0, cappedLevel - EXCHANGE_COIN_START_LEVEL);
  return coinLevels * COINS_PER_EXTRA_LEVEL;
}

export function calculateNextWeekCoins(passType, currentLevelInput, weeklyLevelsInput = DEFAULT_WEEKLY_LEVELS) {
  if (!hasExchangeEligibility(passType)) {
    return 0;
  }

  const currentLevel = clampInteger(currentLevelInput, 1, 999);
  const weeklyLevels = clampInteger(weeklyLevelsInput, 0, 999);
  const nextLevel = currentLevel + weeklyLevels;

  return (
    calculateCoinsFromLevel(passType, nextLevel) -
    calculateCoinsFromLevel(passType, currentLevel)
  );
}

export function calculatePassLevelProgress(input) {
  const passType = input.passType ?? PASS_TYPES.LEGEND;
  const currentLevel = clampInteger(input.currentLevel ?? EXCHANGE_COIN_START_LEVEL, 1, 999);
  const currentExp = clampInteger(input.currentExp ?? 0, 0, PASS_LEVEL_EXP - 1);
  const remainingWeeklyExp = clampInteger(input.remainingWeeklyExp ?? 0, 0, 999999);
  const remainingActivityExp = clampInteger(input.remainingActivityExp ?? 0, 0, 999999);
  const remainingExp = remainingWeeklyExp + remainingActivityExp;
  const totalExp = currentExp + remainingExp;
  const gainedLevels = Math.floor(totalExp / PASS_LEVEL_EXP);
  const finalLevel = currentLevel + gainedLevels;
  const finalExp = totalExp % PASS_LEVEL_EXP;
  const currentLevelCoins = calculateCoinsFromLevel(passType, currentLevel);
  const finalLevelCoins = calculateCoinsFromLevel(passType, finalLevel);

  return {
    currentExp,
    currentLevel,
    finalExp,
    finalLevel,
    gainedLevels,
    remainingActivityExp,
    remainingExp,
    remainingTaskCoins: Math.max(0, finalLevelCoins - currentLevelCoins),
    remainingWeeklyExp
  };
}

export function calculateTimeRemaining(nowInput, endInput) {
  const now = new Date(nowInput);
  const end = new Date(endInput);
  const remainingMs = Math.max(0, end.getTime() - now.getTime());

  return {
    remainingMs,
    days: Math.floor(remainingMs / MILLIS_PER_DAY),
    hours: Math.floor((remainingMs % MILLIS_PER_DAY) / MILLIS_PER_HOUR),
    weeks: Math.ceil(remainingMs / MILLIS_PER_WEEK)
  };
}

export function calculateOldNinjaCoins(ownedFragmentsInput) {
  const ownedFragments = clampInteger(ownedFragmentsInput, 0, 99);
  let cost = 0;

  for (let fragment = ownedFragments + 1; fragment <= S_NINJA_TARGET_FRAGMENTS; fragment += 1) {
    cost +=
      fragment <= OLD_NINJA_CHEAP_FRAGMENT_LIMIT
        ? OLD_NINJA_CHEAP_FRAGMENT_PRICE
        : OLD_NINJA_EXPENSIVE_FRAGMENT_PRICE;
  }

  return cost;
}

export function calculateNinjaCoins(ninjaId, ownedFragmentsInput) {
  const ninja = NINJAS.find((item) => item.id === ninjaId);
  if (!ninja) {
    throw new Error(`Unknown ninja id: ${ninjaId}`);
  }

  const ownedFragments = clampInteger(ownedFragmentsInput, 0, 99);
  const missingFragments = S_NINJA_TARGET_FRAGMENTS - ownedFragments;
  const coins =
    ninja.era === "old"
      ? calculateOldNinjaCoins(ownedFragments)
      : missingFragments * NEW_NINJA_FRAGMENT_PRICE;

  return {
    ninja,
    ownedFragments,
    missingFragments,
    coins
  };
}

export function calculateSecretScroll(currentLevelInput, targetLevelInput) {
  return calculateSecretScrollCoins({
    currentLevel: currentLevelInput,
    targetLevel: targetLevelInput,
    currentLevelFragments: 0
  });
}

export function getSecretScrollNextLevelRequirement(currentLevelInput) {
  const currentLevel = clampInteger(currentLevelInput, 0, 10);

  if (currentLevel >= 10) {
    return 0;
  }

  return (
    SECRET_SCROLL_CUMULATIVE_FRAGMENTS[currentLevel + 1] -
    SECRET_SCROLL_CUMULATIVE_FRAGMENTS[currentLevel]
  );
}

export function calculateSecretScrollCoins(input) {
  const currentLevel = clampInteger(input.currentLevel, 0, 10);
  const targetLevel = clampInteger(input.targetLevel, 0, 10);
  const normalizedTargetLevel = Math.max(targetLevel, currentLevel);
  const nextLevelRequirement = getSecretScrollNextLevelRequirement(currentLevel);
  const currentLevelFragments = clampInteger(
    input.currentLevelFragments ?? 0,
    0,
    Math.max(0, nextLevelRequirement - 1)
  );
  const rawFragments =
    SECRET_SCROLL_CUMULATIVE_FRAGMENTS[normalizedTargetLevel] -
    SECRET_SCROLL_CUMULATIVE_FRAGMENTS[currentLevel] -
    currentLevelFragments;
  const fragments = Math.max(0, rawFragments);
  const packs = Math.ceil(fragments / SECRET_SCROLL_PACK_FRAGMENTS);

  return {
    currentLevel,
    currentLevelFragments,
    nextLevelRequirement,
    targetLevel: normalizedTargetLevel,
    fragments,
    coins: packs * SECRET_SCROLL_PACK_COINS,
    packs
  };
}

export function calculateRequiredSeasons(requiredCoins, seasonCoins) {
  if (requiredCoins <= 0) {
    return 0;
  }

  if (seasonCoins <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.ceil(requiredCoins / seasonCoins);
}

export function calculateWeeksToAfford(input) {
  const passType = input.passType ?? PASS_TYPES.LEGEND;
  const requiredCoins = clampInteger(input.requiredCoins, 0, 999999);
  const currentCoins = clampInteger(input.currentCoins ?? 0, 0, 999999);
  const seasonCoins = clampInteger(input.seasonCoins ?? 0, 0, 999999);
  const currentLevel = clampInteger(input.currentLevel ?? EXCHANGE_COIN_START_LEVEL, 1, 999);
  const weeklyLevels = clampInteger(input.weeklyLevels ?? DEFAULT_WEEKLY_LEVELS, 0, 99);
  const remainingTaskCoins =
    input.remainingTaskCoins === undefined
      ? undefined
      : clampInteger(input.remainingTaskCoins, 0, 999999);
  const maxWeeks =
    input.maxWeeks === undefined
      ? Number.POSITIVE_INFINITY
      : clampInteger(input.maxWeeks, 0, 60);

  if (!hasExchangeEligibility(passType)) {
    return {
      affordableNow: false,
      affordableThisSeason: false,
      coinsShortNow: requiredCoins,
      nextWeekCoins: 0,
      weeks: Number.POSITIVE_INFINITY
    };
  }

  const coinsShortNow = Math.max(0, requiredCoins - currentCoins);
  const nextWeekCoins =
    remainingTaskCoins ?? calculateNextWeekCoins(passType, currentLevel, weeklyLevels);

  if (coinsShortNow === 0) {
    return {
      affordableNow: true,
      affordableThisSeason: true,
      coinsShortNow,
      nextWeekCoins,
      weeks: 0
    };
  }

  if (remainingTaskCoins !== undefined) {
    const simulatedCoins = currentCoins + remainingTaskCoins;

    return {
      affordableNow: false,
      affordableThisSeason: simulatedCoins >= requiredCoins,
      coinsShortNow,
      nextWeekCoins,
      weeks: simulatedCoins >= requiredCoins ? 1 : Number.POSITIVE_INFINITY
    };
  }

  if (requiredCoins > seasonCoins) {
    return {
      affordableNow: false,
      affordableThisSeason: false,
      coinsShortNow,
      nextWeekCoins,
      weeks: Number.POSITIVE_INFINITY
    };
  }

  let weeks = 0;
  let simulatedCoins = currentCoins;
  let simulatedLevel = currentLevel;

  while (simulatedCoins < requiredCoins && weeks < 60) {
    if (weeks >= maxWeeks) {
      break;
    }

    const beforeCoins = calculateCoinsFromLevel(passType, simulatedLevel);
    simulatedLevel += weeklyLevels;
    const afterCoins = calculateCoinsFromLevel(passType, simulatedLevel);
    simulatedCoins += afterCoins - beforeCoins;
    weeks += 1;
  }

  return {
    affordableNow: false,
    affordableThisSeason: simulatedCoins >= requiredCoins,
    coinsShortNow,
    nextWeekCoins,
    weeks: simulatedCoins >= requiredCoins ? weeks : Number.POSITIVE_INFINITY
  };
}

export function calculateRecommendedPlans(input) {
  const passType = input.passType ?? PASS_TYPES.LEGEND;

  if (!hasExchangeEligibility(passType)) {
    return [];
  }

  const requiredCoins = clampInteger(input.requiredCoins, 0, 999999);
  const currentCoins = clampInteger(input.currentCoins ?? 0, 0, 999999);
  const currentLevel = clampInteger(input.currentLevel ?? EXCHANGE_COIN_START_LEVEL, 1, 999);
  const remainingWeeks = clampInteger(input.remainingWeeks ?? 0, 0, 60);
  const weeklyLevels = clampInteger(input.weeklyLevels ?? DEFAULT_WEEKLY_LEVELS, 0, 99);
  const remainingTaskCoins =
    input.remainingTaskCoins === undefined
      ? calculateNextWeekCoins(passType, currentLevel, remainingWeeks * weeklyLevels)
      : clampInteger(input.remainingTaskCoins, 0, 999999);
  const availableWithoutBuying = currentCoins + remainingTaskCoins;
  const shortThisSeason = Math.max(0, requiredCoins - availableWithoutBuying);
  const plans = [];

  if (shortThisSeason === 0) {
    plans.push({
      id: "current-season-free",
      title: "本期任务补出",
      description: "不额外买等级，靠本期剩余任务兑换币即可补出。",
      coupons: 0,
      months: 0,
      coinsAfterPlan: availableWithoutBuying - requiredCoins
    });
  } else {
    const levelsNeeded = Math.ceil(shortThisSeason / COINS_PER_EXTRA_LEVEL);
    const levelPurchase = calculateLevelPurchaseCoupons(levelsNeeded);

    if (levelsNeeded <= MAX_EXTRA_LEVELS) {
      plans.push({
        id: "current-season-buy-levels",
        title: "本期买等级直补",
        description: `本期剩余任务后还差 ${shortThisSeason} 币，约需购买 ${levelPurchase.purchasedLevels} 级。`,
        coupons: levelPurchase.coupons,
        levelPurchase,
        months: 0,
        coinsAfterPlan: availableWithoutBuying + levelPurchase.purchasedLevels * COINS_PER_EXTRA_LEVEL - requiredCoins
      });
    }
  }

  const futureSeasons = Math.ceil(requiredCoins / BASE_COINS);

  if (futureSeasons > 0 && shortThisSeason > 0) {
    const futureCoins = futureSeasons * BASE_COINS;

    plans.push({
      id: `future-${futureSeasons}`,
      title: `跨 ${futureSeasons} 期慢慢攒`,
      description: `继续开 ${futureSeasons} 期 198 忍法帖，不买等级，预计可补出。`,
      coupons: 0,
      months: futureSeasons * 4,
      coinsAfterPlan: futureCoins - requiredCoins
    });
  }

  const maxLevelPurchase = calculateLevelPurchaseCoupons(MAX_EXTRA_LEVELS);
  const coinsAfterMaxBuy =
    requiredCoins - availableWithoutBuying - MAX_EXTRA_LEVELS * COINS_PER_EXTRA_LEVEL;

  if (coinsAfterMaxBuy > 0) {
    const futureSeasonsAfterBuy = Math.ceil(coinsAfterMaxBuy / BASE_COINS);

    plans.push({
      id: "buy-max-and-wait",
      title: `买满等级后跨 ${futureSeasonsAfterBuy} 期`,
      description: `本期最多补买 ${MAX_EXTRA_LEVELS} 级后，仍需继续攒后续忍法帖兑换币。`,
      coupons: maxLevelPurchase.coupons,
      levelPurchase: maxLevelPurchase,
      months: futureSeasonsAfterBuy * 4,
      coinsAfterPlan: futureSeasonsAfterBuy * BASE_COINS - coinsAfterMaxBuy
    });
  }

  return plans;
}

export function calculatePlan(input) {
  const passType = input.passType ?? PASS_TYPES.LEGEND;
  const extraLevels = clampInteger(input.extraLevels ?? 0, 0, MAX_EXTRA_LEVELS);
  const eligible = hasExchangeEligibility(passType);
  const seasonCoins = calculateSeasonCoins(passType, extraLevels);
  const levelPurchase = calculateLevelPurchaseCoupons(extraLevels);

  if (!eligible) {
    return {
      eligible,
      passType,
      seasonCoins: 0,
      levelPurchase,
      reason: "当前档位无往期商店兑换资格"
    };
  }

  const ninja = calculateNinjaCoins(input.ninjaId ?? NINJAS[0].id, input.ownedFragments ?? 0);
  const secretScroll = calculateSecretScrollCoins({
    currentLevel: input.currentScrollLevel ?? 0,
    targetLevel: input.targetScrollLevel ?? 10,
    currentLevelFragments: input.currentScrollFragments ?? 0
  });

  return {
    eligible,
    passType,
    seasonCoins,
    levelPurchase,
    ninja: {
      ...ninja,
      seasons: calculateRequiredSeasons(ninja.coins, seasonCoins)
    },
    secretScroll: {
      ...secretScroll,
      seasons: calculateRequiredSeasons(secretScroll.coins, seasonCoins)
    }
  };
}
