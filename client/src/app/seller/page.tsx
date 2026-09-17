import { SellerDashboard } from "@/features/seller/SellerDashboard";
import { RoleProtectedWorkspace } from "@/components/RoleProtectedWorkspace";

export default function SellerPage() {
  return <RoleProtectedWorkspace role="seller"><SellerDashboard /></RoleProtectedWorkspace>;
}
