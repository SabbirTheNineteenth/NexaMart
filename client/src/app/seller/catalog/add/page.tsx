import { RoleProtectedWorkspace } from "@/components/RoleProtectedWorkspace";
import { SellerDashboard } from "@/features/seller/SellerDashboard";

export default function SellerCatalogAddPage() {
  return <RoleProtectedWorkspace role="seller"><SellerDashboard productCreationOnly /></RoleProtectedWorkspace>;
}
