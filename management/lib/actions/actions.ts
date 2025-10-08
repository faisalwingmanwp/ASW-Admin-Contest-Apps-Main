"use server"
import { redirect } from "next/navigation"
import { createClient } from "../supabase/supabase-server"
import { getCurrentUser } from "./screener-actions"
import { UserRole } from "@prisma/client"

export async function getAuthenticatedUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
        redirect("/auth/login")
    }
    
    
    return user
}


export async function roleRouter() {
    const { user, error } = await getCurrentUser()

    if (error || !user) {
        redirect("/auth/login")
    }

    if (user.role === UserRole.UNVERIFIED) {
        redirect("/auth/pending");
    }

    if (user.role === UserRole.ADMIN || user.isSuperAdmin) {
        redirect("/dashboard");
    } else if (user.role === UserRole.SCREENER) {
        redirect("/screening");
    } else if (user.role === UserRole.CONTESTANT) {
        redirect("/");
    } else {
        redirect("/dashboard");
    }
}