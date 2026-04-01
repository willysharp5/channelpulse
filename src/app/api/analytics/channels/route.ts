import { NextResponse } from "next/server";
import { getChannelRevenue } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);

  try {
    const channels = await getChannelRevenue(days);
    return NextResponse.json(channels);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch channel data" },
      { status: 500 }
    );
  }
}
