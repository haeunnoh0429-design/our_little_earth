import { NextRequest, NextResponse } from "next/server";
import {
  suggestChallengeReward,
  type ChallengeRewardRequest,
} from "@/lib/challenge-reward-ai";

export const dynamic = "force-dynamic";

function isChallengeRewardRequest(value: unknown): value is ChallengeRewardRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const proofMethods = payload.proofMethods;

  return (
    typeof payload.title === "string" &&
    typeof payload.description === "string" &&
    typeof payload.location === "string" &&
    typeof payload.durationDays === "number" &&
    typeof payload.difficulty === "string" &&
    Array.isArray(proofMethods) &&
    proofMethods.every((method) => ["photo", "gps", "review"].includes(String(method)))
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;

    if (!isChallengeRewardRequest(body)) {
      return NextResponse.json(
        { error: "Invalid challenge reward request." },
        { status: 400 },
      );
    }

    const result = await suggestChallengeReward(body);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Challenge reward generation failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
