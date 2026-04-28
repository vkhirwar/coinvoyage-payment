import { NextRequest, NextResponse } from "next/server";
import { verifyInitData } from "@/lib/telegram-initdata";
import { getStore } from "@/lib/telegram-store";

export async function POST(req: NextRequest) {
  let body: { initData?: string };
  try { body = (await req.json()) as { initData?: string }; }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  if (!body.initData) return NextResponse.json({ error: "initData required" }, { status: 400 });

  const v = verifyInitData(body.initData);
  if (!v?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const store = getStore();
  const lastOrder = await store.get<string>(`tg:lastorder:${v.user.id}`);

  return NextResponse.json({ user: v.user, lastOrder });
}
