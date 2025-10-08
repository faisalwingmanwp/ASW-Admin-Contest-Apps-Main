"use server"
import { UserRole, ReviewStatus } from "@prisma/client";
import { createClient } from "../supabase/supabase-server";
import prisma from "../db";
import { Resend } from 'resend';
import { requireAdmin, requireScreenerOrAdmin } from './auth-guards';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'American Songwriter Admin <admin@contests.americansongwriter.com>'; 


export async function approveScreener(screenerId: string) {
  // Authorization check - only admins can approve screeners
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

    try {
      const screener = await prisma.screener.findUnique({
        where: { id: screenerId },
        include: { users: true }
      });
  
      if (!screener || !screener.users) {
        return { error: "Screener not found or user data missing" };
      }
  
      // Update the user to set them as an active screener
      await prisma.users.update({
        where: { id: screener.userId },
        data: {
          approved: true
        }
      });

      const screenerName = screener.users.first_name || 'Screener';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const loginLink = `${siteUrl}/auth/login`; 
      const emailHtml = createScreenerApprovedEmail(screenerName, loginLink);

      try {
        await resend.emails.send({
          from: fromEmail,
          to: screener.users.email, // Send to the screener's email
          subject: "Your American Songwriter Screener Account is Approved!",
          html: emailHtml,
        });
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
        // Non-fatal: proceed even if email fails, but log it.
      }
  
      return { success: true };
    } catch (error: any) {
      console.error("Error approving screener:", error);
      return { error: error.message || "Failed to approve screener" };
    }
  }
  
