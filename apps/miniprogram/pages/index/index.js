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
  clampInteger,
  hasExchangeEligibility,
  NEW_NINJA_FRAGMENT_PRICE,
  NINJAS,
  OLD_NINJA_CHEAP_FRAGMENT_LIMIT,
  OLD_NINJA_CHEAP_FRAGMENT_PRICE,
  OLD_NINJA_EXPENSIVE_FRAGMENT_PRICE,
  PASS_TYPES,
  S_NINJA_TARGET_FRAGMENTS,
  SECRET_SCROLLS
} from "../../utils/core.js";

const CONFIG_STORAGE_KEY = "naruto-pass-config";
const ADMIN_STORAGE_KEY = "naruto-pass-admin-settings";
const DEFAULT_SEASON_END_DATE = "2026-05-31";
const DEFAULT_SEASON_END_TIME = "12:00";
const ADMIN_NINJA_ERA_OPTIONS = [
  { label: "新 S（15币/片）", value: "new" },
  { label: "老 S（分段计价）", value: "old" }
];
const CLOUD_ADMIN_CONFIG = {
  envId: "cloud1-d6gy16a3xf0e1a5c4",
  collection: "naruto_pass_config",
  docId: "global"
};

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
    return "";
  }

  return packs
    .map((pack) => {
      const limitText = pack.levels === 50 && pack.coupons === 1980 ? "，198档位50级一期忍法帖限购两次" : "";
      return `${pack.levels}级包 x${pack.count}（${pack.coupons}点券${limitText}）`;
    })
    .join(" + ");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDateInput(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function normalizeDateValue(value, fallback = DEFAULT_SEASON_END_DATE) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? value : fallback;
}

function normalizeTimeValue(value, fallback = DEFAULT_SEASON_END_TIME) {
  return /^\d{2}:\d{2}$/.test(String(value ?? "")) ? value : fallback;
}

function buildBeijingISO(dateInput, timeInput) {
  if (!dateInput || !timeInput) {
    return new Date().toISOString();
  }

  return `${dateInput}T${timeInput}:00+08:00`;
}

function buildPassTypeOptions() {
  return [
    { label: "198 元传说版", value: PASS_TYPES.LEGEND },
    { label: "25 元普通版", value: PASS_TYPES.NORMAL },
    { label: "未开通", value: PASS_TYPES.NONE }
  ];
}

function buildCoinSourceOptions() {
  return [
    { label: "手动输入当前剩余币", value: "manual" },
    { label: "按当前等级理论估算", value: "level" }
  ];
}

function toMiniImagePath(type, item) {
  if (!item[type]) {
    return "";
  }

  const folder = type === "avatar" ? "ninjas" : "scrolls";
  return `../../assets/${folder}/${item.id}.jpg`;
}

