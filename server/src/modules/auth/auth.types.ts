export type Role = "customer" | "seller" | "admin";
export type Account = { id: string; name: string; email: string; role: Role; passwordHash: string; createdAt: string };
export type PublicAccount = Omit<Account, "passwordHash">;
