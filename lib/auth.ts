import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const AUTH_DEBUG = process.env.AUTH_DEBUG === "true";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (user.length === 0) return null;

        const isValid = await compare(
          credentials.password as string,
          user[0].password
        );

        if (!isValid) return null;

        return {
          id: user[0].id,
          name: user[0].name,
          email: user[0].email,
          role: user[0].role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: number }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: number }).role = token.role as number;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (AUTH_DEBUG) {
        console.log("[auth][event] sign_in", { userId: user.id, email: user.email });
      }
    },
    async signOut({ token, session }) {
      if (AUTH_DEBUG) {
        console.log("[auth][event] sign_out", {
          tokenId: token?.id,
          sessionUserId: session?.user?.id,
        });
      }
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  debug: AUTH_DEBUG,
});
