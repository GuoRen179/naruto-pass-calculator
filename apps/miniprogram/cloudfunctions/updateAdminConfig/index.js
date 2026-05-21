const cloud = require("wx-server-sdk");

const ADMIN_OPENIDS = String(process.env.ADMIN_OPENIDS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const COLLECTION_NAME = "naruto_pass_config";
const DOC_ID = "global";
const DEFAULT_SEASON_END_DATE = "2026-05-31";
const DEFAULT_SEASON_END_TIME = "12:00";

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

function normalizeDateValue(value, fallback = DEFAULT_SEASON_END_DATE) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? value : fallback;
}

function normalizeTimeValue(value, fallback = DEFAULT_SEASON_END_TIME) {
  return /^\d{2}:\d{2}$/.test(String(value || "")) ? value : fallback;
}

function trimText(value) {
  return String(value || "").trim();
}

function normalizeImage(value) {
  return String(value || "").replace(/["\\\r\n]/g, "");
}

function normalizeSafeId(value, fallback) {
  const safeId = trimText(value)
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/^-+|-+$/g, "");

  return safeId || fallback;
}

function normalizeExtraNinjas(value) {
  return Array.isArray(value)
    ? value
        .map((ninja, index) => {
          const name = trimText(ninja && ninja.name);

          if (!name) {
            return null;
          }

          const alias = trimText(ninja && ninja.alias);

          return {
            id: normalizeSafeId(ninja && ninja.id, `extra-ninja-${index + 1}`),
            name,
            alias,
            era: ninja && ninja.era === "old" ? "old" : "new",
            image: normalizeImage(ninja && (ninja.image || ninja.avatar)),
            shortLabel: alias || name.slice(0, 2)
          };
        })
        .filter(Boolean)
    : [];
}

function normalizeExtraScrolls(value) {
  return Array.isArray(value)
    ? value
        .map((scroll, index) => {
          const name = trimText(scroll && scroll.name);

          if (!name) {
            return null;
          }

          const shortLabel = trimText(scroll && scroll.shortLabel) || name.slice(0, 2);

          return {
            id: normalizeSafeId(scroll && scroll.id, `extra-scroll-${index + 1}`),
            name,
            image: normalizeImage(scroll && (scroll.image || scroll.icon)),
            shortLabel
          };
        })
        .filter(Boolean)
    : [];
}

function normalizeSettings(payload = {}) {
  return {
    seasonEndDate: normalizeDateValue(payload.seasonEndDate),
    seasonEndTime: normalizeTimeValue(payload.seasonEndTime),
    urashikiImage: normalizeImage(payload.urashikiImage),
    backgroundImage: normalizeImage(payload.backgroundImage),
    extraNinjas: normalizeExtraNinjas(payload.extraNinjas),
    extraScrolls: normalizeExtraScrolls(payload.extraScrolls)
  };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!ADMIN_OPENIDS.includes(openid)) {
    return {
      ok: false,
      code: "NO_PERMISSION",
      openid,
      message: "当前 OpenID 不在管理员白名单中。"
    };
  }

  const db = cloud.database();
  const settings = normalizeSettings(event && event.settings);

  await db.collection(COLLECTION_NAME).doc(DOC_ID).set({
    data: {
      ...settings,
      updatedAt: db.serverDate(),
      updatedBy: openid
    }
  });

  return {
    ok: true,
    openid
  };
};
