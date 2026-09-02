import { NextResponse } from "next/server";

function backToSteward() {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/steward" },
  });
}

/** Leftover POSTs used to dump JSON. Send people back to Steward. */
export function GET() {
  return backToSteward();
}

export async function POST(request: Request) {
  await request.arrayBuffer().catch(() => undefined);
  return backToSteward();
}