export async function rejectScreener(screenerId: string) {
  // Authorization check - only admins can reject screeners
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const screener = await prisma.screener.findUnique({
      where: { id: screenerId },
      include: { users: true }
    });

    if (!screener || !screener.users) {
      return { error: "Screener not found or user data missing" };
    }

    const screenerEmail = screener.users.email;
    const screenerName = screener.users.first_name || 'Applicant';

    await prisma.screener.delete({
      where: { id: screenerId }
    });

    await prisma.users.delete({
      where: { id: screener.userId },
    });

    await prisma.invitation.delete({
      where: { email: screenerEmail }
    });

    if (screenerEmail) {
      const emailHtml = createScreenerRejectedEmail(screenerName);
      try {
        await resend.emails.send({
          from: fromEmail,
          to: screenerEmail,
          subject: "An Update on Your American Songwriter Screener Application",
          html: emailHtml,
        });
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error rejecting screener:", error);
    return { error: error.message || "Failed to reject screener" };
  }
}
  
export async function getPendingScreeners() {
  // Authorization check - only admins can view pending screeners
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const screeners = await prisma.screener.findMany({
      where: {
        users: {
          approved: false,
          role: UserRole.SCREENER
        }
      },
      include: {
        users: true,
        Category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('screeners', screeners);
    return { screeners };
  } catch (error: any) {
    console.error("Error fetching pending screeners:", error);
    return { error: error.message || "Failed to fetch pending screeners" };
  }
}
  
export async function getActiveScreeners() {
  // Authorization check - only admins can view active screeners
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const screeners = await prisma.screener.findMany({
      where: {
        users: {
          approved: true,
          role: UserRole.SCREENER
        }
      },
      include: {
        users: true,
        Category: true,
        EntryReview: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return { screeners };
  } catch (error: any) {
    console.error("Error fetching active screeners:", error);
    return { error: error.message || "Failed to fetch active screeners" };
  }
}

export async function getActiveTeamMembers() {
  // Authorization check - only admins can view team members
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { teamMembers: [], error: auth.error };
  }

  try {
    const teamMembers = await prisma.users.findMany({
      where: {
        // Fetch users who are approved OR have a role other than UNVERIFIED/FAN
        // This logic might need refinement based on exact requirements for who is a "team member"
        OR: [
          { approved: true }, 
          { role: { notIn: [UserRole.UNVERIFIED, UserRole.FAN, UserRole.CONTESTANT] } }
        ],
      },
      include: {
        Screener: { // Include screener-specific details if they are a screener
          include: {
            Category: true,
            EntryReview: {
              select: {
                id: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: {
        first_name: 'asc' // Or by role, or by created_at for users table
      }
    });

    // Transform data to a consistent shape, similar to how screeners were handled
    const formattedTeamMembers = teamMembers.map(member => {
      let reviewStats = null;
      let preferredCategories: { id: string; title: string; }[] = [];
      let screenerProfileCreatedAt = null; // If they are a screener, when was screener profile made

      if (member.role === UserRole.SCREENER && member.Screener) {
        const reviews = member.Screener.EntryReview?.map(er => ({ id: er.id, status: er.status })) || [];
        const completed = reviews.filter(r => r.status === ReviewStatus.COMPLETED || r.status === ReviewStatus.REJECTED).length;
        reviewStats = { total: reviews.length, completed };
        preferredCategories = member.Screener.Category?.map(c => ({ id: c.id, title: c.title })) || [];
        screenerProfileCreatedAt = member.Screener.createdAt;
      }

      return {
        id: member.id, // User ID
        userId: member.id, // For consistency with old Screener type if needed in UI
        email: member.email,
        firstName: member.first_name,
        lastName: member.last_name,
        role: member.role,
        approved: !!member.approved, // Ensure boolean
        isSuperAdmin: !!member.isSuperAdmin, // Ensure boolean
        createdAt: screenerProfileCreatedAt, // This is screener profile creation, adjust if general user createdAt is needed
        userCreatedAt: null, // Placeholder for actual user record createdAt if needed from users table
        preferredCategories: preferredCategories,
        reviewStats: reviewStats,
        // Screener specific data is now nested or processed into the main object
        // This structure can be adjusted based on how you want to display data for different roles
      };
    });

    return { teamMembers: formattedTeamMembers, error: null };
  } catch (error: any) {
    console.error("Error fetching active team members:", error);
    return { teamMembers: [], error: error.message || "Failed to fetch active team members" };
  }
}
  
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      return { user: null, error: "Not authenticated" };
    }
    
    // Get user from database
    const user = await prisma.users.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        approved: true,
        isSuperAdmin: true,
        Screener: {
          include: {
            Category: true,
            EntryReview: {
              select: {
                id: true,
                status: true
              }
            }
          }
        }
      }
    });
    
    if (!user) {
      return { user: null, error: "User not found in database" };
    }
    
    return { user, error: null };
  } catch (error: any) {
    console.error("Error fetching current user:", error);
    return { user: null, error: error.message || "Failed to fetch user data" };
  }
}

export async function getScreenerProfile() {
  try {
    const { user, error } = await getCurrentUser();
    
    if (error) {
      return { profile: null, error };
    }
    
    if (!user || user.role !== UserRole.SCREENER) {
      return { profile: null, error: "Not authorized as a screener" };
    }
    
    if (!user.Screener) {
      return { profile: null, error: "Screener profile not found" };
    }
    
    // Get screener with more detailed information
    const screenerProfile = await prisma.screener.findUnique({
      where: { id: user.Screener.id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            approved: true
          }
        },
        Category: true,
        EntryReview: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });
    
    if (!screenerProfile) {
      return { profile: null, error: "Screener profile not found" };
    }
    
    // Add additional fields like bio and avatarUrl if needed in the future
    const enhancedProfile = {
      ...screenerProfile,
      bio: screenerProfile.bio || "",
      avatarUrl: null // Placeholder for future avatar support
    };
    
    return { profile: enhancedProfile, error: null };
  } catch (error: any) {
    console.error("Error fetching screener profile:", error);
    return { profile: null, error: error.message || "Failed to fetch screener profile" };
  }
}

export async function updateScreenerProfile(data: {
  firstName?: string;
  lastName?: string;
  bio?: string;
  preferredCategories?: string[];
}) {
  // Authorization check - screeners can update their own profile, admins can update any
  const auth = await requireScreenerOrAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const { user, error } = await getCurrentUser();
    
    if (error) {
      return { success: false, error };
    }
    
    if (!user || user.role !== UserRole.SCREENER) {
      return { success: false, error: "Not authorized as a screener" };
    }
    
    if (!user.Screener) {
      return { success: false, error: "Screener profile not found" };
    }
    
    const screenerId = user.Screener.id;
    
    const result = await prisma.$transaction(async (tx) => {
      // Update user's name if provided
      if (data.firstName !== undefined || data.lastName !== undefined) {
        await tx.users.update({
          where: { id: user.id },
          data: {
            first_name: data.firstName ?? user.first_name,
            last_name: data.lastName ?? user.last_name
          }
        });
      }
      
      // Update screener profile with bio if provided
      if (data.bio !== undefined) {
        await tx.screener.update({
          where: { id: screenerId },
          data: {
            bio: data.bio
          }
        });
      }
      
      // Update preferred categories if provided
      if (data.preferredCategories && data.preferredCategories.length > 0) {
        // First disconnect all existing categories
        await tx.screener.update({
          where: { id: screenerId },
          data: {
            Category: {
              set: [] // Clear existing connections
            }
          }
        });
        
        // Then connect the new ones
        await tx.screener.update({
          where: { id: screenerId },
          data: {
            Category: {
              connect: data.preferredCategories.map(categoryId => ({ id: categoryId }))
            }
          }
        });
      }
      
      return true;
    });
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error updating screener profile:", error);
    return { success: false, error: error.message || "Failed to update screener profile" };
  }
}

// Renamed from createScreenerInvitationEmail and made more generic
function createInvitationEmail(message: string | undefined, inviteLink: string, invitedRole: UserRole): string {
  const defaultMessage = `We'd like to invite you to join our team on American Songwriter as a ${invitedRole.toLowerCase()}. Please use the link below to sign up.`;
  const displayMessage = message || defaultMessage;
  const roleTitle = invitedRole.charAt(0).toUpperCase() + invitedRole.slice(1).toLowerCase();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to Join American Songwriter</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      margin: 0;
      padding: 0;
      color: #333;
      background-color: #f9fafb;
      line-height: 1.5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .email-card {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 30px;
      margin-bottom: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo-container {
      margin-bottom: 20px;
    }
    h1 {
      color: #111827;
      font-size: 24px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .button {
      background-color: #D33F49;
      color: white !important; /* Ensure text is white */
      border: none;
      border-radius: 6px;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 500;
      text-decoration: none;
      display: inline-block;
      text-align: center;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .button:hover {
      background-color: #b22f3b;
    }
    .button-container {
      text-align: center;
      margin-top: 30px;
      margin-bottom: 30px;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 40px;
    }
    .text-muted {
      color: #6b7280;
    }
    .extra-info {
      background-color: #f9fafb;
      border-left: 3px solid #D33F49;
      padding: 16px;
      margin-top: 30px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      <div class="header">
        <div class="logo-container">
          <img src="https://contests.americansongwriter.com/_next/image?url=%2Fsongwriter-logo-black.png&w=256&q=75" alt="American Songwriter" style="max-width: 200px; height: auto;">
        </div>
      </div>
      
      <h1>You're Invited!</h1>
      
      <p>${displayMessage}</p>
      
      <div class="button-container">
        <a href="${inviteLink}" class="button">Sign Up Now</a>
      </div>
      
      <p class="text-muted">If you're not interested or this was a mistake, you can safely ignore this email.</p>
            
      <div class="extra-info">
        <p><strong>About American Songwriter:</strong> We're dedicated to discovering and promoting songwriting talent from around the world. As a ${roleTitle}, you'll play an important role in this mission.</p>
      </div>
    </div>
    
    <div class="footer">
      <p>&copy; © 2025 American Songwriter. All rights reserved.</p>
      <p>If you're having trouble, contact <a href="mailto:support@contests.americansongwriter.com" style="color: #D33F49;">support@americansongwriter.com</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

// Email template for Screener Approved
function createScreenerApprovedEmail(name: string, loginLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Screener Account Approved</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; margin: 0; padding: 0; color: #333; background-color: #f9fafb; line-height: 1.5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .email-card { background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); padding: 30px; margin-bottom: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo-container { margin-bottom: 20px; }
    h1 { color: #111827; font-size: 24px; font-weight: 600; margin-top: 0; margin-bottom: 16px; }
    .button { background-color: #D33F49; color: white !important; border: none; border-radius: 6px; padding: 12px 24px; font-size: 16px; font-weight: 500; text-decoration: none; display: inline-block; text-align: center; cursor: pointer; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
    .button:hover { background-color: #b22f3b; }
    .button-container { text-align: center; margin-top: 30px; margin-bottom: 30px; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      <div class="header">
        <div class="logo-container">
          <img src="https://contests.americansongwriter.com/_next/image?url=%2Fsongwriter-logo-black.png&w=256&q=75" alt="American Songwriter" style="max-width: 200px; height: auto;">
        </div>
      </div>
      <h1>Account Approved!</h1>
      <p>Hello ${name},</p>
      <p>Congratulations! Your application to become a screener for American Songwriter has been approved. You can now log in to your account and start reviewing entries.</p>
      <div class="button-container">
        <a href="${loginLink}" class="button">Log In to Screening Panel</a>
      </div>
      <p class="text-muted">We're excited to have you on the team!</p>
    </div>
    <div class="footer">
      <p>&copy; © 2025 American Songwriter. All rights reserved.</p>
      <p>If you're having trouble, contact <a href="mailto:support@contests.americansongwriter.com" style="color: #D33F49;">support@americansongwriter.com</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

// Email template for Screener Rejected
function createScreenerRejectedEmail(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Screener Application Update</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; margin: 0; padding: 0; color: #333; background-color: #f9fafb; line-height: 1.5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .email-card { background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); padding: 30px; margin-bottom: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo-container { margin-bottom: 20px; }
    h1 { color: #111827; font-size: 24px; font-weight: 600; margin-top: 0; margin-bottom: 16px; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      <div class="header">
        <div class="logo-container">
          <img src="https://contests.americansongwriter.com/_next/image?url=%2Fsongwriter-logo-black.png&w=256&q=75" alt="American Songwriter" style="max-width: 200px; height: auto;">
        </div>
      </div>
      <h1>Application Update</h1>
      <p>Hello ${name},</p>
      <p>Thank you for your interest in becoming a screener for American Songwriter. After careful consideration, we've decided not to move forward with your application at this time.</p>
      <p>We appreciate you taking the time to apply and wish you the best in your future endeavors. We encourage you to apply again in the future if opportunities arise.</p>
      <p class="text-muted">Thank you for your understanding.</p>
    </div>
    <div class="footer">
      <p>&copy; © 2025 American Songwriter. All rights reserved./p>
      <p>If you have any questions, contact <a href="mailto:support@contests.americansongwriter.com" style="color: #D33F49;">support@contests.americansongwriter.com</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendInvitations(emailList: string[], invitedRole: UserRole, message?: string) {
  // Authorization check - only admins can send invitations
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("Resend API key is not configured.");
    return { success: false, error: "Server configuration error: Unable to send emails." };
  }
  if (!fromEmail.includes('@')) { // Basic check for a valid from email
    console.error("Resend 'from' email is not configured correctly.");
    return { success: false, error: "Server configuration error: Invalid sender email." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const baseInviteLink = `${siteUrl}/auth/accept-invite`;

  const emailPromises = emailList.map(async email => {
    const inviteLinkWithEmailAndRole = `${baseInviteLink}?email=${encodeURIComponent(email)}&role=${invitedRole}`;
    const htmlBody = createInvitationEmail(message, inviteLinkWithEmailAndRole, invitedRole);
    const subject = `Invitation to Join American Songwriter as a ${invitedRole.charAt(0).toUpperCase() + invitedRole.slice(1).toLowerCase()}`;

    try {
      await prisma.invitation.upsert({
        where: { email: email }, 
        update: { status: 'PENDING', createdAt: new Date(), invitedRole: invitedRole }, 
        create: { email: email, status: 'PENDING', invitedRole: invitedRole },
      });

      const response = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: subject,
        html: htmlBody,
      });

      if (response.error) {
        console.error(`Failed to send invitation to ${email}:`, response.error);
        return { email, success: false, error: response.error.message };
      }
      return { email, success: true, id: response.data?.id };
    } catch (e: any) {
      console.error(`Exception processing invitation for ${email}:`, e);
      return { email, success: false, error: e.message || 'Unknown error' };
    }
  });

  const results = await Promise.all(emailPromises);
  const allSuccessful = results.every(r => r.success);
  const overallError = results.find(r => !r.success)?.error;

  if (allSuccessful) {
    return { success: true, results };
  } else {
    return { success: false, error: `Failed to send one or more invitations. Last error: ${overallError}`, results };
  }
}

export async function getPendingInvitations() {
  // Authorization check - only admins can view pending invitations
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { invitations: [], error: auth.error };
  }

  try {
    const invitations = await prisma.invitation.findMany({
      where: {
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return { invitations, error: null };
  } catch (error: any) {
    console.error("Error fetching outgoing invitations:", error);
    return { invitations: [], error: error.message || "Failed to fetch invitations" };
  }
}

export async function getScreenerDashboardData() {
  try {
    const { user, error } = await getCurrentUser();

    if (error || !user) {
      return {
        error: error || "User not found.",
        stats: { pending: 0, assigned: 0, completed: 0 },
        pendingReviews: [],
        completedReviews: [],
        user: null,
      };
    }
    
    if (!user.Screener) {
      return { 
        error: "Screener profile not found.",
        stats: { pending: 0, assigned: 0, completed: 0 },
        pendingReviews: [],
        completedReviews: [],
        user,
      };
    }

    const reviews = await prisma.entryReview.findMany({
      where: { screenerId: user.Screener.id },
      include: {
        Entry: {
          include: {
            song: { select: { title: true } },
            category: { select: { title: true } },
            contestant: { select: { username: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const transformedReviews = reviews.map(({ Entry, ...review }) => ({
      ...review,
      entry: Entry,
    }));

    const pending = transformedReviews.filter(r => r.status === ReviewStatus.UNASSIGNED);
    const assigned = transformedReviews.filter(r => r.status === ReviewStatus.PENDING_REVIEW);
    const completed = transformedReviews.filter(r => 
      [ReviewStatus.COMPLETED, ReviewStatus.NEEDS_MORE_INFORMATION, ReviewStatus.NEEDS_ANOTHER_REVIEW].includes(r.status as any)
    );

    return {
      user,
      stats: {
        pending: pending.length,
        assigned: assigned.length,
        completed: completed.length,
      },
      pendingReviews: pending,
      completedReviews: completed,
      error: null,
    };
  } catch (e: any) {
    console.error("Error fetching screener dashboard data:", e);
    return {
      error: e.message || "Failed to fetch dashboard data.",
      stats: { pending: 0, assigned: 0, completed: 0 },
      pendingReviews: [],
      completedReviews: [],
      user: null,
    };
  }
}