'use server';

import { headers } from 'next/headers';
import { prisma } from './db';
import { normalizeEmail } from './voting-utils';

/**
 * Check if email domain is suspicious or disposable
 */
export async function isEmailDomainSuspicious(email: string): Promise<{
  isSuspicious: boolean;
  reason?: string;
}> {
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    return { isSuspicious: true, reason: 'Invalid email format' };
  }
  
  // List of common disposable email domains
  const disposableDomains = [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
    'mailinator.com', 'trashmail.com', 'temp-mail.org',
    'yopmail.com', 'throwaway.email', 'maildrop.cc',
    'sharklasers.com', 'guerrillamail.info', 'guerrillamail.org',
    'guerrillamail.net', 'guerrillamail.biz', 'guerrillamail.de',
    'grr.la', 'guerrillamailblock.com', 'pokemail.net',
    'spam4.me', 'bccto.me', 'chacuo.net', 'dispostable.com',
    'fake-mail.ml', 'filzmail.com', 'getairmail.com',
    'getnada.com', 'internxt.com', 'junk1e.com'
  ];
  
  if (disposableDomains.includes(domain)) {
    return { isSuspicious: true, reason: 'Disposable email domain' };
  }
  
  // Check for suspicious patterns
  if (domain.includes('temp') || domain.includes('disposable') || 
      domain.includes('throw') || domain.includes('fake')) {
    return { isSuspicious: true, reason: 'Suspicious domain pattern' };
  }
  
  return { isSuspicious: false };
}

/**
 * Get client information for integrity tracking
 */
export async function getClientInfo(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
}> {
  const headersList = await headers();
  
  const ipAddress = headersList.get('x-forwarded-for') || 
                   headersList.get('x-real-ip') || 
                   headersList.get('cf-connecting-ip') ||
                   null;
  
  const userAgent = headersList.get('user-agent') || null;
  
  // Create a simple device fingerprint from available headers
  const deviceFingerprint = userAgent ? 
    Buffer.from(userAgent + (ipAddress || '')).toString('base64').slice(0, 32) : 
    null;
  
  return {
    ipAddress: ipAddress?.split(',')[0].trim() || null,
    userAgent,
    deviceFingerprint
  };
}

/**
 * Check if request shows bot-like behavior
 */
export async function detectBot(userAgent: string | null): Promise<{
  isBot: boolean;
  reason?: string;
}> {
  if (!userAgent) {
    return { isBot: true, reason: 'No user agent' };
  }
  
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
    /python/i, /java/i, /node/i, /php/i, /perl/i, /ruby/i,
    /headless/i, /phantom/i, /selenium/i, /webdriver/i,
    /puppeteer/i, /playwright/i
  ];
  
  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      return { isBot: true, reason: 'Bot user agent detected' };
    }
  }
  
  return { isBot: false };
}

/**
 * Check voting rate limits for IP address
 */
export async function checkVotingRateLimit(
  ipAddress: string | null,
  email: string
): Promise<{
  isAllowed: boolean;
  reason?: string;
  hoursRemaining?: number;
}> {
  if (!ipAddress) {
    // If no IP available, fall back to email-only check
    return { isAllowed: true };
  }
  
  // Check if this IP has voted recently (last 24 hours)
  const recentVotes = await prisma.vote.findMany({
    where: {
      ipAddress,
      priceAtPurchase: 0, // Only check free votes
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  
  if (recentVotes.length > 0) {
    const lastVoteTime = recentVotes[0].createdAt;
    const timeSinceLastVote = Date.now() - lastVoteTime.getTime();
    const hoursSinceLastVote = timeSinceLastVote / (1000 * 60 * 60);
    
    if (hoursSinceLastVote < 24) {
      const hoursRemaining = Math.ceil(24 - hoursSinceLastVote);
      return {
        isAllowed: false,
        reason: `This user has voted in the last 24 hours. Please try again in ${hoursRemaining} hour${hoursRemaining === 1 ? '' : 's'}.`,
        hoursRemaining
      };
    }
  }
  
  return { isAllowed: true };
}

/**
 * Comprehensive voting integrity check
 */
export async function validateVotingIntegrity(
  email: string,
  options: {
    skipBotCheck?: boolean;
    skipRateLimit?: boolean;
  } = {}
): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  clientInfo: {
    ipAddress: string | null;
    userAgent: string | null;
    deviceFingerprint: string | null;
  };
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Get client information
  const clientInfo = await getClientInfo();
  
  // 1. Email validation and normalization
  const normalizedEmail = normalizeEmail(email);
  
  // 2. Check email domain
  const domainCheck = await isEmailDomainSuspicious(email);
  if (domainCheck.isSuspicious) {
    errors.push(`Suspicious email domain: ${domainCheck.reason}`);
  }
  
  // 3. Bot detection
  if (!options.skipBotCheck) {
    const botCheck = await detectBot(clientInfo.userAgent);
    if (botCheck.isBot) {
      errors.push(`Bot detected: ${botCheck.reason}`);
    }
  }
  
  // 4. Rate limiting
  if (!options.skipRateLimit) {
    const rateLimitCheck = await checkVotingRateLimit(clientInfo.ipAddress, email);
    if (!rateLimitCheck.isAllowed) {
      errors.push(rateLimitCheck.reason || 'Rate limit exceeded');
    }
  }
  
  // 5. Check for suspicious patterns
  if (clientInfo.ipAddress) {
    // Check if this IP has been used with multiple email addresses recently
    const recentEmailsFromIP = await prisma.vote.findMany({
      where: {
        ipAddress: clientInfo.ipAddress,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      },
      include: {
        fan: {
          select: { email: true }
        }
      }
    });
    
    const uniqueEmails = new Set(
      recentEmailsFromIP
        .map(vote => vote.fan?.email)
        .filter(Boolean)
    );
    
    if (uniqueEmails.size > 3) {
      warnings.push('Multiple email addresses detected from this IP');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    clientInfo
  };
}

/**
 * Create or update fan with normalized email
 */
export async function createOrUpdateFan(
  name: string | undefined,
  email: string,
  clientInfo: {
    ipAddress: string | null;
    userAgent: string | null;
    deviceFingerprint: string | null;
  }
) {
  const normalizedEmail = normalizeEmail(email);
  
  let fan = await prisma.fan.findUnique({
    where: { normalizedEmail },
    include: {
      votes: {
        where: { priceAtPurchase: 0 },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });
  
  if (fan) {
    // Update existing fan if name is different
    if (name && fan.name !== name) {
      fan = await prisma.fan.update({
        where: { id: fan.id },
        data: { name },
        include: {
          votes: {
            where: { priceAtPurchase: 0 },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });
    }
    
    return fan;
  } else {
    // Create new fan
    return await prisma.fan.create({
      data: {
        name: name || null,
        email,
        normalizedEmail,
      },
      include: {
        votes: {
          where: { priceAtPurchase: 0 },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
  }
} 