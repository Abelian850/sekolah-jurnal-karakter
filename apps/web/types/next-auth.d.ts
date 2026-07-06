import type { Role } from "@sjk/shared";

/**
 * Augmentasi tipe bawaan next-auth agar `session.user` dan JWT punya
 * field tambahan (id, role, schoolId) secara type-safe di seluruh
 * aplikasi, tanpa perlu `as` casting berulang di setiap pemakaian.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      schoolId: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    role: Role;
    schoolId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    schoolId: string | null;
  }
}
