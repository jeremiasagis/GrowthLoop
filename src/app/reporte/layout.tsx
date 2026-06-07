import { RouteGuard } from "@/components/auth/RouteGuard";
import { DataProvider } from "@/components/DataProvider";

export default function ReporteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <DataProvider>{children}</DataProvider>
    </RouteGuard>
  );
}
