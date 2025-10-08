import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/actions/screener-actions"
import { UserRole } from "@prisma/client"
import { AppSidebar } from "@/components/ui/app-sidebar"

export default async function HomeLayout({children}: {children: React.ReactNode}) {

    const { user, error } = await getCurrentUser()

    if (error || !user) {
        redirect("/auth/login")
    }

    if (user.role === UserRole.UNVERIFIED) {
        redirect("/auth/pending");
    } else if (user.role === UserRole.SCREENER) {
        redirect("/screening");
    } else if (user.role === UserRole.CONTESTANT || user.role === UserRole.FAN) {
        redirect("/");
    }

    return (
        <div className="">
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    {children}
                </SidebarInset>
            </SidebarProvider>
        </div>
    )
}
