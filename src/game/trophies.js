export const TROPHY_TIER_ORDER = ["bronze", "silver", "gold", "platinum"];

export const TROPHY_TIER_META = {
  bronze: { label: "Brons", total: 15 },
  silver: { label: "Silver", total: 10 },
  gold: { label: "Guld", total: 5 },
  platinum: { label: "Platinum", total: 1 },
};

export function createTrophyCatalog(campaignTotalLevels) {
  const catalog = [
    {
      id: "b01",
      tier: "bronze",
      name: "Första steget",
      description: "Lös 1 kampanjnivå.",
      check: (metrics) => metrics.campaignSolvedCount >= 1,
    },
    {
      id: "b02",
      tier: "bronze",
      name: "Femman",
      description: "Lös 5 kampanjnivåer.",
      check: (metrics) => metrics.campaignSolvedCount >= 5,
    },
    {
      id: "b03",
      tier: "bronze",
      name: "Tio avklarade",
      description: "Lös 10 kampanjnivåer.",
      check: (metrics) => metrics.campaignSolvedCount >= 10,
    },
    {
      id: "b04",
      tier: "bronze",
      name: "Tjugo avklarade",
      description: "Lös 20 kampanjnivåer.",
      check: (metrics) => metrics.campaignSolvedCount >= 20,
    },
    {
      id: "b05",
      tier: "bronze",
      name: "Trettio avklarade",
      description: "Lös 30 kampanjnivåer.",
      check: (metrics) => metrics.campaignSolvedCount >= 30,
    },
    {
      id: "b06",
      tier: "bronze",
      name: "10 spelade nivåer",
      description: "Nå 10 spelade kampanjnivå-försök totalt.",
      check: (metrics) => metrics.campaignPlayedCount >= 10,
    },
    {
      id: "b07",
      tier: "bronze",
      name: "25 spelade nivåer",
      description: "Nå 25 spelade kampanjnivå-försök totalt.",
      check: (metrics) => metrics.campaignPlayedCount >= 25,
    },
    {
      id: "b08",
      tier: "bronze",
      name: "Challenger",
      description: "Spara din första challenge-run.",
      check: (metrics) => metrics.challengeRunCount >= 1,
    },
    {
      id: "b09",
      tier: "bronze",
      name: "Första full run",
      description: "Slutför en hel 10-banors challenge.",
      check: (metrics) => metrics.completedChallengeCount >= 1,
    },
    {
      id: "b10",
      tier: "bronze",
      name: "Poäng 3k",
      description: "Nå minst 3 000 poäng i en challenge-run.",
      check: (metrics) => metrics.bestChallengeScore >= 3000,
    },
    {
      id: "b11",
      tier: "bronze",
      name: "Poäng 5k",
      description: "Nå minst 5 000 poäng i en challenge-run.",
      check: (metrics) => metrics.bestChallengeScore >= 5000,
    },
    {
      id: "b12",
      tier: "bronze",
      name: "Hintfri run",
      description: "Slutför en challenge-run utan hints.",
      check: (metrics) => metrics.noHintCompletedCount >= 1,
    },
    {
      id: "b13",
      tier: "bronze",
      name: "Resetfri run",
      description: "Slutför en challenge-run utan reset.",
      check: (metrics) => metrics.noResetCompletedCount >= 1,
    },
    {
      id: "b14",
      tier: "bronze",
      name: "Kontrollerad run",
      description: "Slutför en challenge-run med max 20 undo.",
      check: (metrics) => metrics.lowUndoCompletedCount >= 1,
    },
    {
      id: "b15",
      tier: "bronze",
      name: "50 spelade nivåer",
      description: "Nå 50 spelade kampanjnivå-försök totalt.",
      check: (metrics) => metrics.campaignPlayedCount >= 50,
    },
    {
      id: "s01",
      tier: "silver",
      name: "50 kampanjnivåer",
      description: "Lös 50 kampanjnivåer.",
      check: (metrics) => metrics.campaignSolvedCount >= 50,
    },
    {
      id: "s02",
      tier: "silver",
      name: "75 kampanjnivåer",
      description: "Lös 75 kampanjnivåer.",
      check: (metrics) => metrics.campaignSolvedCount >= 75,
    },
    {
      id: "s03",
      tier: "silver",
      name: "100 kampanjnivåer",
      description: "Lös 100 kampanjnivåer.",
      check: (metrics) => metrics.campaignSolvedCount >= 100,
    },
    {
      id: "s04",
      tier: "silver",
      name: "150 kampanjnivåer",
      description: "Lös 150 kampanjnivåer.",
      check: (metrics) => metrics.campaignSolvedCount >= 150,
    },
    {
      id: "s05",
      tier: "silver",
      name: "3 fulla challenges",
      description: "Slutför 3 hela challenge-runs.",
      check: (metrics) => metrics.completedChallengeCount >= 3,
    },
    {
      id: "s06",
      tier: "silver",
      name: "5 fulla challenges",
      description: "Slutför 5 hela challenge-runs.",
      check: (metrics) => metrics.completedChallengeCount >= 5,
    },
    {
      id: "s07",
      tier: "silver",
      name: "Poäng 8k",
      description: "Nå minst 8 000 poäng i en challenge-run.",
      check: (metrics) => metrics.bestChallengeScore >= 8000,
    },
    {
      id: "s08",
      tier: "silver",
      name: "Poäng 10k",
      description: "Nå minst 10 000 poäng i en challenge-run.",
      check: (metrics) => metrics.bestChallengeScore >= 10000,
    },
    {
      id: "s09",
      tier: "silver",
      name: "Snabb run",
      description: "Slutför en challenge-run under 6:00.",
      check: (metrics) => Number.isFinite(metrics.bestChallengeTimeMs) && metrics.bestChallengeTimeMs <= 360_000,
    },
    {
      id: "s10",
      tier: "silver",
      name: "No safety net",
      description: "Slutför en challenge-run utan hint och reset.",
      check: (metrics) => metrics.noHintNoResetCompletedCount >= 1,
    },
    {
      id: "g01",
      tier: "gold",
      name: "Kampanj 200",
      description: "Lös alla 200 kampanjnivåer.",
      check: (metrics) => metrics.campaignSolvedCount >= campaignTotalLevels,
    },
    {
      id: "g02",
      tier: "gold",
      name: "10 fulla challenges",
      description: "Slutför 10 hela challenge-runs.",
      check: (metrics) => metrics.completedChallengeCount >= 10,
    },
    {
      id: "g03",
      tier: "gold",
      name: "Poäng 12k",
      description: "Nå minst 12 000 poäng i en challenge-run.",
      check: (metrics) => metrics.bestChallengeScore >= 12000,
    },
    {
      id: "g04",
      tier: "gold",
      name: "Elittempo",
      description: "Slutför en challenge-run under 4:30.",
      check: (metrics) => Number.isFinite(metrics.bestChallengeTimeMs) && metrics.bestChallengeTimeMs <= 270_000,
    },
    {
      id: "g05",
      tier: "gold",
      name: "Perfekt run",
      description: "Slutför en challenge-run med 0 hint, 0 reset och 0 undo.",
      check: (metrics) => metrics.perfectCompletedCount >= 1,
    },
    {
      id: "p01",
      tier: "platinum",
      name: "Platinum Path",
      description: "Lås upp alla andra trophies.",
      check: null,
    },
  ];

  // Validate trophy distribution matches tier metadata
  const trophyDistribution = catalog.reduce((acc, trophy) => {
    acc[trophy.tier] = (acc[trophy.tier] ?? 0) + 1;
    return acc;
  }, {});
  if (
    trophyDistribution.bronze !== TROPHY_TIER_META.bronze.total ||
    trophyDistribution.silver !== TROPHY_TIER_META.silver.total ||
    trophyDistribution.gold !== TROPHY_TIER_META.gold.total ||
    trophyDistribution.platinum !== TROPHY_TIER_META.platinum.total
  ) {
    throw new Error("Trophy catalog must contain 15 bronze, 10 silver, 5 gold and 1 platinum.");
  }

  return catalog;
}
