import { getAuthenticatedUser, roleRouter } from "@/lib/actions/actions";
import { getCurrentUser } from "@/lib/actions/screener-actions";
import { redirect } from "next/navigation";


export default async function ScreenerSignupLayout({ children }: { children: React.ReactNode }) {
    const { user, error } = await getCurrentUser()
    
    if (user) {
        await roleRouter()
    }

    return (
        <div>
            {children}
        </div>
    )
}