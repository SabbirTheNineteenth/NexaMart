import { RoleAuth } from "@/features/auth/RoleAuth";

export default function AdminLoginPage() {
  return <RoleAuth mode="login" role="admin" />;
}
