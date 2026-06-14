import {
  mockDailyMissions,
  mockRecentMissionHistory,
} from "@/lib/mock-daily-missions";
import type {
  DailyMission,
  MissionHistoryEntry,
  MissionSelectionContext,
} from "@/types/mission";

const MAX_CATEGORY_COUNT_IN_7_DAYS = 2;
const MAX_TAG_OVERLAP = 1;
const MAX_DURATION_MINUTES = 20;

function countCategory(history: MissionHistoryEntry[], category: DailyMission["category"]) {
  return history.filter((entry) => entry.category === category).length;
}

function overlapTagCount(previousTags: string[], nextTags: string[]) {
  const previousTagSet = new Set(previousTags);

  return nextTags.filter((tag) => previousTagSet.has(tag)).length;
}

function matchesWeekAvailability(
  mission: DailyMission,
  isWeekend: boolean,
) {
  if (mission.weekAvailability === "any") {
    return true;
  }

  return isWeekend
    ? mission.weekAvailability === "weekend"
    : mission.weekAvailability === "weekday";
}

function isMissionEligible(
  mission: DailyMission,
  context: MissionSelectionContext,
) {
  const yesterdayMission = context.recentHistory.at(-1);

  if (mission.durationMinutes > MAX_DURATION_MINUTES) {
    return false;
  }

  if (!matchesWeekAvailability(mission, context.isWeekend)) {
    return false;
  }

  if (mission.supplyLevel !== "none" && mission.supplyLevel !== "minimal") {
    return false;
  }

  if (mission.weatherSensitivity === "high" && context.weather === "rainy") {
    return false;
  }

  if (mission.space === "outdoor" && context.weather === "snowy") {
    return false;
  }

  if (yesterdayMission?.category === mission.category) {
    return false;
  }

  if (countCategory(context.recentHistory, mission.category) >= MAX_CATEGORY_COUNT_IN_7_DAYS) {
    return false;
  }

  if (
    yesterdayMission?.actionDifficulty === "high" &&
    mission.actionDifficulty === "high"
  ) {
    return false;
  }

  if (yesterdayMission?.space === mission.space) {
    return false;
  }

  if (
    context.recentHistory.some((entry) => {
      if (entry.missionId === mission.id) {
        return true;
      }

      return overlapTagCount(entry.tags, mission.tags) > MAX_TAG_OVERLAP;
    })
  ) {
    return false;
  }

  return true;
}

function getDateSeed(date: string) {
  return date.split("-").join("").split("").reduce((sum, digit) => sum + Number(digit), 0);
}

function scoreMission(mission: DailyMission, dateSeed: number) {
  const titleSeed = mission.title
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);

  return (titleSeed + dateSeed) % 1000;
}

export function selectTodayMission(
  context: MissionSelectionContext,
  missions: DailyMission[] = mockDailyMissions,
) {
  const eligibleMissions = missions.filter((mission) =>
    isMissionEligible(mission, context),
  );

  const dateSeed = getDateSeed(context.date);
  const sortedMissions = eligibleMissions.sort(
    (left, right) => scoreMission(left, dateSeed) - scoreMission(right, dateSeed),
  );

  return {
    mission: sortedMissions[0] ?? null,
    eligibleMissions: sortedMissions,
  };
}

export function getMockMissionSelection() {
  const context: MissionSelectionContext = {
    date: "2026-06-07",
    weather: "cloudy",
    isWeekend: true,
    recentHistory: mockRecentMissionHistory,
  };

  return {
    context,
    ...selectTodayMission(context),
  };
}
