import { RouteGuard } from "@/components/auth/RouteGuard";
import { MemberChrome } from "@/components/member/MemberChrome";
import { DataProvider } from "@/components/DataProvider";
import { MemberTeamProvider } from "@/lib/member/team";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <DataProvider>
        <MemberTeamProvider>
          <MemberChrome>{children}</MemberChrome>
        </MemberTeamProvider>
      </DataProvider>
    </RouteGuard>
  );
}
