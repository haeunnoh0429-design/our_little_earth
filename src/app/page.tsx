"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { KakaoMapSection } from "@/components/map/kakao-map-section";
import { mockDailyMissions } from "@/lib/mock-daily-missions";
import type { DailyMission } from "@/types/mission";

type TabId = "home" | "map" | "mission" | "challenge" | "ranking" | "mypage";

type UserProfile = {
  name: string;
  school: string;
  ecoDebt: number;
  clearedDebt: number;
};

const DEFAULT_PROFILE: UserProfile = {
  name: "지구 탐험가",
  school: "우리반 초록 지구단",
  ecoDebt: 3200,
  clearedDebt: 0,
};

const TAB_ITEMS: Array<{ id: Exclude<TabId, "home">; label: string }> = [
  { id: "map", label: "지도" },
  { id: "mission", label: "미션" },
  { id: "challenge", label: "챌린지" },
  { id: "ranking", label: "랭킹" },
  { id: "mypage", label: "마이" },
];

function readStoredProfile() {
  if (typeof window === "undefined") {
    return DEFAULT_PROFILE;
  }

  const savedProfile = window.localStorage.getItem("ole-profile");

  if (!savedProfile) {
    return DEFAULT_PROFILE;
  }

  try {
    return JSON.parse(savedProfile) as UserProfile;
  } catch {
    return DEFAULT_PROFILE;
  }
}

function readStoredMission() {
  if (typeof window === "undefined") {
    return null;
  }

  const savedMission = window.localStorage.getItem("ole-selected-mission");

  if (!savedMission) {
    return null;
  }

  try {
    return JSON.parse(savedMission) as DailyMission;
  } catch {
    return null;
  }
}

function readStoredCompletedMissionIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  const savedCompletedMissionIds = window.localStorage.getItem("ole-completed-mission-ids");

  if (!savedCompletedMissionIds) {
    return [] as string[];
  }

  try {
    return JSON.parse(savedCompletedMissionIds) as string[];
  } catch {
    return [] as string[];
  }
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [profile, setProfile] = useState<UserProfile>(readStoredProfile);
  const [selectedMission, setSelectedMission] = useState<DailyMission | null>(
    readStoredMission,
  );
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>(
    readStoredCompletedMissionIds,
  );

  useEffect(() => {
    window.localStorage.setItem("ole-profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (selectedMission) {
      window.localStorage.setItem("ole-selected-mission", JSON.stringify(selectedMission));
      return;
    }

    window.localStorage.removeItem("ole-selected-mission");
  }, [selectedMission]);

  useEffect(() => {
    window.localStorage.setItem(
      "ole-completed-mission-ids",
      JSON.stringify(completedMissionIds),
    );
  }, [completedMissionIds]);

  const availableMissions = useMemo(
    () => mockDailyMissions.filter((mission) => !completedMissionIds.includes(mission.id)),
    [completedMissionIds],
  );

  const completionRate = Math.min(
    100,
    Math.round((profile.clearedDebt / DEFAULT_PROFILE.ecoDebt) * 100),
  );

  const drawMission = () => {
    if (selectedMission || availableMissions.length === 0) {
      return;
    }

    const nextMission =
      availableMissions[Math.floor(Math.random() * availableMissions.length)];
    setSelectedMission(nextMission);
  };

  const completeMission = () => {
    if (!selectedMission) {
      return;
    }

    setCompletedMissionIds((current) =>
      current.includes(selectedMission.id) ? current : [...current, selectedMission.id],
    );

    setProfile((current) => {
      const nextClearedDebt = Math.min(
        DEFAULT_PROFILE.ecoDebt,
        current.clearedDebt + selectedMission.ecoMoney,
      );

      return {
        ...current,
        clearedDebt: nextClearedDebt,
        ecoDebt: Math.max(0, DEFAULT_PROFILE.ecoDebt - nextClearedDebt),
      };
    });

    setSelectedMission(null);
  };

  const renderContent = () => {
    if (activeTab === "home") {
      return (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#dff6df_0%,#f6ffe8_52%,#d9f0ff_100%)] p-6 shadow-[0_18px_50px_rgba(60,98,67,0.12)]">
            <div className="flex items-center justify-between gap-4">
              <div className="max-w-[15rem]">
                <p className="text-sm font-bold text-[#55735d]">{profile.school}</p>
                <h1 className="mt-2 text-[2rem] font-black tracking-[-0.05em] text-[#183522]">
                  {profile.name}의 작은 지구
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#5a7460]">
                  오늘의 행동으로 남은 에코머니 빚을 조금씩 청산해 봐요.
                </p>
              </div>
              <div className="relative h-36 w-36 shrink-0">
                <Image
                  src="/earth-character.svg"
                  alt="귀여운 지구 캐릭터"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-[1.8rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
              <p className="text-sm font-bold text-[#66806b]">남은 에코머니 빚</p>
              <p className="mt-2 text-[2.4rem] font-black tracking-[-0.05em] text-[#1d3f28]">
                {profile.ecoDebt.toLocaleString()} EM
              </p>
              <p className="mt-2 text-sm text-[#70806e]">
                미션을 성공하면 포인트가 쌓이는 대신 빚이 줄어들어요.
              </p>
            </article>

            <article className="rounded-[1.8rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
              <p className="text-sm font-bold text-[#66806b]">청산한 에코머니</p>
              <p className="mt-2 text-[2.4rem] font-black tracking-[-0.05em] text-[#1d3f28]">
                {profile.clearedDebt.toLocaleString()} EM
              </p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e5f0df]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#4aa35e_0%,#8fd36f_100%)]"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-[#70806e]">전체 청산률 {completionRate}%</p>
            </article>
          </section>

          <section className="rounded-[1.8rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
            <p className="text-sm font-bold text-[#66806b]">빠른 이동</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#1e3826]">
              오늘은 어디부터 시작할까요?
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => setActiveTab("map")}
                className="rounded-[1.4rem] bg-[#edf7ea] px-4 py-4 text-left"
              >
                <p className="text-base font-black text-[#24482f]">지도 보기</p>
                <p className="mt-1 text-sm text-[#64806a]">가까운 친환경 장소 찾기</p>
              </button>
              <button
                onClick={() => setActiveTab("mission")}
                className="rounded-[1.4rem] bg-[#f8f6e8] px-4 py-4 text-left"
              >
                <p className="text-base font-black text-[#4f4723]">미션 확인</p>
                <p className="mt-1 text-sm text-[#7e7651]">오늘의 빚 청산 행동 뽑기</p>
              </button>
              <button
                onClick={() => setActiveTab("ranking")}
                className="rounded-[1.4rem] bg-[#edf4ff] px-4 py-4 text-left"
              >
                <p className="text-base font-black text-[#23425f]">랭킹 보기</p>
                <p className="mt-1 text-sm text-[#5f7690]">우리 반 순위 확인하기</p>
              </button>
            </div>
          </section>
        </div>
      );
    }

    if (activeTab === "map") {
      return <KakaoMapSection />;
    }

    if (activeTab === "mission") {
      return (
        <section className="space-y-4 rounded-[1.9rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
          <div>
            <p className="text-sm font-bold text-[#66806b]">오늘의 미션</p>
            <h2 className="mt-1 text-[1.8rem] font-black tracking-[-0.04em] text-[#203826]">
              에코머니 빚 청산하기
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#69806d]">
              미션을 완료하면 그만큼 남은 빚이 줄어들어요.
            </p>
          </div>

          {selectedMission ? (
            <article className="rounded-[1.6rem] bg-[#f3f8ee] p-5">
              <p className="text-sm font-bold text-[#53735c]">{selectedMission.category}</p>
              <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-[#1f3f27]">
                {selectedMission.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#627563]">
                {selectedMission.summary}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] bg-white px-4 py-3 text-sm text-[#46604c]">
                  청산 금액 {selectedMission.ecoMoney} EM
                </div>
                <div className="rounded-[1.2rem] bg-white px-4 py-3 text-sm text-[#46604c]">
                  예상 시간 {selectedMission.durationMinutes}분
                </div>
              </div>
              <button
                onClick={completeMission}
                className="mt-4 w-full rounded-[1.2rem] bg-[#2a5d3b] px-4 py-3 text-sm font-black text-white"
              >
                미션 완료하고 빚 청산하기
              </button>
            </article>
          ) : (
            <div className="rounded-[1.6rem] bg-[#f7fbf3] p-5 text-sm leading-6 text-[#667d6b]">
              아직 뽑은 미션이 없어요. 아래 버튼으로 오늘의 미션을 받아보세요.
            </div>
          )}

          <button
            onClick={drawMission}
            disabled={Boolean(selectedMission) || availableMissions.length === 0}
            className="w-full rounded-[1.2rem] bg-[#d8eece] px-4 py-3 text-sm font-black text-[#23442b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {availableMissions.length === 0
              ? "완료 가능한 미션이 없어요"
              : selectedMission
                ? "현재 미션 진행 중"
                : "오늘의 미션 뽑기"}
          </button>
        </section>
      );
    }

    if (activeTab === "challenge") {
      return (
        <section className="rounded-[1.9rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
          <p className="text-sm font-bold text-[#66806b]">이번 주 챌린지</p>
          <h2 className="mt-1 text-[1.8rem] font-black tracking-[-0.04em] text-[#203826]">
            텀블러 주간
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#687d6e]">
            반 친구들과 함께 일회용 컵 없이 일주일을 보내 보는 챌린지예요.
          </p>
        </section>
      );
    }

    if (activeTab === "ranking") {
      return (
        <section className="rounded-[1.9rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
          <p className="text-sm font-bold text-[#66806b]">우리 반 랭킹</p>
          <div className="mt-4 space-y-3">
            {[
              { name: "초록별", value: 2800 },
              { name: profile.name, value: profile.clearedDebt },
              { name: "에코라이더", value: 900 },
            ].map((entry, index) => (
              <div
                key={entry.name}
                className="flex items-center justify-between rounded-[1.2rem] bg-[#f5f9f0] px-4 py-3"
              >
                <p className="font-bold text-[#27422d]">
                  {index + 1}. {entry.name}
                </p>
                <p className="text-sm font-bold text-[#5d7a63]">
                  {entry.value.toLocaleString()} EM 청산
                </p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className="rounded-[1.9rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
        <p className="text-sm font-bold text-[#66806b]">마이페이지</p>
        <h2 className="mt-1 text-[1.8rem] font-black tracking-[-0.04em] text-[#203826]">
          내 활동 요약
        </h2>
        <div className="mt-4 space-y-3 text-sm text-[#627665]">
          <p>이름: {profile.name}</p>
          <p>학교/팀: {profile.school}</p>
          <p>완료한 미션 수: {completedMissionIds.length}개</p>
          <p>남은 빚: {profile.ecoDebt.toLocaleString()} EM</p>
        </div>
      </section>
    );
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ef_0%,#edf7ff_100%)] px-4 pb-28 pt-6 text-[#1f3526]">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-[#68806d]">Our Little Earth</p>
          {activeTab !== "home" ? (
            <button
              onClick={() => setActiveTab("home")}
              className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#23432c] shadow-[0_8px_24px_rgba(65,91,62,0.10)]"
            >
              홈
            </button>
          ) : null}
        </div>

        {renderContent()}
      </div>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-xl px-4 pb-5">
        <div className="grid grid-cols-5 rounded-[1.8rem] border border-[#deead7] bg-white/95 p-2 shadow-[0_18px_45px_rgba(45,79,56,0.14)] backdrop-blur">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-[1.2rem] px-2 py-3 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-[#e4f3db] text-[#21422b]"
                  : "text-[#71836f]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
