import { initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  WriteBatch,
} from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

initializeApp();

const db = getFirestore();

const MAIN_PLAYER_FIELDS = ["player1", "player2", "player3", "player4"];

function toNumber(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toStringValue(value: any) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function nowIso() {
  return new Date().toISOString();
}

async function getCurrentGameweek() {
  const settingsSnap = await db.collection("settings").limit(1).get();

  if (settingsSnap.empty) return null;

  return toNumber(settingsSnap.docs[0].data().currentGameweek || 0);
}

async function getPlayerAliasData() {
  const playersSnap = await db.collection("players").get();

  const aliasToCanonical = new Map<string, string>();
  const playerAliasGroups: string[][] = [];

  playersSnap.docs.forEach((playerDoc) => {
    const data = playerDoc.data();

    const aliases = [
      playerDoc.id,
      data.ID,
      data.name,
      data.Title,
    ]
      .map(toStringValue)
      .filter(Boolean);

    if (aliases.length === 0) return;

    const canonical = playerDoc.id;

    aliases.forEach((alias) => {
      aliasToCanonical.set(alias, canonical);
    });

    playerAliasGroups.push(aliases);
  });

  return {
    aliasToCanonical,
    playerAliasGroups,
  };
}

function samePlayer(
  a: any,
  b: any,
  aliasToCanonical: Map<string, string>
) {
  const aStr = toStringValue(a);
  const bStr = toStringValue(b);

  if (!aStr || !bStr) return false;
  if (aStr === bStr) return true;

  const aCanonical = aliasToCanonical.get(aStr) || aStr;
  const bCanonical = aliasToCanonical.get(bStr) || bStr;

  return aCanonical === bCanonical;
}

function getPlayerPoints(
  playerKey: any,
  pointsByAlias: Map<string, number>,
  aliasToCanonical: Map<string, string>
) {
  const key = toStringValue(playerKey);

  if (!key) return 0;

  if (pointsByAlias.has(key)) {
    return pointsByAlias.get(key) || 0;
  }

  const canonical = aliasToCanonical.get(key);

  if (canonical && pointsByAlias.has(canonical)) {
    return pointsByAlias.get(canonical) || 0;
  }

  return 0;
}

async function buildPointsMapForGameweek(gameweek: number) {
  const { aliasToCanonical, playerAliasGroups } = await getPlayerAliasData();

  const statsSnap = await db
    .collection("playerMatchStats")
    .where("gameweek", "==", gameweek)
    .get();

  const pointsByAlias = new Map<string, number>();

  statsSnap.docs.forEach((statDoc) => {
    const data = statDoc.data();

    const statPoints = toNumber(data.gwPoints || 0);

    const directAliases = [
      data.player,
      data.Title,
      data.name,
      statDoc.id,
    ]
      .map(toStringValue)
      .filter(Boolean);

    const allAliasesForThisStat = new Set<string>();

    directAliases.forEach((alias) => allAliasesForThisStat.add(alias));

    playerAliasGroups.forEach((aliasGroup) => {
      const matchesThisStat = aliasGroup.some((alias) =>
        directAliases.includes(alias)
      );

      if (matchesThisStat) {
        aliasGroup.forEach((alias) => allAliasesForThisStat.add(alias));
      }
    });

    allAliasesForThisStat.forEach((alias) => {
      pointsByAlias.set(alias, statPoints);

      const canonical = aliasToCanonical.get(alias);

      if (canonical) {
        pointsByAlias.set(canonical, statPoints);
      }
    });
  });

  return {
    pointsByAlias,
    aliasToCanonical,
  };
}

function calculateTeamGwPoints(
  teamData: FirebaseFirestore.DocumentData,
  pointsByAlias: Map<string, number>,
  aliasToCanonical: Map<string, string>
) {
  const captain = teamData.captain;

  return MAIN_PLAYER_FIELDS.reduce((total, field) => {
    const playerId = teamData[field];

    if (!playerId) return total;

    const playerPoints = getPlayerPoints(
      playerId,
      pointsByAlias,
      aliasToCanonical
    );

    const isCaptain = samePlayer(playerId, captain, aliasToCanonical);

    return total + (isCaptain ? playerPoints * 2 : playerPoints);
  }, 0);
}

async function commitBatchIfNeeded(batch: WriteBatch, opCount: number) {
  if (opCount > 0) {
    await batch.commit();
  }
}

/**
 * Trigger 1:
 * Whenever playerMatchStats changes, recalculate all gameweekTeams.gwPoints
 * for that gameweek.
 */
export const syncGameweekTeamsWhenPlayerStatsChange = onDocumentWritten(
  {
    document: "playerMatchStats/{statId}",
    region: "us-central1",
  },
  async (event) => {
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;

    const beforeData = beforeSnap?.exists ? beforeSnap.data() : null;
    const afterData = afterSnap?.exists ? afterSnap.data() : null;

    const affectedGameweeks = new Set<number>();

    if (beforeData?.gameweek) {
      affectedGameweeks.add(toNumber(beforeData.gameweek));
    }

    if (afterData?.gameweek) {
      affectedGameweeks.add(toNumber(afterData.gameweek));
    }

    if (affectedGameweeks.size === 0) {
      logger.info("No gameweek found on playerMatchStats write.");
      return;
    }

    for (const gameweek of affectedGameweeks) {
      if (!gameweek) continue;

      logger.info(`Recalculating gameweekTeams for GW${gameweek}`);

      const { pointsByAlias, aliasToCanonical } =
        await buildPointsMapForGameweek(gameweek);

      const teamsSnap = await db
        .collection("gameweekTeams")
        .where("gameweek", "==", gameweek)
        .get();

      let batch = db.batch();
      let opCount = 0;
      const updatedAt = nowIso();

      teamsSnap.docs.forEach((teamDoc) => {
        const teamData = teamDoc.data();

        const oldGwPoints = toNumber(teamData.gwPoints || 0);

        const newGwPoints = calculateTeamGwPoints(
          teamData,
          pointsByAlias,
          aliasToCanonical
        );

        if (newGwPoints === oldGwPoints) return;

        batch.update(teamDoc.ref, {
          gwPoints: newGwPoints,
          "Updated Date": updatedAt,
          gwPointsSyncedAt: updatedAt,
          gwPointsSyncedBy: "playerMatchStatsTrigger",
        });

        opCount += 1;
      });

      await commitBatchIfNeeded(batch, opCount);

      logger.info(
        `GW${gameweek} recalculation complete. Updated ${opCount} team(s).`
      );
    }
  }
);

async function updateUserTeamsByOwnerEmail({
  ownerEmail,
  gameweek,
  totalPointsDelta,
  currentGwPointsValue,
  currentGameweek,
}: {
  ownerEmail: string;
  gameweek: number;
  totalPointsDelta: number;
  currentGwPointsValue?: number;
  currentGameweek: number | null;
}) {
  if (!ownerEmail) return;
  if (totalPointsDelta === 0 && currentGwPointsValue === undefined) return;

  const userTeamsSnap = await db
    .collection("userTeams")
    .where("ownerEmail", "==", ownerEmail)
    .get();

  if (userTeamsSnap.empty) {
    logger.warn(`No userTeam found for ${ownerEmail}`);
    return;
  }

  const updatedAt = nowIso();
  const batch = db.batch();

  userTeamsSnap.docs.forEach((userTeamDoc) => {
    const updateData: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> =
      {
        totalPoints: FieldValue.increment(totalPointsDelta),
        lastAutoTotalSyncGameweek: gameweek,
        lastAutoTotalSyncDiff: totalPointsDelta,
        lastAutoTotalSyncAt: updatedAt,
        "Updated Date": updatedAt,
      };

    if (
      currentGameweek &&
      gameweek === currentGameweek &&
      currentGwPointsValue !== undefined
    ) {
      updateData.gameweekPoints = currentGwPointsValue;
    }

    batch.update(userTeamDoc.ref, updateData);
  });

  await batch.commit();
}

/**
 * Trigger 2:
 * Whenever gameweekTeams.gwPoints changes, update userTeams.totalPoints
 * by the difference.
 *
 * Example:
 * old gwPoints = 70
 * new gwPoints = 90
 * difference = +20
 * userTeams.totalPoints += 20
 */
export const syncTotalPointsWhenGameweekTeamPointsChange = onDocumentWritten(
  {
    document: "gameweekTeams/{teamId}",
    region: "us-central1",
  },
  async (event) => {
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;

    const beforeExists = !!beforeSnap?.exists;
    const afterExists = !!afterSnap?.exists;

    const beforeData = beforeExists ? beforeSnap!.data() : null;
    const afterData = afterExists ? afterSnap!.data() : null;

    const currentGameweek = await getCurrentGameweek();

    /**
     * Normal case:
     * same team document, same owner, same gameweek,
     * only gwPoints changed.
     */
    if (beforeData && afterData) {
      const beforeOwnerEmail = toStringValue(beforeData.ownerEmail);
      const afterOwnerEmail = toStringValue(afterData.ownerEmail);

      const beforeGameweek = toNumber(beforeData.gameweek || 0);
      const afterGameweek = toNumber(afterData.gameweek || 0);

      const oldGwPoints = toNumber(beforeData.gwPoints || 0);
      const newGwPoints = toNumber(afterData.gwPoints || 0);

      if (
        beforeOwnerEmail === afterOwnerEmail &&
        beforeGameweek === afterGameweek
      ) {
        const difference = newGwPoints - oldGwPoints;

        if (difference === 0) return;

        await updateUserTeamsByOwnerEmail({
          ownerEmail: afterOwnerEmail,
          gameweek: afterGameweek,
          totalPointsDelta: difference,
          currentGwPointsValue: newGwPoints,
          currentGameweek,
        });

        logger.info(
          `Updated totalPoints for ${afterOwnerEmail}. GW${afterGameweek} diff: ${difference}`
        );

        return;
      }

      /**
       * Rare case:
       * ownerEmail or gameweek changed.
       * Subtract old points from old owner/gameweek,
       * add new points to new owner/gameweek.
       */
      if (beforeOwnerEmail && oldGwPoints !== 0) {
        await updateUserTeamsByOwnerEmail({
          ownerEmail: beforeOwnerEmail,
          gameweek: beforeGameweek,
          totalPointsDelta: -oldGwPoints,
          currentGwPointsValue: 0,
          currentGameweek,
        });
      }

      if (afterOwnerEmail && newGwPoints !== 0) {
        await updateUserTeamsByOwnerEmail({
          ownerEmail: afterOwnerEmail,
          gameweek: afterGameweek,
          totalPointsDelta: newGwPoints,
          currentGwPointsValue: newGwPoints,
          currentGameweek,
        });
      }

      return;
    }

    /**
     * Team created:
     * add its gwPoints to totalPoints.
     */
    if (!beforeData && afterData) {
      const ownerEmail = toStringValue(afterData.ownerEmail);
      const gameweek = toNumber(afterData.gameweek || 0);
      const newGwPoints = toNumber(afterData.gwPoints || 0);

      if (newGwPoints === 0) return;

      await updateUserTeamsByOwnerEmail({
        ownerEmail,
        gameweek,
        totalPointsDelta: newGwPoints,
        currentGwPointsValue: newGwPoints,
        currentGameweek,
      });

      logger.info(
        `gameweekTeam created. Added ${newGwPoints} totalPoints for ${ownerEmail}`
      );

      return;
    }

    /**
     * Team deleted:
     * subtract its old gwPoints from totalPoints.
     */
    if (beforeData && !afterData) {
      const ownerEmail = toStringValue(beforeData.ownerEmail);
      const gameweek = toNumber(beforeData.gameweek || 0);
      const oldGwPoints = toNumber(beforeData.gwPoints || 0);

      if (oldGwPoints === 0) return;

      await updateUserTeamsByOwnerEmail({
        ownerEmail,
        gameweek,
        totalPointsDelta: -oldGwPoints,
        currentGwPointsValue: 0,
        currentGameweek,
      });

      logger.info(
        `gameweekTeam deleted. Subtracted ${oldGwPoints} totalPoints for ${ownerEmail}`
      );
    }
  }
);
