import { RoleAuth } from "@/features/auth/RoleAuth";

export default function SellerRegisterPage() {
  return <RoleAuth mode="register" role="seller" />;
}
