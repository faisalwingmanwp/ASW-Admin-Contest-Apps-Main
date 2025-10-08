import { NextRequest, NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { prisma } from '@/lib/db';
import { Resend } from 'resend';
import { sendContestantPurchaseToActiveCampaign } from '@/lib/activecampaign';
import OrderConfirmation from '@/components/emails/OrderConfirmation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_ENTRY || '';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle different event types
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const correlationId = paymentIntent.id;

  // Start with current metadata, then try to enrich from Checkout Session and Customer
  let metadata: Record<string, string> = { ...(paymentIntent.metadata || {}) };

  // Try to enrich PaymentIntent metadata BEFORE requiring contestantId
  try {
    const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent.id, limit: 1 });
    const session = sessions.data[0];
    const country = session?.customer_details?.address?.country || '';
    const customerEmail = session?.customer_details?.email || metadata.email || '';
    const customerPhone = session?.customer_details?.phone || metadata.phone || '';

    // Merge session.metadata first so any existing paymentIntent.metadata takes precedence
    const sessionMetadata: Record<string, string> = { ...(session?.metadata || ({} as any)) } as Record<string, string>;
    const enriched: Record<string, string> = {
      ...sessionMetadata,
      ...metadata,
      email: customerEmail,
      phone: customerPhone,
      country: country,
      payment_status: paymentIntent.status,
    };

    if (!enriched.orderId) {
      enriched.orderId = paymentIntent.id;
    }

    // If contestantId still missing, try to fetch from Stripe Customer metadata
    if (!enriched.contestantId && paymentIntent.customer) {
      try {
        const customer = await stripe.customers.retrieve(paymentIntent.customer as string);
        if (!('deleted' in customer)) {
          const cid = (customer.metadata?.contestantId || customer.metadata?.contestantID || '') as string;
          if (cid) enriched.contestantId = cid;
        }
      } catch (custErr) {
        console.warn('[Webhook:entry] Could not retrieve Stripe customer for metadata', { id: correlationId, error: custErr });
      }
    }

    // Persist enriched metadata back to the PaymentIntent (best-effort)
    try {
      await stripe.paymentIntents.update(paymentIntent.id, { metadata: enriched });
      metadata = enriched;
    } catch (updateErr) {
      console.warn('[Webhook:entry] Failed to persist enriched metadata to PaymentIntent', { id: correlationId, error: updateErr });
      metadata = enriched; // still use locally
    }
  } catch (metaErr) {
    console.warn('[Webhook:entry] Failed to enrich PaymentIntent metadata', { id: correlationId, error: metaErr });
  }

  // Final attempt to derive contestantId from entryIds if still missing
  if (!metadata.contestantId) {
    // Consolidate entryIds from possibly chunked keys
    let allEntryIds: string[] = [];
    if (metadata.entryIds) {
      try { allEntryIds = JSON.parse(metadata.entryIds as string); } catch {}
    } else {
      for (let i = 1; i <= 10; i++) {
        const key = `entryIds_${i}`;
        if (metadata[key]) {
          try {
            const chunk = JSON.parse(metadata[key] as string);
            if (Array.isArray(chunk)) allEntryIds.push(...chunk);
          } catch {}
        }
      }
    }

    if (allEntryIds.length > 0) {
      const anyEntry = await prisma.entry.findFirst({ where: { id: { in: allEntryIds } }, select: { contestantId: true } });
      if (anyEntry?.contestantId) {
        metadata.contestantId = anyEntry.contestantId;
        try {
          await stripe.paymentIntents.update(paymentIntent.id, { metadata });
        } catch {}
      }
    }
  }

  const contestantId = metadata.contestantId;
  const entryIds = metadata.entryIds;
  const hasMembership = metadata.hasMembership;
  const hasFanContest = metadata.hasFanContest;
  const smsConsent = metadata.smsConsent;
  const phone = metadata.phone;
  const type = metadata.type;
  const competitionId = metadata.competitionId;
  const competitionName = metadata.competitionName;

  if (!contestantId) {
    console.error('[Webhook:entry] Missing contestantId in payment metadata', { id: correlationId });
    return;
  }
  
  // Get the contestant
  const contestant = await prisma.contestant.findUnique({
    where: { id: contestantId },
  });

  if (!contestant) {
    console.error('[Webhook:entry] Contestant not found', { id: correlationId, contestantId });
    return;
  }

  // Get payment amounts from Stripe
  const amount = paymentIntent.amount;
  const amountReceived = paymentIntent.amount_received;
  
  // Get tax amount from latest charge
  let taxAmount = 0;
  if (paymentIntent.latest_charge) {
    const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
    // Extract tax from charge details if available
    if (charge.calculated_statement_descriptor) {
      // This is a simplified approach - in practice you might need to parse this differently
      taxAmount = charge.amount - charge.amount_captured || 0;
    }
  }
  
  const subtotal = amount - taxAmount;

  console.log('[Webhook:entry] Payment received', { id: correlationId, contestantId });
  console.log('[Webhook:entry] Payment metadata keys', { id: correlationId, keys: Object.keys(paymentIntent.metadata || {}) });
  console.log('[Webhook:entry] Payment type', { id: correlationId, type });

  // Metadata enrichment already attempted above; proceed
  
  if (type === 'fan-contest') {
    console.log('[Webhook:entry] Processing fan contest payment', { id: correlationId, contestantId });
    
    const fanContestProduct = await prisma.product.findFirst({
      where: { type: 'FAN_CONTEST' }
    });
    
    if (fanContestProduct) {
      const purchase = await prisma.purchase.create({
        data: {
          contestantId,
          productId: fanContestProduct.id,
          priceAtPurchase: fanContestProduct.price,
          quantity: 1,
          competitionId: competitionId || undefined
        }
      });
      console.log('[Webhook:entry] Fan contest purchase created', { id: correlationId, purchaseId: purchase.id });

      // Send confirmation email
      try {
        await resend.emails.send({
          from: 'American Songwriter <admin@contests.americansongwriter.com>',
          to: contestant.email || '',
          subject: 'Fan Favorite Contest Confirmation',
          react: OrderConfirmation({
            contestantName: contestant.username,
            email: contestant.email || '',
            entries: [{
              songTitle: "Fan Favorite Contest",
              category: "Fan Voting Enabled",
              price: fanContestProduct.price
            }],
            orderId: paymentIntent.id,
            subtotal: fanContestProduct.price,
            tax: 0,
            total: fanContestProduct.price,
            competitionName: competitionName
          })
        });
      } catch (error) {
        console.error('[Webhook:entry] Failed to send confirmation email', { id: correlationId, error });
      }
      
      return;
    }
  }

  // Continue with regular entry payment processing
  console.log('[Webhook:entry] Processing regular entry payment', { id: correlationId, entryIds })

  // Array to collect all purchased items for the email
  let allPurchasedItems: Array<{ songTitle: string; category: string; price: number }> = [];
  // Keep track of how many entry items were purchased (excludes membership/fan contest add-ons)
  let entriesPurchasedCount = 0;

  // Update entries to paid status and collect them
  // Consolidate entryIds from possibly chunked keys
  console.log('paymentIntent.metadata', paymentIntent.metadata);
  let allEntryIds: string[] = [];
  if (paymentIntent.metadata.entryIds) {
    try { allEntryIds = JSON.parse(paymentIntent.metadata.entryIds as string); } catch {}
  } else {
    // look for chunked keys entryIds_1..entryIds_10
    for (let i = 1; i <= 10; i++) {
      const key = `entryIds_${i}`;
      if (paymentIntent.metadata[key]) {
        try {
          const chunk = JSON.parse(paymentIntent.metadata[key] as string);
          if (Array.isArray(chunk)) allEntryIds.push(...chunk);
        } catch {}
      }
    }
  }

  if (allEntryIds.length > 0) {
    const ids = allEntryIds;
    
    await prisma.entry.updateMany({
      where: {
        id: {
          in: ids
        },
        contestantId
      },
      data: {
        paid: true
      }
    });

    // Get only the entries that were just paid for in this transaction
    const justPaidEntries = await prisma.entry.findMany({
      where: { 
        id: {
          in: ids
        },
        contestantId
      },
      include: {
        song: true,
        category: true,
        competition: true
      }
    });

    // Add song entries to the purchased items
    allPurchasedItems.push(...justPaidEntries.map(entry => ({
      songTitle: entry.song.title,
      category: entry.category.title,
      price: entry.competition.price
    })));
    entriesPurchasedCount += justPaidEntries.length;
  }

  // Handle membership purchase if needed
  if (hasMembership === 'true') {
    const membershipProduct = await prisma.product.findFirst({
      where: { type: 'MEMBERSHIP' }
    });
    
    if (membershipProduct) {
      // Calculate the discounted price (40% off)
      const discountPercent = 40;
      const discountedPrice = Math.round(membershipProduct.price * (1 - discountPercent / 100));
      
      const purchase = await prisma.purchase.create({
        data: {
            contestantId,
            productId: membershipProduct.id,
            priceAtPurchase: discountedPrice,
            quantity: 1
        }
      });
      console.log('[Webhook:entry] Membership purchase created', { id: correlationId, purchaseId: purchase.id });

      // Add membership to purchased items
      allPurchasedItems.push({
        songTitle: `American Songwriter Membership (${discountPercent}% Off)`,
        category: "Annual Membership Access",
        price: discountedPrice
      });
    }
  }

  // Handle fan contest entry if needed
  if (hasFanContest === 'true') {
    const fanContestProduct = await prisma.product.findFirst({
      where: { type: 'FAN_CONTEST' }
    });
    
    if (fanContestProduct) {
      const purchase = await prisma.purchase.create({
        data: {
            contestantId: contestantId,
            productId: fanContestProduct.id,
            priceAtPurchase: fanContestProduct.price,
            quantity: 1,
            competitionId: competitionId || undefined
        }
      });
      console.log('[Webhook:entry] Fan contest add-on purchase created', { id: correlationId, purchaseId: purchase.id });

      // Add fan contest to purchased items
      allPurchasedItems.push({
        songTitle: "Fan Favorite Contest",
        category: "Fan Voting Enabled",
        price: fanContestProduct.price
      });
    }
  }

  if (smsConsent === 'true' && phone) {
    await prisma.contestant.update({
      where: { id: contestantId },
      data: { smsConsent: true, phone: phone }
    });
  }

  // Send confirmation email for ALL purchased items
  if (allPurchasedItems.length > 0) {
    // Also send to ActiveCampaign for contestant purchases
    try {
      const purchaseSummary = allPurchasedItems
        .map(item => `${item.songTitle} (${item.category}) - $${(item.price / 100).toFixed(2)}`)
        .join('; ');

      const firstName = contestant.firstName
      const lastName = contestant.lastName;

      console.log('[Webhook:entry] Sending contestant purchase to ActiveCampaign', {
        email: contestant.email,
        entries_purchased: entriesPurchasedCount,
        purchase_type: type,
        competition_name: competitionName
      });

      const acResult = await sendContestantPurchaseToActiveCampaign({
        first_name: firstName || '',
        last_name: lastName || '',
        email_address: contestant.email || '',
        entries_purchased: entriesPurchasedCount,
        purchase_type: String(type || 'entry'),
        competition_name: competitionName,
        purchase_summary: purchaseSummary
      });

      console.log('[Webhook:entry] ActiveCampaign result (contestant)', { id: correlationId, result: acResult });
    } catch (acError) {
      console.error('[Webhook:entry] Failed to send contestant data to ActiveCampaign', { id: correlationId, error: acError });
      // Do not fail webhook on AC error
    }

    try {
        const emailSubject = type === 'additional_category' 
          ? 'Additional Category Purchase Confirmation'
          : 'Your Song Contest Entry Confirmation';

        await resend.emails.send({
        from: 'American Songwriter <admin@contests.americansongwriter.com>',
        to: contestant.email || '',
        subject: emailSubject,
        react: OrderConfirmation({
            contestantName: contestant.username,
            email: contestant.email || '',
            entries: allPurchasedItems,
            orderId: paymentIntent.id,
            subtotal: subtotal,
            tax: taxAmount,
            total: amount,
            competitionName: competitionName
        })
        });
    } catch (error) {
        console.error('[Webhook:entry] Failed to send confirmation email', { id: correlationId, error });
    }
  }
} 

