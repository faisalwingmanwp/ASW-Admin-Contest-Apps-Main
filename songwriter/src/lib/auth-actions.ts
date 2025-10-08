"use server";

import { prisma } from "./db";
import { createClient } from "./supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Links an authenticated user with their contestant record
 * This is called after a user signs in and has a Supabase Auth ID
 */
export async function linkUserToContestant() {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            console.error("Error getting user:", error);
            return { success: false, error: "Authentication error" };
        }

        // Find contestant by email
        const contestant = await prisma.contestant.findUnique({ where: { email: user.email } });

        if (!contestant) {
            console.error("No contestant found with email:", user.email);
            return { success: false, error: "No contestant record found" };
        }

        // Update the contestant with the auth ID
        await prisma.contestant.update({
            where: { id: contestant.id },
            data: { authId: user.id },
        });

        return { success: true, contestantId: contestant.id };
    } catch (error) {
        console.error("Error linking user to contestant:", error);
        return { success: false, error: "Something went wrong" };
    }
}

/**
 * Gets the current user's contestant record
 */
export async function getCurrentContestant() {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return null;
        }

        // First check by authId
        let contestant = await prisma.contestant.findFirst({
            where: { authId: user.id },
        });

        // If not found, check by email and update authId if found
        if (!contestant && user.email) {
            contestant = await prisma.contestant.findUnique({
                 where: { email: user.email },
            });

            // If found by email, update with authId
            if (contestant) {
                contestant = await prisma.contestant.update({
                    where: { id: contestant.id },
                    data: { authId: user.id },
                });
            }
        }

        return contestant;
    } catch (error) {
        console.error("Error getting current contestant:", error);
        return null;
    }
}

/**
 * Verifies the OTP code and signs in the user
 */
export async function verifyOtp({ email, otp }: { email: string; otp: string }) {
    try {
        const supabase = await createClient();
        
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'email'
        });
        
        if (error) {
            console.error("Error verifying OTP:", error);
            return { success: false, error: error.message };
        }
        
        if (!data.user) {
            return { success: false, error: "Verification failed" };
        }
        
        // Link user to contestant if not already linked
        const linkResult = await linkUserToContestant();
        
        return { success: true };
    } catch (error) {
        console.error("Error during OTP verification:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
} 