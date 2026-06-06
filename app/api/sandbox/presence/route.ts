import { NextRequest, NextResponse } from "next/server";
import { getUserID } from "@/lib/auth/get-user-id";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = await getUserID(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const serviceKey = process.env.CONVEX_SERVICE_ROLE_KEY;

  if (!convexUrl || !serviceKey) {
    return NextResponse.json({
      connections: [],
      onlineCount: 0,
    });
  }

  const convex = new ConvexHttpClient(convexUrl);
  const connections = await convex.query(
    api.localSandbox.listConnectionsForBackend,
    { serviceKey, userId },
  );

  return NextResponse.json({
    connections: connections.map((conn) => ({
      ...conn,
      online: true,
    })),
    onlineCount: connections.length,
  });
}
