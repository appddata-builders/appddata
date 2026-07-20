import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardChrome } from "@/app/dashboard/dashboard-chrome";
import { getPanelPlan } from "@/lib/plans-server";
import { requirePanelSession } from "@/lib/require-panel-session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const session = await requirePanelSession();

  if (!session) {
    const pathname = headerList.get("x-pathname") ?? "/dashboard";
    redirect("/account/login?siguiente=" + encodeURIComponent(pathname));
  }

  const plan = await getPanelPlan(session);

  return (
    <DashboardChrome email={session.user.email} name={session.user.name} plan={plan}>
      {children}
    </DashboardChrome>
  );
}
