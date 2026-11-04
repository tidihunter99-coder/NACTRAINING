/** Roles are descriptive until server-side authorization and RLS policies are implemented. */
export const userRoles = ["aluno", "professor", "administrador"] as const;

export type UserRole = (typeof userRoles)[number];

export interface UserProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  role: UserRole;
  createdAt: string;
}