// Handles subscription-mode checkouts where metadata is on the Checkout Session (not the PaymentIntent)
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const correlationId = session.id;
  const metadata: Record<string, string> = { ...(session.metadata || {}) } as Record<string, string>;

  // Pull contestantId – fallback to customer metadata if missing
  if (!metadata.contestantId && session.customer) {
    try {
      const customer = await stripe.customers.retrieve(session.customer as string);
      if (!('deleted' in customer)) {
        const cid = (customer.metadata?.contestantId || customer.metadata?.contestantID || '') as string;
        if (cid) metadata.contestantId = cid;
      }
    } catch (err) {
      console.warn('[Webhook:entry][session.completed] Could not fetch customer for contestantId', { id: correlationId, error: err });
    }
  }

  // Consolidate entryIds (supports chunked keys entryIds_1..entryIds_10)
  let allEntryIds: string[] = [];
  if (metadata.entryIds) {
    try { allEntryIds = JSON.parse(metadata.entryIds as string); } catch {}
  } else {
    for (let i = 1; i <= 10; i++) {
      const key = `entryIds_${i}`;
      if (metadata[key]) {
        try {
          const chunk = JSON.parse(metadata[key] as string);
          if (Array.isArray(chunk)) allEntryIds.push(...chunk);
        } catch {}
      }
    }
  }

  // Fallback to get contestantId from any entry
  if (!metadata.contestantId && allEntryIds.length > 0) {
    const anyEntry = await prisma.entry.findFirst({ where: { id: { in: allEntryIds } }, select: { contestantId: true } });
    if (anyEntry?.contestantId) metadata.contestantId = anyEntry.contestantId;
  }

  const contestantId = metadata.contestantId;
  const competitionId = metadata.competitionId;
  const competitionName = metadata.competitionName;
  const hasMembership = metadata.hasMembership;
  const hasFanContest = metadata.hasFanContest;
  const type = metadata.type;

  if (!contestantId) {
    console.error('[Webhook:entry][session.completed] Missing contestantId', { id: correlationId });
    return;
  }

  const contestant = await prisma.contestant.findUnique({ where: { id: contestantId } });
  if (!contestant) {
    console.error('[Webhook:entry][session.completed] Contestant not found', { id: correlationId, contestantId });
    return;
  }

  // Use amounts from Checkout Session
  const amount = session.amount_total || 0;
  const subtotal = session.amount_subtotal || 0;
  const taxAmount = Math.max(0, amount - subtotal);

  let allPurchasedItems: Array<{ songTitle: string; category: string; price: number }> = [];
  let entriesPurchasedCount = 0;

  // Mark entries as paid and collect for email
  if (allEntryIds.length > 0) {
    await prisma.entry.updateMany({
      where: { id: { in: allEntryIds }, contestantId },
      data: { paid: true },
    });

    const justPaidEntries = await prisma.entry.findMany({
      where: { id: { in: allEntryIds }, contestantId },
      include: { song: true, category: true, competition: true },
    });
    allPurchasedItems.push(
      ...justPaidEntries.map((e) => ({ songTitle: e.song.title, category: e.category.title, price: e.competition.price }))
    );
    entriesPurchasedCount += justPaidEntries.length;
  }

  // Create membership purchase if present
  if (hasMembership === 'true') {
    const membershipProduct = await prisma.product.findFirst({ where: { type: 'MEMBERSHIP' } });
    if (membershipProduct) {
      const discountPercent = 40;
      const discountedPrice = Math.round(membershipProduct.price * (1 - discountPercent / 100));
      await prisma.purchase.create({
        data: {
          contestantId,
          productId: membershipProduct.id,
          priceAtPurchase: discountedPrice,
          quantity: 1,
        },
      });
      allPurchasedItems.push({
        songTitle: `American Songwriter Membership (${discountPercent}% Off)`,
        category: 'Annual Membership Access',
        price: discountedPrice,
      });
    }
  }

  // Create fan contest purchase if present
  if (hasFanContest === 'true') {
    const fanContestProduct = await prisma.product.findFirst({ where: { type: 'FAN_CONTEST' } });
    if (fanContestProduct) {
      await prisma.purchase.create({
        data: {
          contestantId,
          productId: fanContestProduct.id,
          priceAtPurchase: fanContestProduct.price,
          quantity: 1,
          competitionId: competitionId || undefined,
        },
      });
      allPurchasedItems.push({
        songTitle: 'Fan Favorite Contest',
        category: 'Fan Voting Enabled',
        price: fanContestProduct.price,
      });
    }
  }

  // AC + email
  if (allPurchasedItems.length > 0) {
    try {
      const purchaseSummary = allPurchasedItems
        .map((item) => `${item.songTitle} (${item.category}) - $${(item.price / 100).toFixed(2)}`)
        .join('; ');

      const acResult = await sendContestantPurchaseToActiveCampaign({
        first_name: contestant.firstName || '',
        last_name: contestant.lastName || '',
        email_address: contestant.email || '',
        entries_purchased: entriesPurchasedCount,
        purchase_type: String(type || 'entry'),
        competition_name: competitionName,
        purchase_summary: purchaseSummary,
      });
      console.log('[Webhook:entry][session.completed] AC result', { id: correlationId, result: acResult });
    } catch (err) {
      console.error('[Webhook:entry][session.completed] AC error', { id: correlationId, error: err });
    }

    try {
      const emailSubject = type === 'additional_category' ? 'Additional Category Purchase Confirmation' : 'Your Song Contest Entry Confirmation';
      await resend.emails.send({
        from: 'American Songwriter <admin@contests.americansongwriter.com>',
        to: contestant.email || '',
        subject: emailSubject,
        react: OrderConfirmation({
          contestantName: contestant.username,
          email: contestant.email || '',
          entries: allPurchasedItems,
          orderId: session.id,
          subtotal,
          tax: taxAmount,
          total: amount,
          competitionName,
        }),
      });
    } catch (err) {
      console.error('[Webhook:entry][session.completed] Email error', { id: correlationId, error: err });
    }
  }
}
