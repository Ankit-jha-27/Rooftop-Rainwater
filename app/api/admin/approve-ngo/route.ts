/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { ngo } = await req.json();

    if (!ngo || !ngo.contactEmail) {
      return NextResponse.json(
        { ok: false, error: "Invalid NGO data" },
        { status: 400 }
      );
    }

    // Generate random password
    const generatedPassword = Math.random().toString(36).slice(-10);

    // 1. Create Firebase User
    const user = await adminAuth.createUser({
      email: ngo.contactEmail,
      password: generatedPassword,
      displayName: ngo.name,
      disabled: false,
    });

    // 2. Save NGO in Firestore
    await adminDb.collection("ngos").doc(user.uid).set({
      ...ngo,
      uid: user.uid,
      approved: true,
      createdAt: Date.now(),
    });

    // 3. SEND EMAIL USING RESEND
    const resend = new Resend("re_XQ3J7jTa_PoBuNhBrx38GGy2DwKQ9zGRF");

    await resend.emails.send({
      from: "onboarding@resend.dev",            // onboarding@resend.dev
      to: ngo.contactEmail,
      subject: "Your NGO account has been approved",
      html: `
        <h2>Hello ${ngo.contactName},</h2>
        <p>Your NGO account is now approved.</p>
        <p><strong>Email:</strong> ${ngo.contactEmail}</p>
        <p><strong>Password:</strong> ${generatedPassword}</p>
        <p>You can now login.</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("APPROVE_NGO ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
