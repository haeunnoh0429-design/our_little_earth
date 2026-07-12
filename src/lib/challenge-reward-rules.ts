export type ChallengeRewardDifficulty = "easy" | "medium" | "hard";
export type ChallengeRewardProofMethod = "photo" | "gps" | "review";

export type ChallengeRewardInput = {
  location: string;
  durationDays: number;
  difficulty: ChallengeRewardDifficulty;
  proofMethods: ChallengeRewardProofMethod[];
};

export type ChallengeRewardBreakdownItem = {
  label: string;
  points: number;
  reason: string;
};

export type ChallengeRewardDetails = {
  reward: number;
  items: ChallengeRewardBreakdownItem[];
  summary: string;
};

const MIN_REWARD = 30;

const difficultyPoints: Record<ChallengeRewardDifficulty, number> = {
  easy: 0,
  medium: 8,
  hard: 16,
};

const difficultyReasons: Record<ChallengeRewardDifficulty, string> = {
  easy: "쉬운 활동은 참여 장벽이 낮아서 기본 보상으로 충분해요.",
  medium: "보통 난이도는 꾸준한 실천이 필요해서 8 EM을 더해요.",
  hard: "어려운 활동은 시간과 노력이 크게 들어가서 16 EM을 더해요.",
};

const proofMethodPoints: Record<ChallengeRewardProofMethod, number> = {
  photo: 4,
  gps: 6,
  review: 4,
};

const proofMethodReasons: Record<ChallengeRewardProofMethod, string> = {
  photo: "사진 인증은 실제 실천 흔적을 남기므로 4 EM을 더해요.",
  gps: "GPS 인증은 특정 장소 실천을 확인해야 하므로 6 EM을 더해요.",
  review: "후기 인증은 느낀 점을 정리하는 추가 참여가 있어 4 EM을 더해요.",
};

function getDurationPoints(durationDays: number) {
  if (durationDays >= 31) {
    return 140;
  }

  if (durationDays >= 15) {
    return 90;
  }

  if (durationDays >= 8) {
    return 55;
  }

  if (durationDays >= 4) {
    return 25;
  }

  return 8;
}

function getDurationReason(durationDays: number) {
  if (durationDays >= 31) {
    return "31일 이상은 한 달 넘게 매일 실천해야 하는 장기 챌린지라 140 EM을 더해요.";
  }

  if (durationDays >= 15) {
    return "15~30일은 긴 기간 동안 습관을 유지해야 해서 90 EM을 더해요.";
  }

  if (durationDays >= 8) {
    return "8~14일은 일주일을 넘기는 꾸준함이 필요해서 55 EM을 더해요.";
  }

  if (durationDays >= 4) {
    return "4~7일은 며칠 동안 반복 실천해야 해서 25 EM을 더해요.";
  }

  return "1~3일은 짧게 시작하는 챌린지라 8 EM을 더해요.";
}

function getLocationPoints(location: string) {
  return location.trim().length >= 5 ? 4 : 0;
}

export function calculateChallengeRewardDetails(input: ChallengeRewardInput): ChallengeRewardDetails {
  const uniqueProofMethods = Array.from(new Set(input.proofMethods));
  const durationPoints = getDurationPoints(input.durationDays);
  const locationPoints = getLocationPoints(input.location);

  const items: ChallengeRewardBreakdownItem[] = [
    {
      label: "기본 보상",
      points: MIN_REWARD,
      reason: "모든 챌린지가 최소한의 참여 보람을 갖도록 30 EM에서 시작해요.",
    },
    {
      label: "난이도",
      points: difficultyPoints[input.difficulty],
      reason: difficultyReasons[input.difficulty],
    },
    {
      label: "진행 기간",
      points: durationPoints,
      reason: getDurationReason(input.durationDays),
    },
    {
      label: "인증 방식",
      points: uniqueProofMethods.reduce((total, method) => total + proofMethodPoints[method], 0),
      reason: uniqueProofMethods.map((method) => proofMethodReasons[method]).join(" "),
    },
    {
      label: "장소 구체성",
      points: locationPoints,
      reason:
        locationPoints > 0
          ? "장소가 구체적이면 참여자가 어디서 실천할지 더 명확해서 4 EM을 더해요."
          : "장소가 짧거나 모호하면 추가 보상을 붙이지 않아요.",
    },
  ];

  const reward = Math.max(MIN_REWARD, items.reduce((total, item) => total + item.points, 0));

  return {
    reward,
    items,
    summary: `기본 ${MIN_REWARD} EM에 난이도, 기간, 인증 부담, 장소 구체성을 더해 ${reward} EM으로 정했어요. 기간이 길수록 매일 인증해야 하는 부담이 커서 기간 보상을 가장 크게 반영해요.`,
  };
}

export function formatChallengeRewardReason(details: ChallengeRewardDetails) {
  const itemText = details.items
    .map((item) => `${item.label} ${item.points >= 0 ? "+" : ""}${item.points} EM: ${item.reason}`)
    .join(" ");

  return `${details.summary} ${itemText}`;
}
