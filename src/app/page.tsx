"use client";

import { useMemo, useState } from "react";
import { KakaoMapSection } from "@/components/map/kakao-map-section";

type PageTab = "home" | "map" | "mission" | "ranking";
type PlaceType = "indoor" | "outdoor";
type VerifyType =
  | "photo"
  | "check"
  | "photo_or_check"
  | "gps_or_check"
  | "post";
type SafetyLevel = "safe" | "caution";

type Mission = {
  id: string;
  title: string;
  category: string;
  description: string;
  difficulty: number;
  ecoReward: number;
  placeType: PlaceType;
  verifyType: VerifyType;
  verifyGuide: string;
  estimatedTime: string;
  safetyLevel: SafetyLevel;
  requiredItems: string[];
};

const missionDummyData: Mission[] = [
  {
    id: "mission_001",
    title: "텀블러 들고 다니기",
    category: "일회용품 줄이기",
    description: "오늘은 일회용 컵 대신 개인 텀블러를 사용해 봐요.",
    difficulty: 2,
    ecoReward: 7,
    placeType: "indoor",
    verifyType: "photo",
    verifyGuide: "텀블러나 음료 사진을 올려서 인증해 주세요.",
    estimatedTime: "5분",
    safetyLevel: "safe",
    requiredItems: ["텀블러"],
  },
  {
    id: "mission_002",
    title: "재활용 분리배출 제대로 하기",
    category: "분리배출",
    description: "병, 캔, 종이류 중 하나를 깨끗하게 정리해서 분리배출해 봐요.",
    difficulty: 2,
    ecoReward: 8,
    placeType: "indoor",
    verifyType: "photo",
    verifyGuide: "분리배출 전에 사진 한 장으로 인증해 주세요.",
    estimatedTime: "10분",
    safetyLevel: "safe",
    requiredItems: [],
  },
  {
    id: "mission_003",
    title: "안 쓰는 플러그 두 개 뽑기",
    category: "에너지 절약",
    description: "사용하지 않는 충전기나 전자기기 플러그를 두 개 찾아 뽑아 봐요.",
    difficulty: 1,
    ecoReward: 5,
    placeType: "indoor",
    verifyType: "photo",
    verifyGuide: "플러그가 보이는 사진이나 전후 사진을 올려 주세요.",
    estimatedTime: "3분",
    safetyLevel: "safe",
    requiredItems: [],
  },
  {
    id: "mission_004",
    title: "샤워 시간 3분 줄이기",
    category: "물 절약",
    description: "오늘은 샤워 시간을 조금 줄여서 물을 아껴 봐요.",
    difficulty: 2,
    ecoReward: 6,
    placeType: "indoor",
    verifyType: "check",
    verifyGuide: "샤워 후 체크 버튼으로 인증해 주세요.",
    estimatedTime: "하루 루틴",
    safetyLevel: "safe",
    requiredItems: [],
  },
  {
    id: "mission_005",
    title: "음식 남기지 않기",
    category: "음식물 쓰레기 줄이기",
    description: "한 끼를 알맞게 먹고 음식물 쓰레기를 줄여 봐요.",
    difficulty: 2,
    ecoReward: 6,
    placeType: "indoor",
    verifyType: "photo_or_check",
    verifyGuide: "빈 그릇 사진이나 체크 인증으로 완료할 수 있어요.",
    estimatedTime: "한 끼",
    safetyLevel: "safe",
    requiredItems: [],
  },
  {
    id: "mission_006",
    title: "짧은 거리는 걸어서 이동하기",
    category: "친환경 이동",
    description: "집이나 학교 근처의 짧은 거리는 걸어서 이동해 봐요.",
    difficulty: 3,
    ecoReward: 8,
    placeType: "outdoor",
    verifyType: "gps_or_check",
    verifyGuide: "위치 확인이나 수동 체크로 완료할 수 있어요.",
    estimatedTime: "10~20분",
    safetyLevel: "caution",
    requiredItems: [],
  },
  {
    id: "mission_007",
    title: "친환경 실천 공유하기",
    category: "커뮤니티",
    description: "오늘 실천한 친환경 행동을 짧게 기록해 친구들과 공유해 봐요.",
    difficulty: 1,
    ecoReward: 5,
    placeType: "indoor",
    verifyType: "post",
    verifyGuide: "짧은 글이나 사진과 함께 게시글을 올려 주세요.",
    estimatedTime: "5분",
    safetyLevel: "safe",
    requiredItems: [],
  },
];

