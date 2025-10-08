'use server';

import { prisma } from './db';
import { revalidatePath } from 'next/cache';
import { 
  validateVotingIntegrity, 
  createOrUpdateFan, 
} from './voting-integrity';
import { checkRateLimit } from '@vercel/firewall';
import { normalizeEmail } from './voting-utils';
import { randomUUID } from 'crypto';

interface FreeVoteParams {
  name?: string;
  email?: string;
  contestantId: string;
  entryId?: string;
  songId?: string;
  entryIds?: string[];
  voteType: 'song' | 'entry';
  honeypot?: string; // Bot detection field
  captchaToken?: string | null; // reCAPTCHA token
}

/**
 * Generate a unique transaction ID for free votes
 */
function generateFreeVoteTransactionId(): string {
  return `free_vote_${randomUUID()}`;
}

/**
 * Submit a free vote for an entry or multiple entries associated with a song
 */
export async function submitFreeVote({
  name,
  email,
  contestantId,
  entryId,
  songId,
  entryIds,
  voteType,
  honeypot,
  captchaToken
}: FreeVoteParams) {
  try {
    // Basic input validation
    if (!email) {
      throw new Error('Email is required for voting');
    }

    // Check honeypot field for bot detection
    if (honeypot && honeypot.trim() !== '') {
      return { 
        success: false, 
        error: 'bot_detected',
        message: 'Bot activity detected. Please try again later.' 
      };
    }

    // Validate reCAPTCHA token
    if (!captchaToken) {
      return { 
        success: false, 
        error: 'captcha_required',
        message: 'Please complete the reCAPTCHA verification.' 
      };
    }

    // Verify reCAPTCHA v3 token with Google
    const captchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`
    });

    const captchaData = await captchaResponse.json();
    
    if (!captchaData.success) {
      return { 
        success: false, 
        error: 'captcha_failed',
        message: 'Security verification failed. Please try again.' 
      };
    }

    const score = captchaData.score || 0;
    const minScore = 0.5; 
    
    if (score < minScore) {
      console.warn(`Low reCAPTCHA score detected: ${score} for email: ${email}`);
      return { 
        success: false, 
        error: 'captcha_failed',
        message: 'Security verification failed. Please try again later or contact support.' 
      };
    }

    // Log successful verification with score for monitoring
    console.log(`reCAPTCHA verification successful. Score: ${score}, Email: ${email}`);

    // Vercel firewall rate limiting

      const [rateLimitedEmail, rateLimitedIp] = await Promise.all([
          checkRateLimit('voting-rate-limit', { 
          rateLimitKey: normalizeEmail(email)
      }),

          checkRateLimit('voting-rate-limit')
      ]);
      
    console.log('rateLimitedEmail', rateLimitedEmail);
    console.log('rateLimitedIp', rateLimitedIp);
    
    if (rateLimitedEmail.rateLimited || rateLimitedIp.rateLimited) {
      return { 
        success: false,
        error: 'rate_limit',
        message: 'Too many requests. Please try again later.'
      };
    }

    // Comprehensive voting integrity validation
    const integrityCheck = await validateVotingIntegrity(email, {
      skipBotCheck: false,
      skipRateLimit: false
    });

    if (!integrityCheck.isValid) {
      return { 
        success: false, 
        error: 'integrity_violation',
        message: integrityCheck.errors[0] || 'Vote validation failed'
      };
    }

    // Create or update fan with normalized email
    const fan = await createOrUpdateFan(name, email, integrityCheck.clientInfo);

    // Check if the fan has voted within the last 24 hours with a free vote
    if (fan.votes.length > 0) {
      const lastVoteTime = fan.votes[0].createdAt;
      const timeSinceLastVote = Date.now() - lastVoteTime.getTime();
      const hoursSinceLastVote = timeSinceLastVote / (1000 * 60 * 60);
      
      if (hoursSinceLastVote < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastVote);
        return { 
          success: false, 
          error: 'rate_limit',
          message: `You can only cast one free vote every 24 hours. Please try again in ${hoursRemaining} hour${hoursRemaining === 1 ? '' : 's'}.`,
          hoursRemaining 
        };
      }
    }

    const fanId = fan.id;

    // Handle song-based voting (multiple entries)
    if (voteType === 'song' && songId && entryIds && Array.isArray(entryIds) && entryIds.length > 0) {
      // Create a vote for each entry with integrity tracking
      const votes = await Promise.all(
        entryIds.map(entry => 
          prisma.vote.create({
            data: {
              fanId,
              entryId: entry,
              priceAtPurchase: 0, // Free vote
              quantity: 1, // One vote per entry
              transactionId: generateFreeVoteTransactionId(),
              ipAddress: integrityCheck.clientInfo.ipAddress,
              userAgent: integrityCheck.clientInfo.userAgent,
              deviceFingerprint: integrityCheck.clientInfo.deviceFingerprint,
            },
          })
        )
      );
      
      // Show warnings if any
      if (integrityCheck.warnings.length > 0) {
        console.warn('Voting integrity warnings:', integrityCheck.warnings);
      }
      
      // Revalidate contestant page
      revalidatePath(`/${contestantId}`);
      
      return { 
        success: true, 
        votes,
        message: "Your vote has been submitted! You can cast another free vote in 24 hours, or help the artist by purchasing votes."
      };
    }
    
    // Legacy single entry voting
    if (!entryId) {
      throw new Error('Entry ID is required for single entry voting');
    }
    
    const vote = await prisma.vote.create({
      data: {
        fanId,
        entryId,
        priceAtPurchase: 0, // Free vote
        quantity: 1, // One vote
        transactionId: generateFreeVoteTransactionId(),
        ipAddress: integrityCheck.clientInfo.ipAddress,
        userAgent: integrityCheck.clientInfo.userAgent,
        deviceFingerprint: integrityCheck.clientInfo.deviceFingerprint,
      },
    });
    
    // Show warnings if any
    if (integrityCheck.warnings.length > 0) {
      console.warn('Voting integrity warnings:', integrityCheck.warnings);
    }
    
    // Revalidate contestant page
    revalidatePath(`/${contestantId}`);
    
    return { 
      success: true, 
      vote,
      message: "Your vote has been submitted! You can cast another free vote in 24 hours, or help the artist by purchasing votes."
    };
  } catch (error) {
    console.error('Free vote error:', error);
    return { success: false, error: 'general_error', message: 'Failed to submit vote' };
  }
} 