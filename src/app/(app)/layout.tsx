import { AppShell } from "@/components/AppShell";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { DataProvider } from "@/components/DataProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <DataProvider>
        <AppShell>{children}</AppShell>
      </DataProvider>
    </RouteGuard>
  );
}
