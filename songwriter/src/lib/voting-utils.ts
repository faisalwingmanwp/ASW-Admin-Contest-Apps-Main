/**
 * Normalize email address to prevent spoofing techniques
 * - Remove dots from Gmail addresses
 * - Remove plus aliases (gmail+anything@gmail.com)
 * - Convert to lowercase
 */
export function normalizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return email;
    }
    
    const lowercaseEmail = email.toLowerCase().trim();
    const [localPart, domain] = lowercaseEmail.split('@');
    
    if (!localPart || !domain) {
      return lowercaseEmail;
    }
    
    // Handle Gmail and Google Apps domains
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      // Remove dots and plus aliases
      const normalizedLocal = localPart.replace(/\./g, '').split('+')[0];
      return `${normalizedLocal}@gmail.com`;
    }
    
    // Handle other common email providers that ignore dots
    const dotIgnoreDomains = [
      'outlook.com', 'hotmail.com', 'live.com', 'msn.com'
    ];
    
    if (dotIgnoreDomains.includes(domain)) {
      const normalizedLocal = localPart.replace(/\./g, '').split('+')[0];
      return `${normalizedLocal}@${domain}`;
    }
    
    // For other domains, just remove plus aliases
    const normalizedLocal = localPart.split('+')[0];
    return `${normalizedLocal}@${domain}`;
  }
  