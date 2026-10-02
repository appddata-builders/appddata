import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { getT } from "@/lib/text/server-text";

export default async function AccountForgotPasswordPage() {
  const t = await getT();

  return (
    <main className="app-min-h-screen bg-white px-4 pb-10 text-[#111827] sm:px-6 sm:pb-14">
      <div className="app-min-h-screen-nav-offset mx-auto flex w-full max-w-md items-center justify-center pt-24 sm:pt-28">
        <Card className="w-full border-slate-200">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{t("es.account.forgot.title")}</CardTitle>
            <CardDescription>
              {t("es.account.forgot.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Link
              href="/account/login"
              className="block text-center text-[0.72rem] uppercase tracking-[0.3em] text-slate-600 transition hover:text-slate-700"
            >
              {t("es.account.forgot.backToLogin")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
