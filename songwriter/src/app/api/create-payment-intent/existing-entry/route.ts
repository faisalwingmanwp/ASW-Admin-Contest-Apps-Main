import { NextRequest, NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { getStandardProducts } from '@/lib/product-actions';
import { prisma } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { entryId } = await request.json();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
        
    // Get entry with related data
    const entry = await prisma.entry.findFirst({
      where: {
        id: entryId
      },
      include: {
        song: true,
        category: true,
        competition: true,
        contestant: true
      }
    });

    if (!entry) {
      console.error('No entry found', entryId);
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );    
    }
    
    // Find or create Stripe customer if contestant exists
    let stripeCustomerId = entry.contestant.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: entry.contestant.email || '',
        name: `${entry.contestant.firstName || ''} ${entry.contestant.lastName || ''}`.trim(),
        metadata: {
          contestantId: entry.contestant.id,
          username: entry.contestant.username
        }
      });
      
      stripeCustomerId = customer.id;
      
      await prisma.contestant.update({
        where: { id: entry.contestant.id },
        data: { stripeCustomerId: customer.id }
      });
    }
    
    // Construct line item for the entry
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      quantity: 1,
      adjustable_quantity: {
        enabled: false
      },
      price_data: {
        currency: 'usd',
        unit_amount: entry.competition.price,
        product_data: {
          name: entry.song.title,
          description: `${entry.category.title} song entry in ${entry.competition.name}`
        }
      }
    };
    
    // Prepare rich metadata
    const submissionDate = new Date().toISOString();
    const baseMetadata: Record<string, string> = {
      contestantId: entry.contestant.id,
      contestantEmail: entry.contestant.email || '',
      competitionId: entry.competition.id,
      competitionName: entry.competition.name,
      type: 'existing_entry',
      orderId: '', // will be linked on webhook if needed
      product_id: process.env.SONG_ENTRY_PRODUCT_ID || '',
      submission_date: submissionDate,
      first_name: entry.contestant.firstName || '',
      last_name: entry.contestant.lastName || '',
      email: entry.contestant.email || '',
      artist_name: entry.song.artistName || '',
      co_writers: entry.song.coWriters || '',
      song_title: entry.song.title,
      song_categories: entry.category.title,
      song_url: entry.song.link,
      payment_status: 'pending',
      entry_count: '1',
    };

    // Leave single entry id under 500 chars directly
    baseMetadata.entryIds = JSON.stringify([entryId]);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items: [lineItem],
      mode: 'payment',
      customer: stripeCustomerId,
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/profile`,
      phone_number_collection: {
        enabled: true
      },
      allow_promotion_codes: true,
      automatic_tax: {
        enabled: true
      },
      payment_intent_data: {
        metadata: baseMetadata
      },
      metadata: baseMetadata
    });
    
    if (!session.url) {
      console.error("Stripe Checkout Session URL is missing.");
      return NextResponse.json(
        { error: 'Failed to create checkout session.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: `Failed to create checkout session: ${errorMessage}` },
      { status: 500 }
    );
  }
} 