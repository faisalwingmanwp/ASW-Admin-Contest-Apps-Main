import { getCurrentContestant } from "@/lib/auth-actions";
import { redirect } from "next/navigation";

export default async function MembershipLayout({ children }: { children: React.ReactNode }) {
    const contestant = await getCurrentContestant();

    if (!contestant) {
      redirect('/auth/login')
    }
  
    if (!contestant || !contestant.firstName || !contestant.username || !contestant.email ) {
      redirect('/update')
    }

    return <div className=" px-4">{children}</div>;
}
