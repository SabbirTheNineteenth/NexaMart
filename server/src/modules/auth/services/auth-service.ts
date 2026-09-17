import { compare, hash } from "bcryptjs";
import type { Account, PublicAccount, Role } from "../auth.types.js";
import type { AuthRepository } from "../auth.repository.js";

const publicAccount = ({ passwordHash, ...account }: Account): PublicAccount => account;

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async register(input: { name: string; email: string; password: string; role?: Role }): Promise<PublicAccount> {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name || !email.includes("@") || input.password.length < 8) throw new Error("Invalid account details");
    if (await this.repository.findByEmail(email)) throw new Error("Account already exists");
    const account = await this.repository.create({ name, email, role: input.role ?? "customer", passwordHash: await hash(input.password, 12) });
    return publicAccount(account);
  }

  async login(email: string, password: string): Promise<PublicAccount | null> {
    const account = await this.repository.findByEmail(email.trim().toLowerCase());
    return account && await compare(password, account.passwordHash) ? publicAccount(account) : null;
  }
}
