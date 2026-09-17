import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      staffid: string;
      name: string;
      email: string;
      role: string;
      roles: string[];
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    staffid: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    staffid: string;
    name: string;
    email: string;
    role: string;
    roles: string[];
  }
}
