"use server";

import { redirect } from "next/navigation";
import { createClient } from "../supabase/supabase-server";
import prisma from "../db";
import { UserRole, InvitationStatus } from "@prisma/client";
import { roleRouter } from "./actions";

export async function login({ email }: {email: string}) {
  const supabase = await createClient();

  console.log(`login()`, email)
  const user = await prisma.users.findUnique({
    where: { email: email },
  });

  if (!user) {
    return { error: "User not found, please obtain a new invitation." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/auth/verify-otp?email=${email}`);
}

export async function signup({
  email,
  firstName,
  lastName,
  preferredCategories
}: {
  email: string, 
  firstName: string, 
  lastName: string, 
  preferredCategories?: string[]
}) {
  const supabase = await createClient();

  console.log(`signup() for ${email}`, firstName, lastName, preferredCategories)

  const invitation = await prisma.invitation.findUnique({
    where: { email: email, status: InvitationStatus.PENDING }, 
  });

  if (!invitation) {
    console.warn(`No PENDING invitation found for ${email}.`);
    return { error: "No invitation found" };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: {
        first_name: firstName,
        last_name: lastName,
        invited_role: invitation.invitedRole,
        ...(invitation.invitedRole === UserRole.SCREENER && preferredCategories && { preferred_categories: preferredCategories }),
      },
    },
  });
  
  if (error) {
    return { error: error.message };
  }

  redirect(`/auth/verify-otp?email=${email}`);
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  console.log(`signInWithGoogle() called`)

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }
}

export async function createOrUpdateUser(
  userId: string, 
  userEmail: string, 
  firstName?: string, 
  lastName?: string,
  preferredCategories?: string[],
  invitedRole?: UserRole
) {
  console.log(`createOrUpdateUser() with invitedRole: ${invitedRole}`, userId, userEmail, firstName, lastName)
  
  const dbUserRole = invitedRole || UserRole.UNVERIFIED;

  if (dbUserRole === UserRole.SCREENER) {
    const inviteExists = await prisma.invitation.findUnique({
      where: { email: userEmail, invitedRole: UserRole.SCREENER, status: InvitationStatus.PENDING },
    });

    if (!inviteExists) {
      return { error: "Screener invite not found", success: false, role: UserRole.UNVERIFIED, isSuperAdmin: false};
    }
  }

  const user = await prisma.users.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: userEmail,
      first_name: firstName,
      last_name: lastName,
      role: dbUserRole,
      approved: false, 
    },
    update: {
      email: userEmail,
      ...(firstName && { first_name: firstName }),
      ...(lastName && { last_name: lastName }),
      ...(dbUserRole !== UserRole.UNVERIFIED && { role: dbUserRole }), 
    },
  });

  if (dbUserRole === UserRole.SCREENER) {
    const existingScreener = await prisma.screener.findUnique({
      where: { userId: userId },
    });

    if (!existingScreener) {
      await prisma.screener.create({
        data: {
          id: userId,
          userId: userId,
          ...(preferredCategories && preferredCategories.length > 0 && {
            Category: { 
              connect: preferredCategories.map(catId => ({ id: catId }))
            }
          })
        }
      });
    } else if (preferredCategories && preferredCategories.length > 0) {
      await prisma.screener.update({
        where: { userId: userId },
        data: {
          Category: {
            set: preferredCategories.map(catId => ({ id: catId }))
          }
        }
      });
    }
  }
  
  if (invitedRole) {
    try {
      await prisma.invitation.updateMany({
        where: { 
          email: userEmail, 
          invitedRole: invitedRole,
          status: InvitationStatus.PENDING 
        },
        data: { status: InvitationStatus.ACCEPTED, updatedAt: new Date() },
      });
      console.log(`Updated invitation for ${userEmail} / ${invitedRole} to ACCEPTED.`);
    } catch (invError) {
      console.error(`Failed to update invitation status for ${userEmail} / ${invitedRole}:`, invError);
    }
  }
  
  return user;
}

export async function verifyOtp({ email, otp }: {email: string, otp: string}) {
  const supabase = await createClient();
  console.log(`verifyOtp()`, email, otp);

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'email'
  });

  if (error) {
    console.error("OTP verification error:", error);
    return { error: error.message };
  }

  const authUser = data?.user;
  if (!authUser?.id || !authUser?.email) {
    console.error("Missing user data after OTP verification");
    return { error: "Failed to retrieve user data" };
  }

  const metadata = authUser.user_metadata;
  const preferredCategories = metadata?.preferred_categories as string[] || [];
  const invitedRoleFromMetadata = metadata?.invited_role as UserRole | undefined;
  
  const dbUser = await createOrUpdateUser(
    authUser.id,
    authUser.email,
    metadata?.first_name || metadata?.given_name,
    metadata?.last_name || metadata?.family_name,
    preferredCategories,
    invitedRoleFromMetadata
  );

  if (!dbUser) {
    console.error("Failed to create or update user in database");
    return { error: "Failed to process user data" };
  }

  if (dbUser.role === UserRole.ADMIN || dbUser.isSuperAdmin) {
    redirect("/dashboard");
  }

   await roleRouter();
   return { success: true };
}

export async function logout() {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return { error: error.message };
  }
  
  redirect("/auth/login");
}