import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, hasGoogleAuthConfig } from "@/auth";

const handler = hasGoogleAuthConfig
  ? NextAuth(authOptions)
  : async () =>
      NextResponse.json(
        { error: "Google OAuth のクライアントID/シークレットが設定されていません。" },
        { status: 500 },
      );

export { handler as GET, handler as POST };
