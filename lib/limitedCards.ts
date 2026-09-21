/**
 * Shared logic for limited player cards.
 *
 * Limited cards are admin-designed boost items linked to one esports player.
 * Managers buy copies in the shop with coins, attach them to the linked
 * player while building a gameweek squad on the transfers page, and each
 * copy's boost is applied (and the copy consumed) when the admin syncs that
 * gameweek's scores.
 */

export type LimitedCard = {
  id: string;
  ID: string;
  cardName: string;
  rarity: string;
  image: string;
  accentColor?: string;
  shopPrice: number;
  transferPrice: number;
  playerId: string;
  boostStat: string;
  boostValue: number;
  powerupText: string;
  stock: number;
  isVisible: boolean;
  showNewTag?: boolean;
  showLeavingTodayTag?: boolean;
};

export type LimitedCardStatus = "owned" | "active" | "used";

export type UserLimitedCard = {
  id: string;
  ownerEmail?: string;
  ownerUid?: string;
  cardId: string;
  status: LimitedCardStatus;
  gameweek: number;
};

export const LIMITED_CARD_RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "icon",
] as const;

export function getLimitedCardRarityColor(
  rarity?: string,
  accentColor?: string
) {
  if (
    accentColor &&
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(accentColor)
  ) {
    return accentColor;
  }

  switch ((rarity || "").toLowerCase()) {
    case "common":
      return "#9ca3af";
    case "uncommon":
      return "#22c55e";
    case "rare":
      return "#0347f4";
    case "epic":
      return "#a855f7";
    case "legendary":
      return "#ffce1b";
    case "icon":
      return "#22d3ee";
    default:
      return "#9ca3af";
  }
}

export function getLimitedCardImageUrl(url?: string) {
  if (!url) return "";

  if (url.startsWith("wix:image://v1/")) {
    const guid = url.split("/")[3];
    return `https://static.wixstatic.com/media/${guid}~mv2.png`;
  }

  return url;
}

type LimitedCardStatOption = { value: string; label: string };

const COMMON_STAT_OPTIONS: LimitedCardStatOption[] = [
  { value: "matchWin", label: "Match Wins" },
  { value: "matchLose", label: "Match Losses" },
  { value: "mvp", label: "MVPs" },
  { value: "svp", label: "SVPs" },
  { value: "bonus", label: "Bonus Points" },
];

const VALORANT_STAT_OPTIONS: LimitedCardStatOption[] = [
  ...COMMON_STAT_OPTIONS,
  { value: "kills", label: "Kills" },
  { value: "assists", label: "Assists" },
  { value: "deaths", label: "Deaths" },
  { value: "firstBlood", label: "First Bloods" },
  { value: "firstDeath", label: "First Deaths" },
  { value: "tripleKill", label: "Triple Kills" },
  { value: "quadraKill", label: "Quadra Kills" },
  { value: "ace", label: "Aces" },
  { value: "clutch", label: "Clutches" },
];

const OTHER_GAME_STAT_OPTIONS: LimitedCardStatOption[] = [
  ...COMMON_STAT_OPTIONS,
  { value: "kills", label: "Kills" },
  { value: "assists", label: "Assists" },
  { value: "deaths", label: "Deaths" },
  { value: "lastKills", label: "Last Kills" },
  { value: "headKill", label: "Headshot Kills" },
  { value: "healing", label: "Healing" },
  { value: "damage", label: "Damage" },
  { value: "blocked", label: "Damage Blocked" },
  { value: "soloKills", label: "Solo Kills" },
];

const ALL_STAT_OPTIONS: LimitedCardStatOption[] = [
  ...VALORANT_STAT_OPTIONS,
  ...OTHER_GAME_STAT_OPTIONS.filter(
    (option) => !VALORANT_STAT_OPTIONS.some((v) => v.value === option.value)
  ),
];

export function limitedCardStatOptions(game?: string): LimitedCardStatOption[] {
  if (String(game || "").toLowerCase() === "valorant") {
    return VALORANT_STAT_OPTIONS;
  }

  if (!game) {
    return ALL_STAT_OPTIONS;
  }

  return OTHER_GAME_STAT_OPTIONS;
}

export function limitedCardStatLabel(statKey?: string): string {
  const found = ALL_STAT_OPTIONS.find(
    (option) => option.value === String(statKey || "")
  );

  return found ? found.label : String(statKey || "points");
}

/**
 * Points a single stat earned for one player in one gameweek, mirroring the
 * admin stats calculator exactly so boosts always match the scoring rules.
 */
export function statPointsFor(
  game: string | null | undefined,
  statKey: string,
  stats: Record<string, any> | null | undefined
): number {
  const value = Number((stats || {})[statKey] || 0);

  if (!Number.isFinite(value) || value === 0) return 0;

  const isValorant = String(game || "").toLowerCase() === "valorant";

  switch (statKey) {
    case "matchWin":
      return value * 2;
    case "matchLose":
      return value * -2;
    case "mvp":
      return value * 8;
    case "svp":
      return value * 5;
    case "bonus":
      return value;
    case "kills":
      return isValorant ? Math.floor(value / 2) : Math.floor(value / 3);
    case "assists":
      return isValorant ? Math.floor(value / 2) : Math.floor(value / 4);
    case "deaths":
      return isValorant ? -Math.floor(value / 3) : value * -2;
    case "firstBlood":
      return value;
    case "firstDeath":
      return value * -1;
    case "tripleKill":
      return value * 3;
    case "quadraKill":
      return value * 5;
    case "ace":
      return value * 8;
    case "clutch":
      return value * 2;
    case "lastKills":
      return Math.floor(value / 2);
    case "headKill":
      return value * 3;
    case "healing":
      return Math.floor(value / 5050);
    case "damage":
      return Math.floor(value / 5050);
    case "blocked":
      return Math.floor(value / 5050);
    case "soloKills":
      return value;
    default:
      return 0;
  }
}

/**
 * Extra points a limited card adds for its linked player: the stat's points
 * multiplied by the boost value, minus what the stat already earned.
 */
export function limitedCardBoostDelta(
  game: string | null | undefined,
  card: { boostStat?: string; boostValue?: number } | null | undefined,
  stats: Record<string, any> | null | undefined
): number {
  if (!card) return 0;

  const statPoints = statPointsFor(game, String(card.boostStat || ""), stats);
  const multiplier = Number(card.boostValue ?? 1);

  if (!Number.isFinite(multiplier) || statPoints === 0 || multiplier === 1) {
    return 0;
  }

  return Math.round(statPoints * multiplier - statPoints);
}

export function limitedCardPowerupText(card: {
  boostStat?: string;
  boostValue?: number;
  powerupText?: string;
}): string {
  const custom = String(card.powerupText || "").trim();

  if (custom) return custom;

  const label = limitedCardStatLabel(card.boostStat).toLowerCase();
  const value = Number(card.boostValue ?? 1);

  return `Boosts this player's ${label} points by ${value}×`;
}
