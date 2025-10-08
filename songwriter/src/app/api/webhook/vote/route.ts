import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Stripe } from 'stripe';
import { headers } from 'next/headers';
import { Resend } from 'resend';
import { sendFanVotePurchaseToActiveCampaign } from '@/lib/activecampaign';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_VOTE || '';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature') || '';

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (error) {
    return NextResponse.json({ error: `Webhook Error: ${error instanceof Error ? error.message : String(error)}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const correlationId = paymentIntent.id;
      console.log(`[Webhook:vote] Payment intent succeeded`, { id: correlationId });
      
      try {
        if (!paymentIntent.metadata) {
          console.error('[Webhook:vote] Missing metadata', { id: correlationId });
          throw new Error('Payment intent metadata is missing');
        }
        
        const metadata = paymentIntent.metadata;

        if (metadata.type !== 'vote') {
          console.log('[Webhook:vote] Skipping non-vote payment', { id: correlationId, type: metadata.type });
          return NextResponse.json({ received: true });
        }

        console.log('[Webhook:vote] Metadata', { id: correlationId, keys: Object.keys(metadata || {}) });
        
        // Ensure fan exists using stripeCustomerId from metadata
        let fan = null;
        if (metadata.stripeCustomerId) {
          fan = await prisma.fan.findUnique({
            where: { stripeCustomerId: metadata.stripeCustomerId },
          });
          if (!fan) {
            // Create fan if not found
            fan = await prisma.fan.create({
              data: {
                name: metadata.fanName || '',
                email: metadata.fanEmail,
                stripeCustomerId: metadata.stripeCustomerId,
              },
            });
          }
        }
        // Use this fan's ID for vote and purchase records
        const fanIdForVote = fan?.id || metadata.fanId;

        // Parse fan name for ActiveCampaign
        const fanName = metadata.fanName || fan?.name || '';
        const nameParts = fanName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Handle song-based voting (multiple entries)
        if (metadata.voteType === 'song' && metadata.songId && metadata.entryIds) {
          const votePack = await prisma.votePack.findUnique({
            where: { id: metadata.votePackId },
            include: { product: true },
          });

          if (!votePack) {
            console.error('[Webhook:vote] Vote pack not found', { id: correlationId, votePackId: metadata.votePackId });
            throw new Error('Vote pack not found');
          }

          // Parse the array of entry IDs
          const entryIds = JSON.parse(metadata.entryIds);
          const quantity = parseInt(metadata.quantity || '1');
          
          // Get song information for ActiveCampaign
          const songInfo = await prisma.song.findUnique({
            where: { id: metadata.songId },
            include: {
              entries: {
                include: {
                  contestant: true,
                  category: true
                }
              }
            }
          });

          // Create a vote record for each entry
          const votes = [];
          for (const entryId of entryIds) {
            // Create vote record with transactionId
            const vote = await prisma.vote.create({
              data: {
                fanId: fanIdForVote,
                entryId,
                transactionId: paymentIntent.id, // Use payment intent ID as transaction identifier
                priceAtPurchase: Math.floor(paymentIntent.amount / entryIds.length), // Split the price between entries
                quantity, // Each entry gets the full quantity of votes
              },
            });
            
            votes.push(vote);
            console.log('[Webhook:vote] Vote created', { id: correlationId, entryId, voteId: vote.id, quantity: vote.quantity });
          }

          // Create purchase record (only once)
          const purchase = await prisma.purchase.create({
            data: {
              fanId: metadata.fanId,
              productId: votePack.productId,
              priceAtPurchase: paymentIntent.amount,
              quantity,
            },
          });
          console.log('[Webhook:vote] Purchase created', { id: correlationId, purchaseId: purchase.id, quantity });

          // Send data to ActiveCampaign
          if (songInfo && metadata.fanEmail) {
            const contestEntrySupported = `${songInfo.title} by ${metadata.contestantUsername}`;
            const totalVotesPurchased = quantity * entryIds.length;

            try {
              console.log('[Webhook:vote] Sending to ActiveCampaign (song multi-entry)', {
                email: metadata.fanEmail,
                firstName,
                lastName,
                votes_purchased: totalVotesPurchased,
                contest_entry_supported: contestEntrySupported
              });

              const result = await sendFanVotePurchaseToActiveCampaign({
                first_name: firstName,
                last_name: lastName,
                email_address: metadata.fanEmail,
                votes_purchased: totalVotesPurchased,
                contest_entry_supported: contestEntrySupported
              });

              console.log('[Webhook:vote] ActiveCampaign result (song multi-entry)', { id: correlationId, result });
            } catch (activeCampaignError) {
              console.error('[Webhook:vote] Failed to send data to ActiveCampaign (song multi-entry)', { id: correlationId, error: activeCampaignError });
              // Don't fail the entire webhook if ActiveCampaign fails
            }
          }

          return NextResponse.json({ received: true });
        }
        
        // Handle legacy single entry voting
        if (metadata.voteType === 'entry' && metadata.votePackId && metadata.fanId && metadata.entryId) {
          const votePack = await prisma.votePack.findUnique({
            where: { id: metadata.votePackId },
            include: { product: true },
          });

          if (!votePack) {
            console.error('[Webhook:vote] Vote pack not found (legacy)', { id: correlationId, votePackId: metadata.votePackId });
            throw new Error('Vote pack not found');
          }

          // Get entry information for ActiveCampaign
          const entryInfo = await prisma.entry.findUnique({
            where: { id: metadata.entryId },
            include: {
              song: true,
              contestant: true,
              category: true
            }
          });

          // Create vote record with specific entryId and transactionId
          const vote = await prisma.vote.create({
            data: {
              fanId: fanIdForVote,
              entryId: metadata.entryId,
              transactionId: paymentIntent.id, // Use payment intent ID as transaction identifier
              priceAtPurchase: paymentIntent.amount,
              quantity: parseInt(metadata.quantity || '1'),
            },
          });

          // Create purchase record
          const purchase = await prisma.purchase.create({
            data: {
              fanId: metadata.fanId,
              productId: votePack.productId,
              priceAtPurchase: paymentIntent.amount,
              quantity: parseInt(metadata.quantity || '1'),
            },
          });
          console.log('[Webhook:vote] Purchase created (legacy)', { id: correlationId, purchaseId: purchase.id });

          // Send data to ActiveCampaign
          if (entryInfo && metadata.fanEmail) {
            const contestEntrySupported = `${entryInfo.song.title} by ${entryInfo.contestant.username}`;
            const votesPurchased = parseInt(metadata.quantity || '1');

            try {
              console.log('[Webhook:vote] Sending to ActiveCampaign (legacy single entry)', {
                email: metadata.fanEmail,
                firstName,
                lastName,
                votes_purchased: votesPurchased,
                contest_entry_supported: contestEntrySupported
              });

              const result = await sendFanVotePurchaseToActiveCampaign({
                first_name: firstName,
                last_name: lastName,
                email_address: metadata.fanEmail,
                votes_purchased: votesPurchased,
                contest_entry_supported: contestEntrySupported
              });

              console.log('[Webhook:vote] ActiveCampaign result (legacy single entry)', { id: correlationId, result });
            } catch (activeCampaignError) {
              console.error('[Webhook:vote] Failed to send data to ActiveCampaign (legacy single entry)', { id: correlationId, error: activeCampaignError });
              // Don't fail the entire webhook if ActiveCampaign fails
            }
          }
        }
      } catch (error) {
        console.error('[Webhook:vote] Error processing payment success', { id: correlationId, error });
        return NextResponse.json({ error: `Error processing webhook: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
} 