import { RoleAuth } from "@/features/auth/RoleAuth";

export default function AdminRegisterPage() {
  return <RoleAuth mode="register" role="admin" />;
}
