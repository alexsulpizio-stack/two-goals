import { NextResponse } from "next/server";

function backToSteward(request: Request) {
  return NextResponse.redirect(new URL("/steward", request.url), 303);
}

/** Old Read file POSTs used to dump JSON or QIF text. Send them home. */
export function GET(request: Request) {
  return backToSteward(request);
}

export async function POST(request: Request) {
  await request.arrayBuffer().catch(() => undefined);
  return backToSteward(request);
}
