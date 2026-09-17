import { RoleAuth } from "@/features/auth/RoleAuth";

export default function SellerLoginPage() {
  return <RoleAuth mode="login" role="seller" />;
}
