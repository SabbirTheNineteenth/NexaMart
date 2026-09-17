import { RoleAuth } from "@/features/auth/RoleAuth";

export default function CustomerRegisterPage() {
  return <RoleAuth mode="register" role="customer" />;
}
