import { RouteGuard } from "@/components/auth/RouteGuard";
import { MemberChrome } from "@/components/member/MemberChrome";
import { DataProvider } from "@/components/DataProvider";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <DataProvider>
        <MemberChrome>{children}</MemberChrome>
      </DataProvider>
    </RouteGuard>
  );
}
