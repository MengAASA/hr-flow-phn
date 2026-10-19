import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { generateResetToken, getFirstName } from "../../../../../lib/utils";
import { transporter } from "../../../../../lib/emailService";

const emailFrom = process.env.EMAIL;
const webLink = process.env.NEXTAUTH_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is missing" }, { status: 400 });
    }

    // Check if user exists
    const finduser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!finduser) {
      return NextResponse.json(
        { error: "No account is registered with this email address." },
        { status: 400 }
      );
    }

    const token = generateResetToken();

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.passwordResetToken.create({
      data: {
        token: token,
        userId: finduser.id,
        expiresAt: expiresAt,
      },
    });

    const mailOptions = {
      from: emailFrom,
      to: finduser.email,
      subject: "Password Reset Request",
      template: "resetPassword",
      context: {
        username: getFirstName(finduser.fullname),
        resetLink: `${webLink}/reset-password?token=${token}`,
      },
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("[forget-password] Failed to send reset email:", error);
      return NextResponse.json(
        { error: "Unable to send the reset email right now. Please try again later." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: "Reset password link has been successfully sent.",
    });
  } catch (error) {
    console.error("[forget-password] Request failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
