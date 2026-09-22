import type { Account } from "@/types/account";

export function accountDestination(role: Account["role"] | null | undefined) {
  if (role === "seller") return "/seller";
  if (role === "admin") return "/admin";
  return "/account";
}

export function accountDestinationLabel(role: Account["role"] | null | undefined) {
  if (role === "seller") return "Open seller workspace";
  if (role === "admin") return "Open admin workspace";
  return "Open customer account";
}
