import { getCurrentContestant } from "@/lib/auth-actions";
import { checkContestantHasMembership } from "@/lib/membership-actions";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {

  const [hasMembership, contestant] = await Promise.all([
    checkContestantHasMembership(),
    getCurrentContestant()
  ]);

  if (!contestant) {
    redirect('/auth/login')
  }

  if (!contestant || !contestant.firstName || !contestant.username || !contestant.email ) {
    redirect('/update')
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="container mx-auto max-w-screen-xl">
        {children}
      </div>
    </div>
  );
}