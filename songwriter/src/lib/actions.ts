'use server';

import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

export async function getAuthenticatedUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
        redirect("/auth/login")
    }
    
    return user
}

  