/**
 * Shared logic for shop crates.
 *
 * Crates are admin-designed bundles of shop items. A manager buys one with
 * coins and it bursts open into exactly one item, drawn at random: each
 * item's rarity sets its drop weight, so the higher the rarity the harder
 * the pull. Higher rarities also get longer, bigger opening animations on
 * the shop page (see components/CrateOpeningOverlay).
 *
 * Rarity keys intentionally mirror the limited-card rarities so colors stay
 * consistent across the app: common, uncommon, rare, epic, legendary, icon.
 */

export type CrateRarityKey =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "icon";

export type CrateRarityTier = {
  key: CrateRarityKey;
  label: string;
  color: string;
  /** Relative drop weight: the higher, the more common the pull. */
  weight: number;
  /** Opening-animation phase lengths (ms). Rarer pulls take longer. */
  shakeMs: number;
  chargeMs: number;
  burstMs: number;
  /** Visual intensity knobs used by the opening overlay. */
  particles: number;
  rings: number;
  shakeAmp: number;
  screenShake: boolean;
  rays: boolean;
  beam: boolean;
  rainbow: boolean;
  /** Caption shown when the item is revealed. */
  hype: string;
};

export const CRATE_RARITIES: CrateRarityTier[] = [
  {
    key: "common",
    label: "Common",
    color: "#9ca3af",
    weight: 100,
    shakeMs: 900,
    chargeMs: 500,
    burstMs: 350,
    particles: 14,
    rings: 1,
    shakeAmp: 3,
    screenShake: false,
    rays: false,
    beam: false,
    rainbow: false,
    hype: "A solid drop.",
  },
  {
    key: "uncommon",
    label: "Uncommon",
    color: "#22c55e",
    weight: 60,
    shakeMs: 1200,
    chargeMs: 650,
    burstMs: 450,
    particles: 22,
    rings: 2,
    shakeAmp: 4,
    screenShake: false,
    rays: false,
    beam: false,
    rainbow: false,
    hype: "Nice pull!",
  },
  {
    key: "rare",
    label: "Rare",
    color: "#0347f4",
    weight: 32,
    shakeMs: 1600,
    chargeMs: 850,
    burstMs: 550,
    particles: 30,
    rings: 2,
    shakeAmp: 6,
    screenShake: false,
    rays: false,
    beam: false,
    rainbow: false,
    hype: "Rare find!",
  },
  {
    key: "epic",
    label: "Epic",
    color: "#a855f7",
    weight: 15,
    shakeMs: 2100,
    chargeMs: 1100,
    burstMs: 700,
    particles: 38,
    rings: 3,
    shakeAmp: 8,
    screenShake: true,
    rays: false,
    beam: false,
    rainbow: false,
    hype: "Epic pull!",
  },
  {
    key: "legendary",
    label: "Legendary",
    color: "#ffce1b",
    weight: 6,
    shakeMs: 2800,
    chargeMs: 1500,
    burstMs: 900,
    particles: 48,
    rings: 3,
    shakeAmp: 10,
    screenShake: true,
    rays: true,
    beam: false,
    rainbow: false,
    hype: "LEGENDARY PULL!",
  },
  {
    key: "icon",
    label: "Icon",
    color: "#22d3ee",
    weight: 2,
    shakeMs: 3600,
    chargeMs: 2000,
    burstMs: 1200,
    particles: 58,
    rings: 4,
    shakeAmp: 12,
    screenShake: true,
    rays: true,
    beam: true,
    rainbow: true,
    hype: "ICON TIER PULL!!!",
  },
];

/**
 * Maps any free-text rarity (shop items keep rarity as a plain string) onto
 * the nearest canonical crate tier. Unrecognised values fall back to common.
 */
export function normalizeCrateRarity(rarity?: string | null): CrateRarityKey {
  const value = String(rarity || "")
    .trim()
    .toLowerCase();

  if (!value) return "common";

  const exact = CRATE_RARITIES.find((tier) => tier.key === value);
  if (exact) return exact.key;

  // Substring checks are order-sensitive: "uncommon" contains "common", so
  // it must be tested before the common fallback (which is the default).
  if (
    value.includes("icon") ||
    value.includes("myth") ||
    value.includes("ultimate") ||
    value.includes("black")
  ) {
    return "icon";
  }

  if (value.includes("legend")) return "legendary";
  if (value.includes("epic") || value.includes("purple")) return "epic";
  if (value.includes("uncommon") || value.includes("green")) return "uncommon";
  if (value.includes("rare") || value.includes("blue")) return "rare";

  return "common";
}

