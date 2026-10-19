import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { prisma } from "../../lib/prisma";
import { withBasePath } from "../../lib/base-path";
import { flattenRoles } from "./admin-roles";

// Error codes returned to the client via signIn()'s `error`; the login page
// matches on these strings.
const INVALID_CREDENTIALS = "INVALID_CREDENTIALS";
const SIGNIN_SERVER_ERROR = "SIGNIN_SERVER_ERROR";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        staffid: { label: "Staff ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const staffid = credentials?.staffid?.trim().toUpperCase();

        if (!staffid || !credentials?.password) {
          throw new Error(INVALID_CREDENTIALS);
        }

        // A DB/connection failure must not be reported to the user as a wrong
        // password, so log it and surface a distinct error code instead.
        let user;
        try {
          user = await prisma.user.findUnique({ where: { staffid } });
        } catch (error) {
          console.error("[auth] Failed to look up user during sign-in:", error);
          throw new Error(SIGNIN_SERVER_ERROR);
        }

        if (!user) {
          throw new Error(INVALID_CREDENTIALS);
        }

        const passwordIsValid = await compare(
          credentials.password,
          user.password,
        );

        if (!passwordIsValid) {
          throw new Error(INVALID_CREDENTIALS);
        }

        return {
          id: user.staffid,
          staffid: user.staffid,
          name: user.fullname,
          email: user.email,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60,
    updateAge: 15 * 60,
  },

  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: true,
      },
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.staffid = user.staffid;
      }

      if (token.staffid) {
        const dbUser = await prisma.user.findUnique({
          where: { staffid: token.staffid },
          include: { roles: { select: { role: true } } },
        });

        if (dbUser) {
          token.name = dbUser.fullname;
          token.email = dbUser.email;
          token.role = dbUser.role;
          token.roles = flattenRoles(dbUser.role, dbUser.roles);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user = {
          staffid: token.staffid,
          name: token.name,
          email: token.email,
          role: token.role,
          roles: token.roles,
        };
      }

      return session;
    },
  },

  pages: { signIn: withBasePath("/login") },
};
