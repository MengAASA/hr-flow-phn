import { authOptions } from "@/src/lib/auth-options";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ManpowerTrendComponent from "@/app/component/analytics/ManpowerTrendComponent";
import { canViewAnalytics } from "@/lib/analytics-access";

export default async function ManpowerTrendPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/"); //protected page
  }

  if (!canViewAnalytics(session.user.roles)) {
    return (
      <div className="text-red-500 p-6">
        You don&apos;t have permission to view this page.
      </div>
    );
  }

  return <ManpowerTrendComponent />;
}