const recentMissionHistory = [
  { dayOffset: 1, category: "일회용품 줄이기", placeType: "indoor", difficulty: 2 },
  { dayOffset: 2, category: "친환경 이동", placeType: "outdoor", difficulty: 3 },
  { dayOffset: 3, category: "분리배출", placeType: "indoor", difficulty: 2 },
  { dayOffset: 4, category: "커뮤니티", placeType: "indoor", difficulty: 1 },
  { dayOffset: 5, category: "에너지 절약", placeType: "indoor", difficulty: 1 },
];

const HIGH_DIFFICULTY_THRESHOLD = 4;

function EarthCharacter() {
  return (
    <div className="relative h-40 w-40 shrink-0">
      <div className="absolute bottom-1 left-1/2 h-4 w-24 -translate-x-1/2 rounded-full bg-[#7aa8bb]/30 blur-[1px]" />

      <div className="absolute right-2 top-8 h-4 w-12 rounded-full bg-white/90" />
      <div className="absolute right-7 top-5 h-4 w-8 rounded-full bg-white/90" />
      <div className="absolute right-10 top-11 h-3 w-10 rounded-full bg-white/90" />
      <div className="absolute left-2 top-16 h-4 w-12 rounded-full bg-white/90" />
      <div className="absolute left-7 top-13 h-4 w-8 rounded-full bg-white/90" />
      <div className="absolute left-10 top-19 h-3 w-10 rounded-full bg-white/90" />

      <div className="absolute left-[28px] top-[26px] h-[90px] w-[90px] rounded-full border-[5px] border-[#27485d] bg-[#50aaf4] shadow-[0_14px_22px_rgba(39,72,93,0.18)]" />
      <div className="absolute left-[36px] top-[32px] h-[76px] w-[76px] rounded-full bg-[#76e67c]" />
      <div className="absolute left-[39px] top-[33px] h-[76px] w-[76px] rounded-full bg-[#3fa4ef]" />

      <div className="absolute left-[48px] top-[42px] h-8 w-9 rounded-[55%_45%_50%_50%] bg-[#79e676]" />
      <div className="absolute left-[60px] top-[54px] h-10 w-9 rounded-[50%_42%_55%_48%] bg-[#79e676]" />
      <div className="absolute left-[75px] top-[74px] h-6 w-6 rounded-full bg-[#93ef7a]" />
      <div className="absolute left-[42px] top-[78px] h-5 w-5 rounded-full bg-[#1483ea]" />
      <div className="absolute left-[71px] top-[40px] h-3 w-7 rotate-[18deg] rounded-full bg-white/45" />

      <div className="absolute left-[58px] top-[59px] h-2.5 w-2.5 rounded-full bg-[#27485d]" />
      <div className="absolute left-[74px] top-[59px] h-2.5 w-2.5 rounded-full bg-[#27485d]" />
      <div className="absolute left-[64px] top-[69px] h-4 w-5 rounded-b-full bg-[#27485d]" />
      <div className="absolute left-[63px] top-[71px] h-1.5 w-7 rounded-full bg-[#ff9fb8]" />
      <div className="absolute left-[50px] top-[68px] h-2 w-3 rounded-full bg-[#ffd3dc]" />

      <div className="absolute left-[24px] top-[48px] h-10 w-10">
        <div className="absolute left-4 top-0 h-7 w-[5px] -rotate-[28deg] rounded-full bg-[#27485d]" />
        <div className="absolute left-0 top-0 h-4 w-3 rounded-full bg-[#27485d]" />
      </div>

      <div className="absolute right-[20px] top-[54px] h-10 w-10">
        <div className="absolute right-4 top-0 h-7 w-[5px] rotate-[28deg] rounded-full bg-[#27485d]" />
        <div className="absolute right-0 top-2 h-4 w-3 rounded-full bg-[#27485d]" />
      </div>

      <div className="absolute left-[74px] top-[110px] h-12 w-6">
        <div className="absolute left-2 top-0 h-8 w-[5px] rotate-[8deg] rounded-full bg-[#27485d]" />
        <div className="absolute bottom-0 left-0 h-6 w-4 rotate-[10deg] rounded-full border-[4px] border-[#27485d] bg-[#50aaf4]" />
      </div>

      <div className="absolute left-[98px] top-[108px] h-12 w-6">
        <div className="absolute left-1 top-0 h-8 w-[5px] -rotate-[10deg] rounded-full bg-[#27485d]" />
        <div className="absolute bottom-0 left-0 h-6 w-4 -rotate-[10deg] rounded-full border-[4px] border-[#27485d] bg-[#50aaf4]" />
      </div>
    </div>
  );
}

