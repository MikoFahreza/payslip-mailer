import "next-auth";
import "next-auth/jwt";
import type { UserRole } from "@/lib/db/schema";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: UserRole;
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: UserRole;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    id?: string;
    role?: UserRole;
  }
}