/** 0 (common) .. 5 (icon) — handy for sorting contents rarest-first. */
export function crateRarityRank(rarity?: string | null): number {
  const key = normalizeCrateRarity(rarity);
  return CRATE_RARITIES.findIndex((tier) => tier.key === key);
}

export function getCrateRarityTier(
  rarity?: string | null
): CrateRarityTier {
  const key = normalizeCrateRarity(rarity);
  return CRATE_RARITIES.find((tier) => tier.key === key) || CRATE_RARITIES[0];
}

/** One entry of a crate's contents, denormalised from the shop item. */
export type CrateItem = {
  itemId: string;
  itemName: string;
  itemType: string;
  rarity: string;
  image?: string;
};

export type Crate = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  items: CrateItem[];
  isVisible: boolean;
  showNewTag?: boolean;
  showLeavingTodayTag?: boolean;
};

export type CrateOddsEntry = {
  item: CrateItem;
  tier: CrateRarityTier;
  /** 0..1 chance of this exact item being drawn. */
  chance: number;
};

/** Per-item drop chances for a crate's contents. */
export function crateOdds(items?: CrateItem[] | null): CrateOddsEntry[] {
  const entries = (items || [])
    .filter((item) => String(item.itemId || ""))
    .map((item) => ({ item, tier: getCrateRarityTier(item.rarity) }));

  const totalWeight =
    entries.reduce((sum, entry) => sum + entry.tier.weight, 0) || 1;

  return entries.map((entry) => ({
    ...entry,
    chance: entry.tier.weight / totalWeight,
  }));
}

export type CrateRaritySummaryEntry = {
  tier: CrateRarityTier;
  count: number;
  /** 0..1 chance of pulling any item of this rarity from the crate. */
  chance: number;
};

/** Aggregated chances per rarity, sorted rarest-first. */
export function crateRaritySummary(
  items?: CrateItem[] | null
): CrateRaritySummaryEntry[] {
  const entries = (items || [])
    .filter((item) => String(item.itemId || ""))
    .map((item) => getCrateRarityTier(item.rarity));

  const totalWeight = entries.reduce((sum, tier) => sum + tier.weight, 0) || 1;

  const byKey = new Map<
    string,
    { tier: CrateRarityTier; count: number; weight: number }
  >();

  entries.forEach((tier) => {
    const current = byKey.get(tier.key) || {
      tier,
      count: 0,
      weight: 0,
    };

    current.count += 1;
    current.weight += tier.weight;

    byKey.set(tier.key, current);
  });

  return Array.from(byKey.values())
    .map(({ tier, count, weight }) => ({
      tier,
      count,
      chance: weight / totalWeight,
    }))
    .sort(
      (a, b) =>
        crateRarityRank(b.tier.key) - crateRarityRank(a.tier.key)
    );
}

/**
 * Draws one item from the crate, weighted by rarity. Pure client-side
 * randomness, mirroring how the rest of the app trusts the manager client.
 */
export function drawCrateItem(
  items?: CrateItem[] | null
): CrateItem | null {
  const entries = (items || [])
    .filter((item) => String(item.itemId || ""))
    .map((item) => ({ item, tier: getCrateRarityTier(item.rarity) }));

  if (entries.length === 0) return null;

  const totalWeight = entries.reduce((sum, entry) => sum + entry.tier.weight, 0);

  let roll = Math.random() * totalWeight;

  for (const entry of entries) {
    roll -= entry.tier.weight;

    if (roll <= 0) return entry.item;
  }

  return entries[entries.length - 1].item;
}

/** Wix media URLs (used by imported images) resolve to their static CDN. */
export function getCrateImageUrl(url?: string | null) {
  if (!url) return "";

  if (url.startsWith("wix:image://v1/")) {
    const guid = url.split("/")[3];
    return `https://static.wixstatic.com/media/${guid}~mv2.png`;
  }

  return url;
}
