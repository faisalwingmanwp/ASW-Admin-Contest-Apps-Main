import { NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@vercel/firewall';
import { normalizeEmail } from '@/lib/voting-utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { 
            votePackId, 
            entryId, 
            songId, 
            entryIds, 
            voteType, 
            fanName, 
            fanEmail, 
            quantity
        } = body;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

        // Get the vote pack from the database
        const votePack = await prisma.votePack.findUnique({
            where: { id: votePackId },
            include: {
                product: true,
            },
        });

        if (!votePack) {
            return NextResponse.json({ error: 'Vote pack not found' }, { status: 404 });
        }

        // Get or create fan record, ensuring Stripe customer ID
        let fan = await prisma.fan.findUnique({
            where: { email: fanEmail },
        });

        let stripeCustomerId = fan?.stripeCustomerId;

        if (!fan) {
            // Create Stripe customer first
            const customer = await stripe.customers.create({
                email: fanEmail,
                name: fanName,
            });
            stripeCustomerId = customer.id;
            fan = await prisma.fan.create({
                data: {
                    name: fanName,
                    email: fanEmail,
                    stripeCustomerId,
                },
            });
        } else if (!stripeCustomerId) {
            // Fan exists but doesn't have Stripe customer ID
            const customer = await stripe.customers.create({
                email: fanEmail,
                name: fanName,
            });
            stripeCustomerId = customer.id;
            fan = await prisma.fan.update({
                where: { id: fan.id },
                data: { stripeCustomerId },
            });
        }
        
        // Find associated entry or contestant information for product name display
        let entryInfo = null;
        let contestantUsername = '';
        
        if (voteType === 'entry' && entryId) {
            entryInfo = await prisma.entry.findUnique({
                where: { id: entryId },
                include: {
                    song: true,
                    contestant: true
                }
            });
            if (entryInfo?.contestant) {
                contestantUsername = entryInfo.contestant.username;
            }
        } else if (voteType === 'song' && songId && entryIds && entryIds.length > 0) {
            // Get the song and one of the entries to find contestant info
            const songInfo = await prisma.song.findUnique({
                where: { id: songId }
            });
            
            const firstEntry = await prisma.entry.findFirst({
                where: { id: { in: entryIds } },
                include: { contestant: true }
            });
            
            if (songInfo && firstEntry?.contestant) {
                entryInfo = { 
                    song: songInfo,
                    contestant: firstEntry.contestant
                };
                contestantUsername = firstEntry.contestant.username;
            }
        }
        
        if (!entryInfo || !contestantUsername) {
            return NextResponse.json({ error: 'Could not find entry or contestant information' }, { status: 400 });
        }

        // Create a line item with descriptive name
        const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
            quantity: 1,
            adjustable_quantity: {
                enabled: false
            },
            price_data: {
                currency: 'usd',
                unit_amount: (votePack.product.price),
                product_data: {
                    name: `${votePack.quantity} Votes for ${entryInfo.song.title}`,
                    description: `Vote, for ${contestantUsername}'s song ${entryInfo.song.title}`
                },
                
            },
        };
        console.log('Line item:', lineItem, votePack);

        // Create common metadata for all voting types
        const commonMetadata = {
            type: 'vote',
            voteType: voteType,
            votePackId: votePack.id,
            fanId: fan.id,
            fanEmail: fanEmail,
            fanName: fanName || '',
            stripeCustomerId: stripeCustomerId,
            quantity: quantity.toString(),
            contestantUsername: contestantUsername,
            songTitle: entryInfo.song.title
        };

        // Handle song-based voting (multiple entries)
        let specificMetadata = {};
        if (voteType === 'song' && songId && entryIds && Array.isArray(entryIds) && entryIds.length > 0) {
            specificMetadata = {
                songId,
                entryIds: JSON.stringify(entryIds),
            };
        } else {
            // Legacy single entry voting
            specificMetadata = {
                entryId,
            };
        }

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            line_items: [lineItem],
            mode: 'payment',
            success_url: `${siteUrl}/${contestantUsername}?voteConfirmed=true`,
            cancel_url: `${siteUrl}/${contestantUsername}/vote?songId=${songId}&entries=${entryIds.join(',')}`,
            customer_email: fanEmail,
            allow_promotion_codes: true,
            automatic_tax: {
                enabled: true
            },
            // Set metadata on both the session and payment intent for redundancy
            payment_intent_data: {
                metadata: {
                    ...commonMetadata,
                    ...specificMetadata
                },
            },
            metadata: {
                ...commonMetadata,
                ...specificMetadata
            }
        });

        if (!session.url) {
            console.error("Stripe Checkout Session URL is missing.");
            return NextResponse.json(
                { error: 'Failed to create checkout session.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ 
            url: session.url,
            fanId: fan.id,
        });
    } catch (error) {
        console.error('Vote checkout error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json(
            { error: `Failed to create checkout session: ${errorMessage}` },
            { status: 500 }
        );
    }
} 