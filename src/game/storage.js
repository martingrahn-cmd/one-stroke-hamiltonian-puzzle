const STORAGE_KEYS = {
  campaignProgress: "one-stroke-campaign-progress-v2",
};

export function loadCampaignProgress(defaultUnlockedLevel = 1) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.campaignProgress);
    if (!raw) {
      return { unlockedLevel: defaultUnlockedLevel, solvedLevels: {} };
    }
    const parsed = JSON.parse(raw);
    const unlockedLevel = Number(parsed.unlockedLevel);
    const solvedLevels = typeof parsed.solvedLevels === "object" && parsed.solvedLevels !== null
      ? parsed.solvedLevels
      : {};
    if (!Number.isInteger(unlockedLevel) || unlockedLevel < 1) {
      return { unlockedLevel: defaultUnlockedLevel, solvedLevels: {} };
    }
    return { unlockedLevel, solvedLevels };
  } catch {
    return { unlockedLevel: defaultUnlockedLevel, solvedLevels: {} };
  }
}

export function saveCampaignProgress(progress) {
  localStorage.setItem(STORAGE_KEYS.campaignProgress, JSON.stringify(progress));
}
