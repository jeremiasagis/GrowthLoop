import { RouteGuard } from "@/components/auth/RouteGuard";
import { DataProvider } from "@/components/DataProvider";
import { CoordinatorChrome } from "@/components/coordinator/CoordinatorChrome";

export default function CoordinadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <DataProvider>
        <CoordinatorChrome>{children}</CoordinatorChrome>
      </DataProvider>
    </RouteGuard>
  );
}