function BottomNav({
  page,
  setPage,
}: {
  page: PageTab;
  setPage: (page: PageTab) => void;
}) {
  const items = [
    { icon: "홈", value: "home" as const },
    { icon: "지도", value: "map" as const },
    { icon: "미션", value: "mission" as const },
    { icon: "랭킹", value: "ranking" as const },
  ];

  return (
    <div className="sticky bottom-0 mt-2 border-t border-black/5 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 backdrop-blur">
      <div className="grid grid-cols-4 gap-2">
        {items.map((item) => (
          <button
            key={item.value}
            onClick={() => setPage(item.value)}
            className={`rounded-2xl px-2 py-2.5 text-[11px] font-black ${
              page === item.value
                ? "bg-[#e7f4d0] text-[#23553b]"
                : "text-[#6d7d6b]"
            }`}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

function HomeScreen() {
  return (
    <>
      <section className="rounded-[2rem] bg-[linear-gradient(135deg,#f4ffcf_0%,#dff7b8_42%,#b9efc8_100%)] px-4 py-4 text-[#1f4f37] shadow-[0_16px_34px_rgba(119,160,98,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black tracking-[0.14em] text-[#4f7b55] uppercase">
              Our Little Earth
            </p>
            <h1 className="mt-2 text-[1.9rem] font-black leading-[1.08] tracking-[-0.05em]">
              작은 실천으로
              <br />
              지구를 더 푸르게
            </h1>
            <p className="mt-1 text-sm leading-6 text-[#4a7351]">
              매일의 친환경 습관을 쌓고, 지구 빚을 함께 줄여 나가요.
            </p>
          </div>
          <div className="rounded-full border border-white/60 bg-white/72 px-3 py-2 text-[11px] font-black text-[#2f6941] shadow-sm">
            Day 16
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-white/55 bg-white/62 p-3 backdrop-blur-sm">
            <p className="text-[11px] text-[#5e845f]">오늘 획득</p>
            <p className="mt-1 text-xl font-black">+32</p>
            <p className="mt-1 text-[11px] text-[#5e845f]">에코 포인트</p>
          </div>
          <div className="rounded-2xl border border-white/55 bg-white/62 p-3 backdrop-blur-sm">
            <p className="text-[11px] text-[#5e845f]">연속 실천</p>
            <p className="mt-1 text-xl font-black">16일</p>
            <p className="mt-1 text-[11px] text-[#5e845f]">평균보다 4일 더</p>
          </div>
          <div className="rounded-2xl border border-white/55 bg-white/62 p-3 backdrop-blur-sm">
            <p className="text-[11px] text-[#5e845f]">우리 반 순위</p>
            <p className="mt-1 text-xl font-black">#3</p>
            <p className="mt-1 text-[11px] text-[#5e845f]">다음까지 130점</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-[#fff5d9] p-4 shadow-[0_14px_34px_rgba(77,76,38,0.12)]">
        <div className="flex items-start justify-between gap-3">
          <div className="max-w-[56%]">
            <h2 className="mt-2 text-[1.7rem] font-black leading-[1.15] tracking-[-0.04em] text-[#3f3423]">
              작은 친환경 습관을
              <br />
              눈에 보이는 변화로
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7a6853]">
              오늘의 실천 하나하나가 우리 팀의 지구 빚을 줄여 줘요.
            </p>
          </div>
          <EarthCharacter />
        </div>

        <div className="mt-4 rounded-[1.6rem] bg-[#295c3a] p-4 text-white shadow-sm">
          <p className="text-xs font-bold text-white/75">에코 포인트</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-4xl font-black">2,050</p>
            <p className="text-[11px] font-bold text-white/75">지구 빚 상환 중</p>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-white/75">
            최근 완료한 미션이 우리 팀을 좋은 방향으로 이끌고 있어요.
          </p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-black text-[#8c7258]">
            <span>이번 주 진행률</span>
            <span>38%</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-[#ead9ba]">
            <div className="h-3 w-[38%] rounded-full bg-[linear-gradient(90deg,#ef7f39_0%,#ffd15c_100%)]" />
          </div>
        </div>

        <button className="mt-4 w-full rounded-[1.25rem] bg-[#205f3d] px-4 py-3.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(32,95,61,0.24)]">
          오늘의 체크인 시작하기
        </button>
      </section>
    </>
  );
}

function verifyTypeLabel(type: VerifyType) {
  switch (type) {
    case "photo":
      return "사진 인증";
    case "check":
      return "체크 인증";
    case "photo_or_check":
      return "사진 또는 체크";
    case "gps_or_check":
      return "위치 또는 체크";
    case "post":
      return "게시글 인증";
  }
}

function getRecommendedMission(
  currentMissions: Mission[],
  boxMission: Mission | null,
) {
  const lastDay = recentMissionHistory[0];
  const categoryCount = new Map<string, number>();

  for (const item of recentMissionHistory) {
    categoryCount.set(item.category, (categoryCount.get(item.category) ?? 0) + 1);
  }

  const blockedIds = new Set([
    ...currentMissions.map((mission) => mission.id),
    ...(boxMission ? [boxMission.id] : []),
  ]);

  const filtered = missionDummyData.filter((mission) => {
    if (blockedIds.has(mission.id)) {
      return false;
    }

    if (mission.requiredItems.length > 2) {
      return false;
    }

    if (mission.safetyLevel !== "safe") {
      return false;
    }

    if (mission.placeType === "outdoor" && mission.verifyType === "gps_or_check") {
      return false;
    }

    if (mission.verifyType === "post") {
      return false;
    }

    if (lastDay.category === mission.category) {
      return false;
    }

    if ((categoryCount.get(mission.category) ?? 0) >= 2) {
      return false;
    }

    if (
      lastDay.difficulty >= HIGH_DIFFICULTY_THRESHOLD &&
      mission.difficulty >= HIGH_DIFFICULTY_THRESHOLD
    ) {
      return false;
    }

    if (lastDay.placeType === mission.placeType) {
      return false;
    }

    return true;
  });

  const available =
    filtered.length > 0
      ? filtered
      : missionDummyData.filter((mission) => !blockedIds.has(mission.id));

  return available[Math.floor(Math.random() * available.length)];
}

function MissionScreen({
  drawnMissions,
  completedMissionIds,
  boxMission,
  onDrawStart,
  onRevealMission,
  onResetMissions,
  onCompleteMission,
}: {
  drawnMissions: Mission[];
  completedMissionIds: string[];
  boxMission: Mission | null;
  onDrawStart: () => void;
  onRevealMission: () => void;
  onResetMissions: () => void;
  onCompleteMission: (missionId: string) => void;
}) {
  const canDrawMore = drawnMissions.length < 5 && boxMission === null;

  return (
    <section className="rounded-[1.9rem] bg-white p-4 shadow-[0_10px_30px_rgba(69,95,63,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#6f806d]">오늘의 미션</p>
          <h2 className="mt-1 text-[1.7rem] font-black tracking-[-0.04em] text-[#24382a]">
            AI 미션 추천
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6f7c69]">
            미션 박스를 열어 오늘 할 일을 추천받고, 최대 5개의 친환경 미션을
            진행해 보세요.
          </p>
        </div>
        <div className="rounded-full bg-[#eef5dc] px-3 py-1 text-[11px] font-black text-[#3d6b48]">
          {drawnMissions.length}/5
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onDrawStart}
          disabled={!canDrawMore}
          className="flex-1 rounded-[1.2rem] bg-[#295c3a] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#9eb79f]"
        >
          미션 뽑기
        </button>
        <button
          onClick={onResetMissions}
          className="rounded-[1.2rem] border border-[#dbe5d5] px-4 py-3 text-sm font-black text-[#5e745f]"
        >
          초기화
        </button>
      </div>

      {boxMission ? (
        <button
          onClick={onRevealMission}
          className="mt-4 flex w-full flex-col items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,#2d7c48_0%,#50a865_100%)] px-5 py-10 text-white shadow-[0_16px_36px_rgba(54,111,70,0.24)]"
        >
          <span className="text-sm font-bold text-white/80">오늘의 미션 박스</span>
          <span className="mt-3 text-5xl">열기</span>
          <span className="mt-4 text-lg font-black">
            눌러서 오늘의 추천 미션 확인하기
          </span>
        </button>
      ) : null}

      <div className="mt-4 space-y-2.5">
        {drawnMissions.length === 0 ? (
          <div className="rounded-[1.3rem] bg-[#f7f8ef] px-4 py-5 text-sm text-[#72806f]">
            아직 공개된 미션이 없어요. 미션을 뽑으면 오늘에 잘 맞는 활동을
            추천해 드릴게요.
          </div>
        ) : (
          drawnMissions.map((mission, index) => (
            <article
              key={mission.id}
              className="rounded-[1.3rem] bg-[#f7f8ef] px-4 py-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dff0c5] text-xs font-black text-[#295c3a]">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-black text-[#223a29]">{mission.title}</h4>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#2c6540]">
                      +{mission.ecoReward} 포인트
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#6f7c69]">
                    {mission.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#547054]">
                      {mission.category}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#7b6d58]">
                      {verifyTypeLabel(mission.verifyType)}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#547054]">
                      {mission.placeType === "indoor" ? "실내" : "실외"}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-[#7a7e6f]">
                    인증 방법: {mission.verifyGuide}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[#7a7e6f]">
                    예상 시간: {mission.estimatedTime}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold text-[#6d7c69]">
                      안전도: {mission.safetyLevel === "safe" ? "안전" : "주의"}
                    </span>
                    {completedMissionIds.includes(mission.id) ? (
                      <span className="rounded-full bg-[#dff0c5] px-3 py-1 text-[11px] font-black text-[#295c3a]">
                        완료됨
                      </span>
                    ) : (
                      <button
                        onClick={() => onCompleteMission(mission.id)}
                        className="rounded-full bg-[#295c3a] px-3 py-1 text-[11px] font-black text-white"
                      >
                        완료하기
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function PlaceholderScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-[1.9rem] bg-white p-5 shadow-[0_10px_30px_rgba(69,95,63,0.08)]">
      <p className="text-xs font-bold text-[#6f806d]">{title}</p>
      <h2 className="mt-1 text-[1.7rem] font-black tracking-[-0.04em] text-[#24382a]">
        준비 중이에요
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#6f7c69]">{description}</p>
    </section>
  );
}

export default function Home() {
  const [page, setPage] = useState<PageTab>("home");
  const [drawnMissions, setDrawnMissions] = useState<Mission[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [boxMission, setBoxMission] = useState<Mission | null>(null);

  const missionStats = useMemo(() => {
    const totalDebtClear = drawnMissions.reduce(
      (sum, mission) =>
        completedMissionIds.includes(mission.id) ? sum + mission.ecoReward : sum,
      0,
    );

    return {
      totalDebtClear,
    };
  }, [completedMissionIds, drawnMissions]);

  const handleDrawStart = () => {
    if (drawnMissions.length >= 5 || boxMission) {
      return;
    }

    const nextMission = getRecommendedMission(drawnMissions, boxMission);
    setBoxMission(nextMission);
  };

  const handleRevealMission = () => {
    if (!boxMission) {
      return;
    }

    setDrawnMissions((current) => [...current, boxMission]);
    setBoxMission(null);
  };

  const handleResetMissions = () => {
    setDrawnMissions([]);
    setCompletedMissionIds([]);
    setBoxMission(null);
  };

  const handleCompleteMission = (missionId: string) => {
    setCompletedMissionIds((current) =>
      current.includes(missionId) ? current : [...current, missionId],
    );
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e4f4c2_0%,#eef6df_24%,#f7f4e8_56%,#fcfaf3_100%)] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-4 pt-4">
        <div className="flex-1 space-y-4">
          {page === "home" ? <HomeScreen /> : null}
          {page === "mission" ? (
            <>
              <MissionScreen
                drawnMissions={drawnMissions}
                completedMissionIds={completedMissionIds}
                boxMission={boxMission}
                onDrawStart={handleDrawStart}
                onRevealMission={handleRevealMission}
                onResetMissions={handleResetMissions}
                onCompleteMission={handleCompleteMission}
              />
              <section className="rounded-[1.6rem] bg-[#295c3a] p-4 text-white shadow-[0_10px_24px_rgba(32,95,61,0.18)]">
                <p className="text-xs font-bold text-white/75">오늘 모은 미션 포인트</p>
                <p className="mt-2 text-3xl font-black">
                  {missionStats.totalDebtClear} 포인트
                </p>
                <p className="mt-1 text-[11px] text-white/75">
                  미션을 완료할 때마다 보상이 여기에 누적돼요.
                </p>
              </section>
            </>
          ) : null}
          {page === "map" ? <KakaoMapSection /> : null}
          {page === "ranking" ? (
            <PlaceholderScreen
              title="랭킹"
              description="반 랭킹과 학교 랭킹은 이후 Firebase 데이터 모델이 준비되면 자연스럽게 연결할 수 있어요."
            />
          ) : null}
        </div>

        <BottomNav page={page} setPage={setPage} />
      </div>
    </main>
  );
}
