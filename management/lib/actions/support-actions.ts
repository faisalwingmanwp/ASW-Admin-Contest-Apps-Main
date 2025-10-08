'use server';

import { SubmissionErrorType, ErrorStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import prisma from '../db';
import { Resend } from 'resend';
import { requireAdmin } from './auth-guards';

const resend = new Resend(process.env.RESEND_API_KEY);

// Auto-create submission error when upload/processing fails
export async function createSubmissionError(
  entryId: string,
  contestantId: string,
  errorType: SubmissionErrorType,
  errorMessage: string,
  metadata?: {
    originalFile?: string;
    fileSize?: number;
    fileFormat?: string;
  }
) {
  try {
    const submissionError = await prisma.submissionError.create({
      data: {
        entryId,
        contestantId,
        errorType,
        errorMessage,
        originalFile: metadata?.originalFile,
        fileSize: metadata?.fileSize,
        fileFormat: metadata?.fileFormat,
        status: 'DETECTED',
        autoResolved: false,
      },
      include: {
        Entry: {
          select: {
            song: { select: { title: true } },
            competition: { select: { name: true } },
          },
        },
        Contestant: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Send automatic notification to contestant only for types that require entrant action
    if (submissionError.errorType === 'BROKEN_LINK' && submissionError.Contestant?.email) {
      await sendSubmissionErrorNotification(
        submissionError.Contestant.email,
        submissionError.Contestant.firstName || 'Contestant',
        submissionError.errorType,
        submissionError.errorMessage,
        submissionError.Entry.song.title,
        submissionError.Entry.competition.name
      );
    }

    return { success: true, error: null, submissionError };
  } catch (error) {
    console.error('Error creating submission error:', error);
    return { success: false, error: 'Failed to log submission error' };
  }
}

// Get all submission errors with optional filtering
export async function getSubmissionErrors(
  status?: ErrorStatus | string,
  errorType?: SubmissionErrorType | string
) {
  // Authorization check - only admins can view submission errors
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { errors: [], error: auth.error };
  }

  try {
    const where: any = {};
    
    if (status && status !== 'all') {
      where.status = status as ErrorStatus;
    }
    
    if (errorType && errorType !== 'all') {
      where.errorType = errorType as SubmissionErrorType;
    }
    
    const errors = await prisma.submissionError.findMany({
      where,
      include: {
        Contestant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        Entry: {
          select: {
            id: true,
            song: {
              select: {
                title: true,
              },
            },
            competition: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return { errors, error: null };
  } catch (error) {
    console.error('Error fetching submission errors:', error);
    return { errors: [], error: 'Failed to load submission errors' };
  }
}

// Get a single submission error by ID
export async function getSubmissionError(errorId: string) {
  // Authorization check - only admins can view submission error details
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error, submissionError: null };
  }

  try {
    const submissionError = await prisma.submissionError.findUnique({
      where: {
        id: errorId,
      },
      include: {
        Contestant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        Entry: {
          select: {
            id: true,
            song: {
              select: {
                title: true,
              },
            },
            competition: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    
    if (!submissionError) {
      return { submissionError: null, error: 'Submission error not found' };
    }
    
    return { submissionError, error: null };
  } catch (error) {
    console.error('Error fetching submission error:', error);
    return { submissionError: null, error: 'Failed to load submission error' };
  }
}

// Resolve a submission error (mark as resolved with optional note)
export async function resolveSubmissionError(
  errorId: string,
  resolutionNote?: string,
  autoResolved: boolean = false
) {
  // Authorization check - only admins can resolve submission errors
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const errorResult = await getSubmissionError(errorId);
    
    if (errorResult.error || !errorResult.submissionError) {
      return { success: false, error: errorResult.error || 'Error not found' };
    }
    
    const errorData = errorResult.submissionError;

    const updatedError = await prisma.submissionError.update({
      where: {
        id: errorId,
      },
      data: {
        status: 'RESOLVED',
        resolutionNote,
        autoResolved,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    // Send resolution notification to contestant only for BROKEN_LINK
    if (!autoResolved && errorData.errorType === 'BROKEN_LINK' && errorData.Contestant?.email) {
      await sendResolutionNotification(
        errorData.Contestant.email,
        errorData.Contestant.firstName || 'Contestant',
        errorData.errorType,
        errorData.errorMessage,
        errorData.Entry.song.title,
        resolutionNote || 'The submission error has been resolved.'
      );
    }
    
    revalidatePath('/dashboard/support');
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error resolving submission error:', error);
    return { success: false, error: 'Failed to resolve submission error' };
  }
}

// Mark error as ignored (for non-critical errors that don't need resolution)
export async function ignoreSubmissionError(errorId: string, note?: string) {
  // Authorization check - only admins can ignore submission errors
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    await prisma.submissionError.update({
      where: {
        id: errorId,
      },
      data: {
        status: 'IGNORED',
        resolutionNote: note,
        updatedAt: new Date(),
      },
    });
    
    revalidatePath('/dashboard/support');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error ignoring submission error:', error);
    return { success: false, error: 'Failed to ignore submission error' };
  }
}

// Auto-send message for submission errors
export async function sendAutoMessage(errorId: string) {
  // Authorization check - only admins can send auto messages
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const errorResult = await getSubmissionError(errorId);
    
    if (errorResult.error || !errorResult.submissionError) {
      return { success: false, error: errorResult.error || 'Error not found' };
    }
    
    const error = errorResult.submissionError;
    let message = '';
    let canAutoMessage = false;
    
    // Define auto-message logic based on error type
    switch (error.errorType) {
      case 'BROKEN_LINK':
        message = 'We were unable to access your audio file. Please check that your link is working and resubmit your entry with a valid audio link.';
        canAutoMessage = true;
        break;
      default:
        canAutoMessage = false;
    }
    
    if (canAutoMessage) {
      // Update error status to IN_PROGRESS and add message
      const updatedError = await prisma.submissionError.update({
        where: {
          id: errorId,
        },
        data: {
          status: 'IN_PROGRESS',
          resolutionNote: message,
          updatedAt: new Date(),
        },
      });
      
      // Send notification to contestant
      if (error.Contestant?.email) {
        await sendSubmissionErrorNotification(
          error.Contestant.email,
          error.Contestant.firstName || 'Contestant',
          error.errorType,
          message,
          error.Entry.song.title,
          error.Entry.competition.name
        );
      }
      
      return { success: true, error: null };
    }
    
    return { success: false, error: 'Cannot auto-message this error type' };
  } catch (error) {
    console.error('Error sending auto message:', error);
    return { success: false, error: 'Failed to send auto message' };
  }
}

// Get submission error statistics for dashboard
export async function getSubmissionErrorStats() {
  // Authorization check - only admins can view submission error stats
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return {
      totalErrors: 0,
      openErrors: 0,
      resolvedErrors: 0,
      autoResolutionRate: 0,
      errorsByType: [],
      error: auth.error,
    };
  }

  try {
    const [totalErrors, openErrors, resolvedErrors, errorsByType] = await Promise.all([
      prisma.submissionError.count(),
      prisma.submissionError.count({ where: { status: 'DETECTED' } }),
      prisma.submissionError.count({ where: { status: 'RESOLVED' } }),
      prisma.submissionError.groupBy({
        by: ['errorType'],
        _count: { errorType: true },
        orderBy: { _count: { errorType: 'desc' } },
      }),
    ]);
    
    return {
      totalErrors,
      openErrors,
      resolvedErrors,
      autoResolutionRate: totalErrors > 0 ? Math.round((resolvedErrors / totalErrors) * 100) : 0,
      errorsByType: errorsByType.map(item => ({
        type: item.errorType,
        count: item._count.errorType,
      })),
      error: null,
    };
  } catch (error) {
    console.error('Error fetching submission error stats:', error);
    return {
      totalErrors: 0,
      openErrors: 0,
      resolvedErrors: 0,
      autoResolutionRate: 0,
      errorsByType: [],
      error: 'Failed to load statistics',
    };
  }
}

// Email notification for submission errors
async function sendSubmissionErrorNotification(
  email: string,
  name: string,
  errorType: SubmissionErrorType,
  errorMessage: string,
  songTitle: string,
  competitionName: string
) {
  const subject = `Submission Error: ${songTitle}`;
  
  const errorTypeMessages: Record<SubmissionErrorType, string> = {
    BROKEN_LINK: 'We were unable to access your audio file. Please check that your link is working and resubmit your entry.',
    AI_DETECTED: 'We detected that your song was generated by AI. Please resubmit your entry with a song that was written by you.',
    COVER_SONG: 'We detected that your song is a cover song. Please resubmit your entry with a song that was written by you.',
    OTHER: 'We encountered an issue with your song submission. Please contact us for assistance.',
  };

  const logoUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://contests.americansongwriter.com'}/songwriter-logo-black.png`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submission Error</title>
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
    .error-box {
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 5px;
      padding: 15px;
      margin: 15px 0;
      border-left: 4px solid #f39c12;
    }
    .solution-box {
      background-color: #d1ecf1;
      border: 1px solid #bee5eb;
      border-radius: 5px;
      padding: 15px;
      margin: 15px 0;
      border-left: 4px solid #17a2b8;
    }
    .button {
      background-color: #D33F49;
      color: white !important;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      <div class="header">
        <div class="logo-container">
          <img src="${logoUrl}" alt="American Songwriter" style="max-width: 200px; height: auto;">
        </div>
      </div>
      
      <h1>Submission Error</h1>
      
      <p>Hello ${name},</p>
      
      <p>We encountered an issue with your song submission for the <strong>${competitionName}</strong> competition.</p>
      
      <div class="error-box">
        <p><strong>Song:</strong> ${songTitle}</p>
        <p><strong>Error:</strong> ${errorTypeMessages[errorType]}</p>
        <p><strong>Details:</strong> ${errorMessage}</p>
      </div>
      
      <div class="solution-box">
        <p><strong>Next Steps:</strong></p>
        <p>Please resolve the issue and try submitting your song again. If you continue to experience problems, our support team is here to help.</p>
      </div>
      
      <div class="button-container">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://contests.americansongwriter.com'}/dashboard/entries" class="button">
          Try Again
        </a>
      </div>
      
      <p class="text-muted">We're here to help you succeed in our competition!</p>
    </div>
    
    <div class="footer">
      <p>&copy; © 2025 American Songwriter. All rights reserved.</p>
      <p>If you need help, please contact us at <a href="mailto:support@contests.americansongwriter.com" style="color: #D33F49;">support@contests.americansongwriter.com</a></p>
    </div>
  </div>
</body>
</html>
  `;
  
  try {
    await resend.emails.send({
      from: 'American Songwriter <noreply@contests.americansongwriter.com>',
      to: email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending submission error notification:', error);
    return false;
  }
}

// Email notification for error resolution
async function sendResolutionNotification(
  email: string,
  name: string,
  errorType: SubmissionErrorType,
  originalError: string,
  songTitle: string,
  resolution: string
) {
  const subject = `Submission Error Resolved: ${songTitle}`;
  const logoUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://contests.americansongwriter.com'}/songwriter-logo-black.png`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submission Error Resolved</title>
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
      color: #28a745;
      font-size: 24px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .success-box {
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 5px;
      padding: 15px;
      margin: 15px 0;
      border-left: 4px solid #28a745;
    }
    .button {
      background-color: #D33F49;
      color: white !important;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      <div class="header">
        <div class="logo-container">
          <img src="${logoUrl}" alt="American Songwriter" style="max-width: 200px; height: auto;">
        </div>
      </div>
      
      <h1>Issue Resolved</h1>
      
      <p>Hello ${name},</p>
      
      <p>Good news! The submission error for your song <strong>"${songTitle}"</strong> has been resolved.</p>
      
      <div class="success-box">
        <p><strong>Resolution:</strong> ${resolution}</p>
      </div>
      
      <p>You can now proceed with your submission. If you have any other questions, please don't hesitate to contact us.</p>
      
      <div class="button-container">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://contests.americansongwriter.com'}/dashboard/entries" class="button">
          View Your Entries
        </a>
      </div>
      
      <p class="text-muted">Thank you for your patience and for being part of our community!</p>
    </div>
    
    <div class="footer">
      <p>&copy; © 2025 American Songwriter. All rights reserved.</p>
      <p>If you have any questions, please contact us at <a href="mailto:support@contests.americansongwriter.com" style="color: #D33F49;">support@contests.americansongwriter.com</a></p>
    </div>
  </div>
</body>
</html>
  `;
  
  try {
    await resend.emails.send({
      from: 'American Songwriter <noreply@contests.americansongwriter.com>',
      to: email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending resolution notification:', error);
    return false;
  }
}
