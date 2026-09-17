import { RoleAuth } from "@/features/auth/RoleAuth";

export default function CustomerLoginPage() {
  return <RoleAuth mode="login" role="customer" />;
}
