import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json();

    const resend = new Resend("re_XQ3J7jTa_PoBuNhBrx38GGy2DwKQ9zGRF");
    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject,
      html,
    });

    return NextResponse.json({ ok: true, data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
