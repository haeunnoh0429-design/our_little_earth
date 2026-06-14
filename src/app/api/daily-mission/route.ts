import { NextResponse } from "next/server";
import {
  generateTodayMission,
  getDefaultMissionContext,
} from "@/lib/mission-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = getDefaultMissionContext();
  const result = await generateTodayMission(context);

  return NextResponse.json({
    ...result,
    context,
  });
}
