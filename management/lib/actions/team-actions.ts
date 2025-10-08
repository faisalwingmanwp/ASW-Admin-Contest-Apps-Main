'use server';

import prisma from '../db';
import { UserRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from './auth-guards';

export async function updateUserRole(userId: string, newRole: UserRole) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const userToUpdate = await prisma.users.findUnique({
      where: { id: userId },
      include: { Screener: true },
    });

    if (!userToUpdate) {
      return { success: false, error: 'User not found.' };
    }

    let newApprovedStatus = userToUpdate.approved;

    // Logic for role-specific changes and approval status
    if (userToUpdate.role === newRole) {
      return { success: true, message: 'User already has this role.' }; // Or { success: false, error: ... }
    }

    if (newRole === UserRole.SCREENER) {
      // If becoming a screener, mark as unapproved (screener application process)
      newApprovedStatus = false;
      // Ensure a screener profile exists, create if not
      if (!userToUpdate.Screener) {
        await prisma.screener.create({
          data: {
            id: userId, // Use user ID for screener profile ID
            userId: userId,
            // bio: 'Newly assigned Screener' // Optional: default bio or other fields
          },
        });
      }
    } else if (newRole === UserRole.ADMIN) {
      // If becoming Admin or Judge, they are implicitly approved by this action
      newApprovedStatus = true;
      // If they were a screener, their screener profile can remain for now.
      // Decide if it should be removed or deactivated if changing FROM Screener.
    } else if (newRole === UserRole.FAN || newRole === UserRole.CONTESTANT || newRole === UserRole.UNVERIFIED) {
        // Demoting to these roles might imply they are no longer an active part of the admin/screening team
        newApprovedStatus = false; // Or true if they are still a valid, active fan/contestant
        // If they were a Screener, consider what happens to their Screener profile.
     }

    await prisma.users.update({
      where: { id: userId },
      data: {
        role: newRole,
        approved: newApprovedStatus,
      },
    });

    revalidatePath('/dashboard/screeners'); // Revalidate the team management page path

    return { success: true, message: `User role updated to ${newRole}.` };
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return { success: false, error: error.message || 'Failed to update user role.' };
  }
}

export async function removeTeamMember(userId: string) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const userToRemove = await prisma.users.findUnique({
      where: { id: userId },
      include: { Screener: true }, // Check if they have a screener profile
    });

    if (!userToRemove) {
      return { success: false, error: 'User not found.' };
    }

    // If the user is a super admin, prevent removal through this action for safety
    if (userToRemove.isSuperAdmin) {
      return { success: false, error: 'Super admins cannot be removed through this action.' };
    }

    // If they have a Screener profile, delete it first
    if (userToRemove.Screener) {
      await prisma.screener.delete({
        where: { userId: userId },
      });
    }

    // Update the user's role to FAN and set approved to false
    await prisma.users.update({
      where: { id: userId },
      data: {
        role: UserRole.FAN,
        approved: false,
        // Consider if other fields should be reset, e.g., clearing superAdmin status if that was managed elsewhere
      },
    });

    revalidatePath('/dashboard/screeners'); // Or /dashboard/team, ensure correct path

    return { success: true, message: 'Team member removed successfully.' };
  } catch (error: any) {
    console.error('Error removing team member:', error);
    // Check for specific Prisma errors, like foreign key constraints if not handled by schema
    if (error.code === 'P2003') { // Foreign key constraint failed
        return { success: false, error: 'Cannot remove user due to existing related data. Please reassign or delete their tasks/reviews first.' };
    }
    return { success: false, error: error.message || 'Failed to remove team member.' };
  }
}

export async function resendInvitation(invitationId: string) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return { success: false, error: 'Invitation not found.' };
    }

    // "Resending" is simulated by updating the createdAt timestamp to make it current
    // This assumes your logic for expiration is based on this timestamp
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { createdAt: new Date() },
    });
    
    // Here you would also trigger the email sending service again
    // e.g., await sendInvitationEmail(invitation.email, invitation.invitedRole);

    revalidatePath('/dashboard/screeners');
    return { success: true, message: 'Invitation resent successfully.' };
  } catch (error: any) {
    console.error('Error resending invitation:', error);
    return { success: false, error: 'Failed to resend invitation.' };
  }
}

export async function cancelInvitation(invitationId: string) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    await prisma.invitation.delete({
      where: { id: invitationId },
    });

    revalidatePath('/dashboard/screeners');
    return { success: true, message: 'Invitation canceled successfully.' };
  } catch (error: any) {
    console.error('Error canceling invitation:', error);
    if (error.code === 'P2025') { // Record to delete not found
      return { success: false, error: 'Invitation not found or already canceled.' };
    }
    return { success: false, error: 'Failed to cancel invitation.' };
  }
} 