function normalizeConfigImage(value) {
  return typeof value === "string" ? value.replace(/["\\\r\n]/g, "") : "";
}

function normalizeConfigList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function normalizeSafeId(value, fallback) {
  const rawId = typeof value === "string" ? value.trim() : "";
  const safeId = rawId
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/^-+|-+$/g, "");

  return safeId || fallback;
}

function normalizeExtraNinjas(payload = {}) {
  const source = payload.extraNinjas !== undefined
    ? normalizeConfigList(payload.extraNinjas)
    : normalizeConfigList(payload.ninjas);

  return source
    .map((ninja, index) => {
      const name = typeof ninja?.name === "string" ? ninja.name.trim() : "";

      if (!name) {
        return null;
      }

      const era = ninja.era === "old" ? "old" : "new";
      const alias = typeof ninja.alias === "string" ? ninja.alias.trim() : "";

      return {
        id: normalizeSafeId(ninja.id, `extra-ninja-${index + 1}`),
        name,
        alias,
        era,
        image: normalizeConfigImage(ninja.image || ninja.avatar),
        shortLabel: alias || name.slice(0, 2),
        isExtra: true
      };
    })
    .filter(Boolean);
}

function normalizeExtraScrolls(payload = {}) {
  const source = payload.extraScrolls !== undefined
    ? normalizeConfigList(payload.extraScrolls)
    : normalizeConfigList(payload.scrolls);

  return source
    .map((scroll, index) => {
      const name = typeof scroll?.name === "string" ? scroll.name.trim() : "";

      if (!name) {
        return null;
      }

      const id = normalizeSafeId(scroll.id, `extra-scroll-${index + 1}`);
      const shortLabel = typeof scroll.shortLabel === "string" && scroll.shortLabel.trim()
        ? scroll.shortLabel.trim()
        : name.slice(0, 2);

      return {
        id,
        name,
        image: normalizeConfigImage(scroll.image || scroll.icon),
        shortLabel
      };
    })
    .filter(Boolean);
}

function normalizeAdminSettings(payload = {}) {
  return {
    seasonEndDate: normalizeDateValue(payload.seasonEndDate),
    seasonEndTime: normalizeTimeValue(payload.seasonEndTime),
    urashikiImage: typeof payload.urashikiImage === "string" ? payload.urashikiImage : "",
    backgroundImage: typeof payload.backgroundImage === "string" ? payload.backgroundImage : "",
    extraNinjas: normalizeExtraNinjas(payload),
    extraScrolls: normalizeExtraScrolls(payload)
  };
}

function createExtraId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${random}`;
}

function trimText(value) {
  return String(value ?? "").trim();
}

function isCloudFile(value) {
  return typeof value === "string" && value.startsWith("cloud://");
}

function isHttpFile(value) {
  return /^https?:\/\//.test(String(value || ""));
}

function preserveRawCloudImage(displayImage, rawImage) {
  if (!displayImage) {
    return "";
  }

  if (isHttpFile(displayImage) && isCloudFile(rawImage)) {
    return rawImage;
  }

  return displayImage;
}

function buildBackgroundStyles(adminSettings = {}) {
  const image = String(adminSettings.backgroundImage || "").replace(/["\\\r\n]/g, "");

  if (!image) {
    return {
      pageBackgroundStyle: "",
      heroBackgroundStyle: ""
    };
  }

  return {
    pageBackgroundStyle: `background: linear-gradient(180deg, rgba(16, 10, 7, 0.7), rgba(16, 10, 7, 0.92) 56%, rgba(13, 10, 8, 0.98)), radial-gradient(circle at 50% 0%, rgba(255, 220, 140, 0.22), transparent 38%), url("${image}") center top / cover no-repeat;`,
    heroBackgroundStyle: ""
  };
}

function buildNinjaOptions(adminSettings = {}) {
  const ninjaMap = new Map();

  NINJAS.forEach((ninja) => {
    ninjaMap.set(ninja.id, {
      id: ninja.id,
      name: ninja.name,
      alias: ninja.alias,
      era: ninja.era,
      image:
        ninja.id === "urashiki" && adminSettings.urashikiImage
          ? adminSettings.urashikiImage
          : toMiniImagePath("avatar", ninja),
      shortLabel: ninja.alias || ninja.name.slice(0, 2),
      isExtra: false
    });
  });

  (adminSettings.extraNinjas || []).forEach((ninja) => {
    ninjaMap.set(ninja.id, {
      id: ninja.id,
      name: ninja.name,
      alias: ninja.alias,
      era: ninja.era,
      image: ninja.image || "",
      shortLabel: ninja.shortLabel || ninja.alias || ninja.name.slice(0, 2),
      isExtra: true
    });
  });

  return Array.from(ninjaMap.values());
}

function buildScrollOptions(adminSettings = {}) {
  const scrollMap = new Map();

  SECRET_SCROLLS.forEach((scroll) => {
    scrollMap.set(scroll.id, {
      id: scroll.id,
      name: scroll.name,
      image: toMiniImagePath("icon", scroll),
      shortLabel: scroll.name.slice(0, 2)
    });
  });

  (adminSettings.extraScrolls || []).forEach((scroll) => {
    scrollMap.set(scroll.id, {
      id: scroll.id,
      name: scroll.name,
      image: scroll.image || "",
      shortLabel: scroll.shortLabel || scroll.name.slice(0, 2)
    });
  });

  return Array.from(scrollMap.values());
}

function buildScrollLabels(scrollOptions) {
  return scrollOptions.map((item) => item.name);
}

function createInitialState(adminSettingsInput = {}) {
  const adminSettings = normalizeAdminSettings(adminSettingsInput);
  const passTypes = buildPassTypeOptions();
  const coinSources = buildCoinSourceOptions();
  const ninjaOptions = buildNinjaOptions(adminSettings);
  const scrollOptions = buildScrollOptions(adminSettings);
  const backgroundStyles = buildBackgroundStyles(adminSettings);

  return {
    mode: "all",
    modeTabs: [
      { label: "全部", value: "all" },
      { label: "S 忍补片", value: "ninja" },
      { label: "秘卷升级", value: "scroll" }
    ],
    passTypes,
    adminSettings,
    adminCloudSettings: adminSettings,
    adminSeasonEndDate: adminSettings.seasonEndDate,
    adminSeasonEndTime: adminSettings.seasonEndTime,
    adminUrashikiImage: adminSettings.urashikiImage,
    adminBackgroundImage: adminSettings.backgroundImage,
    adminNinjaEraOptions: ADMIN_NINJA_ERA_OPTIONS,
    adminNinjaEraLabels: ADMIN_NINJA_ERA_OPTIONS.map((item) => item.label),
    adminNinjaEraIndex: 0,
    adminNinjaName: "",
    adminNinjaAlias: "",
    adminNinjaImage: "",
    adminScrollName: "",
    adminScrollShortLabel: "",
    adminScrollImage: "",
    adminExtraNinjas: adminSettings.extraNinjas,
    adminExtraScrolls: adminSettings.extraScrolls,
    adminCloudPublishLoading: false,
    backgroundImage: adminSettings.backgroundImage,
    pageBackgroundStyle: backgroundStyles.pageBackgroundStyle,
    heroBackgroundStyle: backgroundStyles.heroBackgroundStyle,
    isDevelopMode: false,
    showAdminPanel: false,
    passTypeLabels: passTypes.map((item) => item.label),
    passTypeIndex: 0,
    coinSources,
    coinSourceLabels: coinSources.map((item) => item.label),
    coinSourceIndex: 0,
    ninjaOptions,
    ninjaLabels: ninjaOptions.map((item) => item.name),
    ninjaIndex: 0,
    scrollOptions,
    scrollLabels: buildScrollLabels(scrollOptions),
    scrollIndex: 0,
    seasonEndDate: adminSettings.seasonEndDate,
    seasonEndTime: adminSettings.seasonEndTime,
    extraLevels: 0,
    currentPassLevel: 160,
    currentPassExp: 0,
    remainingWeeklyExp: 0,
    remainingActivityExp: 0,
    currentCoins: 0,
    ownedFragments: 0,
    currentScrollLevel: 0,
    currentScrollFragments: 0,
    targetScrollLevel: 10
  };
}

function normalizeNumberInput(fieldName, value) {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) {
    return 0;
  }

  if (fieldName === "extraLevels") return clampInteger(asNumber, 0, 200);
  if (fieldName === "currentPassLevel") return clampInteger(asNumber, 1, 999);
  if (fieldName === "currentPassExp") return clampInteger(asNumber, 0, 999);
  if (fieldName === "remainingWeeklyExp") return clampInteger(asNumber, 0, 3500);
  if (fieldName === "remainingActivityExp") return clampInteger(asNumber, 0, 999999);
  if (fieldName === "currentCoins") return clampInteger(asNumber, 0, 999999);
  if (fieldName === "ownedFragments") return clampInteger(asNumber, 0, 99);
  if (fieldName === "currentScrollLevel") return clampInteger(asNumber, 0, 10);
  if (fieldName === "currentScrollFragments") return clampInteger(asNumber, 0, 999999);
  if (fieldName === "targetScrollLevel") return clampInteger(asNumber, 0, 10);
  return clampInteger(asNumber, 0, 999999);
}

function calculateBanner(progress) {
  if (progress.affordableNow) {
    return {
      className: "banner-success",
      title: "恭喜，现在就能补出来",
      desc: "当前可用兑换币已经足够，直接去往期商店兑换即可。"
    };
  }

  if (progress.affordableThisSeason) {
    return {
      className: "banner-warning",
      title: "本期可以补出来",
      desc: `当前还差 ${progress.coinsShortNow} 币，按剩余经验预计还能新增 ${progress.nextWeekCoins} 币。`
    };
  }

  return {
    className: "banner-danger",
    title: "当期兑换币不够",
    desc: `当前还差 ${progress.coinsShortNow} 币，剩余经验预计新增后仍不足以覆盖。`
  };
}

function calculateOldNinjaCoinsLocal(ownedFragments) {
  let cost = 0;

  for (let fragment = ownedFragments + 1; fragment <= S_NINJA_TARGET_FRAGMENTS; fragment += 1) {
    cost +=
      fragment <= OLD_NINJA_CHEAP_FRAGMENT_LIMIT
        ? OLD_NINJA_CHEAP_FRAGMENT_PRICE
        : OLD_NINJA_EXPENSIVE_FRAGMENT_PRICE;
  }

  return cost;
}

function calculateSelectedNinjaCoins(selectedNinja, ownedFragmentsInput) {
  if (!selectedNinja?.isExtra) {
    return calculateNinjaCoins(selectedNinja.id, ownedFragmentsInput);
  }

  const ownedFragments = clampInteger(ownedFragmentsInput, 0, 99);
  const missingFragments = S_NINJA_TARGET_FRAGMENTS - ownedFragments;
  const coins =
    selectedNinja.era === "old"
      ? calculateOldNinjaCoinsLocal(ownedFragments)
      : missingFragments * NEW_NINJA_FRAGMENT_PRICE;

  return {
    ninja: selectedNinja,
    ownedFragments,
    missingFragments,
    coins
  };
}

function calculateAll(state) {
  const passType = state.passTypes[state.passTypeIndex]?.value ?? PASS_TYPES.LEGEND;
  const coinSourceValue = state.coinSources[state.coinSourceIndex]?.value ?? "manual";
  const eligible = hasExchangeEligibility(passType);
  const seasonEndISO = buildBeijingISO(state.seasonEndDate, state.seasonEndTime);
  const timeRemaining = calculateTimeRemaining(new Date(), seasonEndISO);
  const seasonCoins = calculateSeasonCoins(passType, state.extraLevels);
  const levelPurchase = calculateLevelPurchaseCoupons(state.extraLevels);
  const levelCoins = calculateCoinsFromLevel(passType, state.currentPassLevel);
  const availableCoins = coinSourceValue === "level" ? levelCoins : clampInteger(state.currentCoins, 0, 999999);
  const levelProgress = calculatePassLevelProgress({
    passType,
    currentLevel: state.currentPassLevel,
    currentExp: state.currentPassExp,
    remainingWeeklyExp: state.remainingWeeklyExp,
    remainingActivityExp: state.remainingActivityExp
  });

  const selectedNinja = state.ninjaOptions[state.ninjaIndex] ?? state.ninjaOptions[0];
  const selectedScroll = state.scrollOptions[state.scrollIndex] ?? state.scrollOptions[0];

  const base = {
    passType,
    coinSourceValue,
    eligible,
    seasonCoins,
    levelCoupons: levelPurchase.coupons,
    availableCoins,
    levelCoins,
    remainingTaskCoins: levelProgress.remainingTaskCoins,
    finalPassLevel: `${levelProgress.finalLevel}级 (${levelProgress.finalExp}/1000)`,
    seasonLeftTime: `${timeRemaining.days}天${timeRemaining.hours}小时`,
    seasonLeftWeeks: timeRemaining.weeks,
    selectedNinja,
    selectedScroll,
    levelExpPercent: Math.min(100, Math.max(0, Math.round((state.currentPassExp / 1000) * 100))),
    weeklyExpPercent: Math.min(100, Math.max(0, Math.round((state.remainingWeeklyExp / 3500) * 100)))
  };

  if (!eligible) {
    return {
      ...base,
      ninjaPlans: [],
      scrollPlans: [],
      ninjaBannerClass: "banner-muted",
      ninjaBannerTitle: "",
      ninjaBannerDesc: "",
      scrollBannerClass: "banner-muted",
      scrollBannerTitle: "",
      scrollBannerDesc: ""
    };
  }

  const ninja = calculateSelectedNinjaCoins(selectedNinja, state.ownedFragments);
  const ninjaSeasons = calculateRequiredSeasons(ninja.coins, seasonCoins);
  const ninjaProgress = calculateWeeksToAfford({
    passType,
    requiredCoins: ninja.coins,
    currentCoins: availableCoins,
    currentLevel: state.currentPassLevel,
    remainingTaskCoins: levelProgress.remainingTaskCoins,
    maxWeeks: timeRemaining.weeks,
    seasonCoins
  });
  const ninjaBanner = calculateBanner(ninjaProgress);
  const ninjaPriceMode = ninja.ninja.era === "old" ? "老 S 分段计价" : "新 S 统一 15 币/片";
  const ninjaPlans = calculateRecommendedPlans({
    passType,
    requiredCoins: ninja.coins,
    currentCoins: availableCoins,
    currentLevel: state.currentPassLevel,
    remainingTaskCoins: levelProgress.remainingTaskCoins,
    remainingWeeks: timeRemaining.weeks
  }).map((plan) => ({
    ...plan,
    purchaseCombo: plan.levelPurchase?.packs?.length ? formatLevelPacks(plan.levelPurchase.packs) : ""
  }));

  const scroll = calculateSecretScrollCoins({
    currentLevel: state.currentScrollLevel,
    currentLevelFragments: state.currentScrollFragments,
    targetLevel: state.targetScrollLevel
  });
  const scrollSeasons = calculateRequiredSeasons(scroll.coins, seasonCoins);
  const scrollProgress = calculateWeeksToAfford({
    passType,
    requiredCoins: scroll.coins,
    currentCoins: availableCoins,
    currentLevel: state.currentPassLevel,
    remainingTaskCoins: levelProgress.remainingTaskCoins,
    maxWeeks: timeRemaining.weeks,
    seasonCoins
  });
  const scrollBanner = calculateBanner(scrollProgress);
  const scrollPlans = calculateRecommendedPlans({
    passType,
    requiredCoins: scroll.coins,
    currentCoins: availableCoins,
    currentLevel: state.currentPassLevel,
    remainingTaskCoins: levelProgress.remainingTaskCoins,
    remainingWeeks: timeRemaining.weeks
  }).map((plan) => ({
    ...plan,
    purchaseCombo: plan.levelPurchase?.packs?.length ? formatLevelPacks(plan.levelPurchase.packs) : ""
  }));

  return {
    ...base,
    ninjaRequiredCoins: ninja.coins,
    ninjaMissingFragments: ninja.missingFragments,
    ninjaPriceMode,
    ninjaSeasonsText: formatSeasons(ninjaSeasons),
    ninjaBannerClass: ninjaBanner.className,
    ninjaBannerTitle: ninjaBanner.title,
    ninjaBannerDesc: ninjaBanner.desc,
    ninjaPlans,
    scrollRequiredCoins: scroll.coins,
    scrollFragments: scroll.fragments,
    scrollPacks: scroll.packs,
    scrollProgressText: `${scroll.currentLevel}级 (${scroll.currentLevelFragments}/${scroll.nextLevelRequirement || 0})`,
    scrollSeasonsText: formatSeasons(scrollSeasons),
    scrollBannerClass: scrollBanner.className,
    scrollBannerTitle: scrollBanner.title,
    scrollBannerDesc: scrollBanner.desc,
    scrollPlans
  };
}

Page({
  data: {
    ...createInitialState()
  },
  onLoad() {
    const adminSettings = this.loadAdminSettings();
    this.setData({
      ...createInitialState(adminSettings),
      isDevelopMode: this.isDevelopMode()
    });
    this.restoreConfig();
    this.recalculate();
    this.syncCloudAdminSettings();
  },
  loadAdminSettings() {
    return normalizeAdminSettings(wx.getStorageSync(ADMIN_STORAGE_KEY));
  },
  isDevelopMode() {
    try {
      const envVersion = wx.getAccountInfoSync().miniProgram.envVersion;
      return envVersion === "develop";
    } catch (error) {
      return false;
    }
  },
  applyAdminSettings(adminSettingsInput) {
    const adminSettings = normalizeAdminSettings(adminSettingsInput);
    const previousNinjaId = this.data.ninjaOptions[this.data.ninjaIndex]?.id;
    const previousScrollId = this.data.scrollOptions[this.data.scrollIndex]?.id;
    const ninjaOptions = buildNinjaOptions(adminSettings);
    const scrollOptions = buildScrollOptions(adminSettings);
    const backgroundStyles = buildBackgroundStyles(adminSettings);
    const matchedNinjaIndex = ninjaOptions.findIndex((item) => item.id === previousNinjaId);
    const matchedScrollIndex = scrollOptions.findIndex((item) => item.id === previousScrollId);

    this.setData({
      adminSettings,
      adminSeasonEndDate: adminSettings.seasonEndDate,
      adminSeasonEndTime: adminSettings.seasonEndTime,
      adminUrashikiImage: adminSettings.urashikiImage,
      adminBackgroundImage: adminSettings.backgroundImage,
      backgroundImage: adminSettings.backgroundImage,
      pageBackgroundStyle: backgroundStyles.pageBackgroundStyle,
      heroBackgroundStyle: backgroundStyles.heroBackgroundStyle,
      seasonEndDate: adminSettings.seasonEndDate,
      seasonEndTime: adminSettings.seasonEndTime,
      ninjaOptions,
      ninjaLabels: ninjaOptions.map((item) => item.name),
      ninjaIndex: matchedNinjaIndex >= 0 ? matchedNinjaIndex : 0,
      scrollOptions,
      scrollLabels: buildScrollLabels(scrollOptions),
      scrollIndex: matchedScrollIndex >= 0 ? matchedScrollIndex : 0
    });
  },
  syncCloudAdminSettings() {
    if (!CLOUD_ADMIN_CONFIG.envId || !wx.cloud) {
      return;
    }

    wx.cloud.init({
      env: CLOUD_ADMIN_CONFIG.envId,
      traceUser: false
    });
    wx.cloud
      .database()
      .collection(CLOUD_ADMIN_CONFIG.collection)
      .doc(CLOUD_ADMIN_CONFIG.docId)
      .get({
        success: (result) => {
          const remoteSettings = normalizeAdminSettings(result.data);
          this.setData({ adminCloudSettings: remoteSettings });
          this.resolveCloudImage(remoteSettings, (resolvedSettings) => {
            this.applyAdminSettings(resolvedSettings);
            this.recalculate();
          });
        },
        fail: (error) => {
          console.warn("读取云端管理员配置失败", error);
        }
      });
  },
  resolveCloudImage(settings, callback) {
    const ninjaCloudFiles = (settings.extraNinjas || [])
      .map((item) => item.image)
      .filter((item) => item && item.startsWith("cloud://"));
    const scrollCloudFiles = (settings.extraScrolls || [])
      .map((item) => item.image)
      .filter((item) => item && item.startsWith("cloud://"));
    const cloudFiles = [settings.urashikiImage, settings.backgroundImage, ...ninjaCloudFiles, ...scrollCloudFiles]
      .filter((item) => item && item.startsWith("cloud://"));

    if (cloudFiles.length === 0 || !wx.cloud) {
      callback(settings);
      return;
    }

    wx.cloud.getTempFileURL({
      fileList: cloudFiles,
      success: (result) => {
        const resolved = {
          ...settings,
          extraNinjas: (settings.extraNinjas || []).map((ninja) => ({ ...ninja })),
          extraScrolls: (settings.extraScrolls || []).map((scroll) => ({ ...scroll }))
        };
        const files = result.fileList || [];

        files.forEach((file) => {
          const tempUrl = file.tempFileURL;

          if (!tempUrl) {
            return;
          }

          if (file.fileID === settings.urashikiImage) {
            resolved.urashikiImage = tempUrl;
          }

          if (file.fileID === settings.backgroundImage) {
            resolved.backgroundImage = tempUrl;
          }

          resolved.extraNinjas = resolved.extraNinjas.map((ninja) => (
            file.fileID === ninja.image ? { ...ninja, image: tempUrl } : ninja
          ));

          resolved.extraScrolls = resolved.extraScrolls.map((scroll) => (
            file.fileID === scroll.image ? { ...scroll, image: tempUrl } : scroll
          ));
        });

        callback({
          ...settings,
          ...resolved
        });
      },
      fail: (error) => {
        console.warn("云存储图片临时链接获取失败", error);
        callback(settings);
      }
    });
  },
  recalculate() {
    const raw = { ...this.data };
    const numFields = [
      "extraLevels", "currentPassLevel", "currentPassExp",
      "remainingWeeklyExp", "remainingActivityExp", "currentCoins",
      "ownedFragments", "currentScrollLevel", "currentScrollFragments", "targetScrollLevel"
    ];
    const normalized = {};
    for (const f of numFields) {
      normalized[f] = normalizeNumberInput(f, raw[f]);
    }
    const merged = { ...raw, ...normalized };
    const result = calculateAll(merged);
    this.setData({ ...merged, ...result });
  },
  onPassTypeChange(event) {
    this.setData({
      passTypeIndex: Number(event.detail.value) || 0
    });
    this.recalculate();
  },
  onCoinSourceChange(event) {
    this.setData({
      coinSourceIndex: Number(event.detail.value) || 0
    });
    this.recalculate();
  },
  onNinjaChange(event) {
    this.setData({
      ninjaIndex: Number(event.detail.value) || 0
    });
    this.recalculate();
  },
  onScrollChange(event) {
    this.setData({
      scrollIndex: Number(event.detail.value) || 0
    });
    this.recalculate();
  },
  onNinjaTap(event) {
    this.setData({
      ninjaIndex: Number(event.currentTarget.dataset.index) || 0
    });
    this.recalculate();
  },
  onScrollTap(event) {
    this.setData({
      scrollIndex: Number(event.currentTarget.dataset.index) || 0
    });
    this.recalculate();
  },
  onModeTap(event) {
    this.setData({
      mode: event.currentTarget.dataset.mode || "all"
    });
  },
  onQuickTap(event) {
    const action = event.currentTarget.dataset.action;
    const next = {};

    if (action === "weekly-zero") {
      next.remainingWeeklyExp = 0;
    }

    if (action === "weekly-full") {
      next.remainingWeeklyExp = 3500;
    }

    if (action === "activity-1100") {
      next.remainingActivityExp = normalizeNumberInput("remainingActivityExp", Number(this.data.remainingActivityExp) + 1100);
    }

    if (action === "activity-1300") {
      next.remainingActivityExp = normalizeNumberInput("remainingActivityExp", Number(this.data.remainingActivityExp) + 1300);
    }

    if (action === "activity-clear") {
      next.remainingActivityExp = 0;
    }

    this.setData(next);
    this.recalculate();
  },
  onSeasonEndDateChange(event) {
    this.setData({
      seasonEndDate: event.detail.value
    });
    this.recalculate();
  },
  onSeasonEndTimeChange(event) {
    this.setData({
      seasonEndTime: event.detail.value
    });
    this.recalculate();
  },
  onNumberInput(event) {
    const fieldName = event.currentTarget.dataset.field;
    const rawValue = event.detail.value;
    this.setData({ [fieldName]: rawValue });
  },

  onNumberBlur(event) {
    const fieldName = event.currentTarget.dataset.field;
    const normalized = normalizeNumberInput(fieldName, event.detail.value);
    this.setData({ [fieldName]: normalized });
    this.recalculate();
  },
  onCalculate() {
    this.recalculate();
    wx.pageScrollTo({
      scrollTop: 99999,
      duration: 300
    });
  },
  onReset() {
    this.setData({
      ...createInitialState(this.data.adminSettings),
      isDevelopMode: this.data.isDevelopMode
    });
    this.recalculate();
  },
  onSave() {
    wx.setStorageSync(CONFIG_STORAGE_KEY, {
      passTypeIndex: this.data.passTypeIndex,
      mode: this.data.mode,
      coinSourceIndex: this.data.coinSourceIndex,
      ninjaIndex: this.data.ninjaIndex,
      scrollIndex: this.data.scrollIndex,
      extraLevels: this.data.extraLevels,
      currentPassLevel: this.data.currentPassLevel,
      currentPassExp: this.data.currentPassExp,
      remainingWeeklyExp: this.data.remainingWeeklyExp,
      remainingActivityExp: this.data.remainingActivityExp,
      currentCoins: this.data.currentCoins,
      ownedFragments: this.data.ownedFragments,
      currentScrollLevel: this.data.currentScrollLevel,
      currentScrollFragments: this.data.currentScrollFragments,
      targetScrollLevel: this.data.targetScrollLevel
    });

    wx.showToast({ title: "已保存", icon: "success" });
  },
  restoreConfig() {
    const payload = wx.getStorageSync(CONFIG_STORAGE_KEY);
    if (!payload) {
      return;
    }

    const { seasonEndDate, seasonEndTime, ...rest } = payload;
    this.setData(rest);
  },
  noop() {},
  onOpenAdminPanel() {
    if (!this.data.isDevelopMode) {
      wx.showToast({ title: "仅开发版可用", icon: "none" });
      return;
    }

    const adminSettings = normalizeAdminSettings(this.data.adminSettings);
    this.setData({
      adminSeasonEndDate: adminSettings.seasonEndDate,
      adminSeasonEndTime: adminSettings.seasonEndTime,
      adminUrashikiImage: adminSettings.urashikiImage,
      adminBackgroundImage: adminSettings.backgroundImage,
      adminNinjaEraIndex: 0,
      adminNinjaName: "",
      adminNinjaAlias: "",
      adminNinjaImage: "",
      adminScrollName: "",
      adminScrollShortLabel: "",
      adminScrollImage: "",
      adminExtraNinjas: adminSettings.extraNinjas,
      adminExtraScrolls: adminSettings.extraScrolls,
      showAdminPanel: true
    });
  },
  onCloseAdminPanel() {
    this.setData({
      showAdminPanel: false
    });
  },
  onAdminSeasonEndDateChange(event) {
    this.setData({
      adminSeasonEndDate: event.detail.value
    });
  },
  onAdminSeasonEndTimeChange(event) {
    this.setData({
      adminSeasonEndTime: event.detail.value
    });
  },
  onAdminTextInput(event) {
    const fieldName = event.currentTarget.dataset.field;

    if (!fieldName) {
      return;
    }

    this.setData({
      [fieldName]: event.detail.value
    });
  },
  onAdminNinjaEraChange(event) {
    this.setData({
      adminNinjaEraIndex: Number(event.detail.value) || 0
    });
  },
  onChooseUrashikiImage() {
    this.chooseAdminImage("adminUrashikiImage", "urashiki-avatar.jpg");
  },
  onChooseBackgroundImage() {
    this.chooseAdminImage("adminBackgroundImage", "page-background.jpg");
  },
  onChooseAdminNinjaImage() {
    this.chooseAdminImage("adminNinjaImage", `extra-ninja-${Date.now()}.jpg`);
  },
  onChooseAdminScrollImage() {
    this.chooseAdminImage("adminScrollImage", `extra-scroll-${Date.now()}.jpg`);
  },
  chooseAdminImage(fieldName, fileName) {
    const onPicked = (tempFilePath) => {
      if (!tempFilePath) {
        return;
      }

      const fs = wx.getFileSystemManager?.();
      const targetPath = `${wx.env.USER_DATA_PATH}/${fileName}`;

      if (!fs) {
        this.setData({ [fieldName]: tempFilePath });
        return;
      }

      try {
        fs.unlinkSync(targetPath);
      } catch (error) {}

      fs.saveFile({
        tempFilePath,
        filePath: targetPath,
        success: (result) => {
          this.setData({ [fieldName]: result.savedFilePath || targetPath });
        },
        fail: () => {
          this.setData({ [fieldName]: tempFilePath });
        }
      });
    };

    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
        success: (result) => onPicked(result.tempFiles?.[0]?.tempFilePath)
      });
      return;
    }

    wx.chooseImage({
      count: 1,
      sourceType: ["album", "camera"],
      success: (result) => onPicked(result.tempFilePaths?.[0])
    });
  },
  onClearUrashikiImage() {
    this.setData({
      adminUrashikiImage: ""
    });
  },
  onClearBackgroundImage() {
    this.setData({
      adminBackgroundImage: ""
    });
  },
  onClearAdminNinjaImage() {
    this.setData({
      adminNinjaImage: ""
    });
  },
  onClearAdminScrollImage() {
    this.setData({
      adminScrollImage: ""
    });
  },
  onAddAdminNinja() {
    const name = trimText(this.data.adminNinjaName);

    if (!name) {
      wx.showToast({ title: "请先填写 S 忍名称", icon: "none" });
      return;
    }

    const era = ADMIN_NINJA_ERA_OPTIONS[this.data.adminNinjaEraIndex]?.value || "new";
    const [ninja] = normalizeExtraNinjas({
      extraNinjas: [{
        id: createExtraId("extra-ninja"),
        name,
        alias: trimText(this.data.adminNinjaAlias),
        era,
        image: this.data.adminNinjaImage
      }]
    });

    if (!ninja) {
      wx.showToast({ title: "新增失败，请检查名称", icon: "none" });
      return;
    }

    this.setData({
      adminExtraNinjas: [...(this.data.adminExtraNinjas || []), ninja],
      adminNinjaName: "",
      adminNinjaAlias: "",
      adminNinjaImage: "",
      adminNinjaEraIndex: 0
    });
  },
  onDeleteAdminNinja(event) {
    const targetIndex = Number(event.currentTarget.dataset.index);
    const adminExtraNinjas = (this.data.adminExtraNinjas || [])
      .filter((_, index) => index !== targetIndex);

    this.setData({ adminExtraNinjas });
  },
  onAddAdminScroll() {
    const name = trimText(this.data.adminScrollName);

    if (!name) {
      wx.showToast({ title: "请先填写秘卷名称", icon: "none" });
      return;
    }

    const [scroll] = normalizeExtraScrolls({
      extraScrolls: [{
        id: createExtraId("extra-scroll"),
        name,
        shortLabel: trimText(this.data.adminScrollShortLabel),
        image: this.data.adminScrollImage
      }]
    });

    if (!scroll) {
      wx.showToast({ title: "新增失败，请检查名称", icon: "none" });
      return;
    }

    this.setData({
      adminExtraScrolls: [...(this.data.adminExtraScrolls || []), scroll],
      adminScrollName: "",
      adminScrollShortLabel: "",
      adminScrollImage: ""
    });
  },
  onDeleteAdminScroll(event) {
    const targetIndex = Number(event.currentTarget.dataset.index);
    const adminExtraScrolls = (this.data.adminExtraScrolls || [])
      .filter((_, index) => index !== targetIndex);

    this.setData({ adminExtraScrolls });
  },
  buildAdminSettingsForSave() {
    return normalizeAdminSettings({
      seasonEndDate: this.data.adminSeasonEndDate,
      seasonEndTime: this.data.adminSeasonEndTime,
      urashikiImage: this.data.adminUrashikiImage,
      backgroundImage: this.data.adminBackgroundImage,
      extraNinjas: this.data.adminExtraNinjas || [],
      extraScrolls: this.data.adminExtraScrolls || []
    });
  },
  buildAdminSettingsForCloudPublish() {
    const rawSettings = normalizeAdminSettings(this.data.adminCloudSettings);
    const localSettings = this.buildAdminSettingsForSave();
    const rawNinjaMap = new Map((rawSettings.extraNinjas || []).map((item) => [item.id, item]));
    const rawScrollMap = new Map((rawSettings.extraScrolls || []).map((item) => [item.id, item]));

    return normalizeAdminSettings({
      ...localSettings,
      urashikiImage: preserveRawCloudImage(localSettings.urashikiImage, rawSettings.urashikiImage),
      backgroundImage: preserveRawCloudImage(localSettings.backgroundImage, rawSettings.backgroundImage),
      extraNinjas: (localSettings.extraNinjas || []).map((ninja) => {
        const rawNinja = rawNinjaMap.get(ninja.id);
        return {
          ...ninja,
          image: preserveRawCloudImage(ninja.image, rawNinja?.image)
        };
      }),
      extraScrolls: (localSettings.extraScrolls || []).map((scroll) => {
        const rawScroll = rawScrollMap.get(scroll.id);
        return {
          ...scroll,
          image: preserveRawCloudImage(scroll.image, rawScroll?.image)
        };
      })
    });
  },
  getImageExtension(filePath) {
    const matched = String(filePath || "").toLowerCase().match(/\.(png|jpe?g|gif|webp|bmp)(?:\?|$)/);

    if (!matched) {
      return "jpg";
    }

    return matched[1] === "jpeg" ? "jpg" : matched[1];
  },
  uploadAdminCloudImage(image, prefix) {
    return new Promise((resolve, reject) => {
      if (!image || isCloudFile(image) || isHttpFile(image)) {
        resolve(image || "");
        return;
      }

      if (!wx.cloud) {
        reject(new Error("当前基础库不支持云开发"));
        return;
      }

      const ext = this.getImageExtension(image);
      const random = Math.random().toString(36).slice(2, 8);

      wx.cloud.uploadFile({
        cloudPath: `admin-assets/${prefix}-${Date.now()}-${random}.${ext}`,
        filePath: image,
        success: (result) => resolve(result.fileID || ""),
        fail: reject
      });
    });
  },
  async uploadAdminSettingsImages(settings) {
    const extraNinjas = [];
    const extraScrolls = [];

    for (const ninja of settings.extraNinjas || []) {
      extraNinjas.push({
        ...ninja,
        image: await this.uploadAdminCloudImage(ninja.image, `ninja-${ninja.id}`)
      });
    }

    for (const scroll of settings.extraScrolls || []) {
      extraScrolls.push({
        ...scroll,
        image: await this.uploadAdminCloudImage(scroll.image, `scroll-${scroll.id}`)
      });
    }

    return normalizeAdminSettings({
      ...settings,
      urashikiImage: await this.uploadAdminCloudImage(settings.urashikiImage, "urashiki-avatar"),
      backgroundImage: await this.uploadAdminCloudImage(settings.backgroundImage, "page-background"),
      extraNinjas,
      extraScrolls
    });
  },
  callUpdateAdminConfig(settings) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: "updateAdminConfig",
        data: { settings },
        success: (result) => resolve(result.result || {}),
        fail: reject
      });
    });
  },
  async onPublishAdminSettingsToCloud() {
    if (!this.data.isDevelopMode) {
      wx.showToast({ title: "仅开发版可用", icon: "none" });
      return;
    }

    if (!wx.cloud) {
      wx.showToast({ title: "当前基础库不支持云开发", icon: "none" });
      return;
    }

    this.setData({ adminCloudPublishLoading: true });
    wx.showLoading({ title: "发布中", mask: true });

    try {
      wx.cloud.init({
        env: CLOUD_ADMIN_CONFIG.envId,
        traceUser: false
      });

      const settings = this.buildAdminSettingsForCloudPublish();
      const cloudSettings = await this.uploadAdminSettingsImages(settings);
      const result = await this.callUpdateAdminConfig(cloudSettings);

      if (!result.ok) {
        wx.showModal({
          title: "没有云端发布权限",
          content: result.openid
            ? `请把这个 OpenID 加到 updateAdminConfig 云函数白名单：${result.openid}`
            : (result.message || "请检查云函数管理员白名单。"),
          showCancel: false
        });
        return;
      }

      this.setData({ adminCloudSettings: cloudSettings });
      wx.setStorageSync(ADMIN_STORAGE_KEY, cloudSettings);
      this.resolveCloudImage(cloudSettings, (resolvedSettings) => {
        this.applyAdminSettings(resolvedSettings);
        this.setData({ showAdminPanel: false });
        this.recalculate();
      });
      wx.showToast({ title: "已发布到云端", icon: "success" });
    } catch (error) {
      console.error("发布云端管理员配置失败", error);
      wx.showModal({
        title: "发布失败",
        content: error?.message || "请确认云函数已上传，并已配置管理员 OpenID。",
        showCancel: false
      });
    } finally {
      wx.hideLoading();
      this.setData({ adminCloudPublishLoading: false });
    }
  },
  onSaveAdminSettings() {
    const adminSettings = this.buildAdminSettingsForSave();

    wx.setStorageSync(ADMIN_STORAGE_KEY, adminSettings);
    this.applyAdminSettings(adminSettings);
    this.setData({ showAdminPanel: false });
    this.recalculate();
    wx.showToast({ title: "管理设置已保存", icon: "success" });
  },
  onExport() {
    const passType = this.data.passTypes[this.data.passTypeIndex]?.value ?? PASS_TYPES.LEGEND;
    const eligible = hasExchangeEligibility(passType);

    const text = eligible
      ? [
          `S忍目标：${this.data.selectedNinja.name}`,
          `还需兑换币：${this.data.ninjaRequiredCoins}`,
          `当前可用余额：${this.data.availableCoins}`,
          `剩余任务新增：${this.data.remainingTaskCoins}`,
          `秘卷目标：${this.data.selectedScroll.name}`,
          `秘卷还需兑换币：${this.data.scrollRequiredCoins}`,
          `预计最终等级：${this.data.finalPassLevel}`
        ].join("\n")
      : "当前档位无往期商店兑换资格";

    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: "已复制", icon: "success" });
      }
    });
  }
});
