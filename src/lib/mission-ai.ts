import {
  mockDailyMissions,
  mockRecentMissionHistory,
} from "@/lib/mock-daily-missions";
import { selectTodayMission } from "@/lib/daily-mission-selector";
import type { DailyMission, MissionSelectionContext } from "@/types/mission";

export type MissionApiResult = {
  mission: DailyMission;
  source: "mock";
  reason: string;
};

export function getDefaultMissionContext(): MissionSelectionContext {
  return {
    date: "2026-06-14",
    weather: "cloudy",
    isWeekend: true,
    recentHistory: mockRecentMissionHistory,
  };
}

export async function getRecommendedMission(
  context: MissionSelectionContext = getDefaultMissionContext(),
): Promise<MissionApiResult> {
  const { mission } = selectTodayMission(context, mockDailyMissions);

  return {
    mission: mission ?? mockDailyMissions[0],
    source: "mock",
    reason: "현재는 기본 미션 추천 로직을 사용하고 있어요.",
  };
}

export async function generateTodayMission(
  context: MissionSelectionContext = getDefaultMissionContext(),
) {
  return getRecommendedMission(context);
}
