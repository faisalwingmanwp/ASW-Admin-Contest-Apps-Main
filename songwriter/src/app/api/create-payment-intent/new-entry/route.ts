import { NextRequest, NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { prisma } from '@/lib/db';
import { getStandardProducts } from '@/lib/product-actions';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

type CheckoutData = {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    userName: string;
    smsConsent: boolean;
    songs: {
        title: string;
        link: string;
        categories: string[];
        coWriters: string;
        artistName: string;
    }[];
    competitionId: string;
    addOns: {
        membership: boolean;
        fanContest: boolean;
    };
};


export async function POST(request: NextRequest) {
    console.time('Full Request');
    try {
        console.time('1. Data Parsing');
        const data: CheckoutData = await request.json();
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        console.timeEnd('1. Data Parsing');

        // Basic validation
        console.time('2. Basic Validation');
        if (!data.email || !data.firstName || !data.lastName || !data.userName || 
            !data.competitionId || !data.songs || data.songs.length === 0) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }
        
        for (const song of data.songs) {
            if (!song.title || !song.link || !song.artistName || !song.categories || song.categories.length === 0) {
                return NextResponse.json(
                    { error: 'Each song must have a title, artist name, link, and at least one category' },
                    { status: 400 }
                );
            }
        }
        console.timeEnd('2. Basic Validation');

        // --- Parallelize Validation Data Fetches ---
        console.time('3. Parallel DB Checks');
        const categoryIdsFromSongs = Array.from(new Set(data.songs.flatMap(s => s.categories))) as string[];

        const [
            existingContestantByEmailForUsernameCheck,
            competitionResult,
            categoriesDetailsResult
        ] = await Promise.all([
            data.userName 
                ? prisma.contestant.findUnique({
                    where: { email: data.email },
                    select: { id: true, username: true }
                  })
                : Promise.resolve(null),
            prisma.competition.findUnique({
                where: { id: data.competitionId },
            }),
            prisma.category.findMany({
                where: {
                    id: { in: categoryIdsFromSongs }
                }
            })
        ]);
        console.timeEnd('3. Parallel DB Checks');

        const competition = competitionResult;
        const categories = categoriesDetailsResult; 

        // --- Refactored Contestant Logic ---
        console.time('4. Username and Contestant Upsert');
        // 1. Check username availability
        if (data.userName) {
            if (!existingContestantByEmailForUsernameCheck || 
                (existingContestantByEmailForUsernameCheck && existingContestantByEmailForUsernameCheck.username !== data.userName)) {
                const existingUsername = await prisma.contestant.findFirst({
                    where: { username: data.userName },
                    select: { id: true }
                });
                if (existingUsername) {
                    return NextResponse.json(
                        { error: 'Username is already taken' },
                        { status: 400 }
                    );
                }
            }
        }

        // 2. Upsert Contestant
        const contestant = await prisma.contestant.upsert({
            where: { email: data.email },
            create: {
                email: data.email,
                username: data.userName,
                firstName: data.firstName,
                lastName: data.lastName,
                bio: ``,
                profilePhoto: null, 
                smsConsent: data.smsConsent,
                phone: data.phone
            },
            update: {
                ...(data.userName && { username: data.userName }),
                ...(data.firstName && { firstName: data.firstName }),
                ...(data.lastName && { lastName: data.lastName }),
                ...(data.smsConsent && { smsConsent: data.smsConsent }),
                ...(data.phone && { phone: data.phone })
            },
        });
        console.timeEnd('4. Username and Contestant Upsert');

        // 3. Get competition and validate
        console.time('5. Competition Validation');
        if (!competition || !competition.stripePriceId || !competition.open) {
            return NextResponse.json(
                { error: 'Selected competition not found' },
                { status: 404 }
            );
        }
        const now = new Date();
        if (competition.startDate && new Date(competition.startDate) > now) {
            return NextResponse.json(
                { error: 'This competition has not started yet' },
                { status: 400 }
            );
        }

        if (competition.endDate && new Date(competition.endDate) < now) {
            return NextResponse.json(
                { error: 'This competition has already ended' },
                { status: 400 }
            );
        }
        
        console.timeEnd('5. Competition Validation');

        console.time('6. DB Transaction (Songs & Entries)');
        const createdEntriesData = await prisma.$transaction(async (tx) => {
            const songsWithIds = data.songs.map(s => ({
                id: crypto.randomUUID(),
                title: s.title,
                link: s.link,
                coWriters: s.coWriters,
                artistName: s.artistName,
            }));

            await tx.song.createMany({
                data: songsWithIds,
                skipDuplicates: false
            });

            const entryRows = data.songs.flatMap((s, i) =>
                s.categories.map(catId => ({
                    songId: songsWithIds[i].id,
                    categoryId: catId,
                    productId: process.env.SONG_ENTRY_PRODUCT_ID || '',
                    contestantId: contestant.id,
                    competitionId: competition.id,
                }))
            );

            await tx.entry.createMany({ data: entryRows });

            const entriesData = await tx.entry.findMany({
                where: { 
                    contestantId: contestant.id,
                    competitionId: competition.id,
                    songId: { in: songsWithIds.map(s => s.id) }
                },
                select: { 
                    id: true,
                    song: { select: { title: true } },
                    categoryId: true,
                }
            });
            
            if (entriesData.length === 0) {
                 throw new Error("No valid song entries could be prepared for transaction.");
            }
            return entriesData;
        });
        console.timeEnd('6. DB Transaction (Songs & Entries)');

        console.time('7. Purchase Record Creation');
        const songEntries = createdEntriesData;
        const entryIds = songEntries.map(entry => entry.id);
        const totalEntries = songEntries.length;
        
        const purchase = await prisma.purchase.create({
            data: {
                contestantId: contestant.id,
                productId: process.env.SONG_ENTRY_PRODUCT_ID || '',
                priceAtPurchase: competition.price * totalEntries,
                quantity: totalEntries,
            }
        });
        console.timeEnd('7. Purchase Record Creation');
        
        console.time('8. Stripe Customer Handling');
        // 5. Get or create Stripe Customer
        let stripeCustomerId = contestant.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: data.email,
                name: `${data.firstName} ${data.lastName}`,
                phone: data.phone,
                metadata: {
                    contestantId: contestant.id,
                    username: data.userName
                }
            });
            
            stripeCustomerId = customer.id;
            
            await prisma.contestant.update({
                where: { id: contestant.id },
                data: { stripeCustomerId: customer.id }
            });
        }
        console.timeEnd('8. Stripe Customer Handling');
        
        console.time('9. Construct Line Items');
        // 6. Construct Line Items
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
        
        // Only add contest entry line items if the contest has a price > 0
        if (competition.price > 0) {
            for (const entry of songEntries) { 
                const category = categories.find(cat => cat.id === entry.categoryId);
                const categoryName = category ? category.title : 'Category';
            
                lineItems.push({
                    quantity: 1,
                    adjustable_quantity: {
                        enabled: false
                    },
                    price_data: {
                        currency: 'usd',
                        unit_amount: competition.price, 
                        product_data: {
                            name: `${entry.song.title}`, 
                            description: `${categoryName} song entry in ${competition.name}`
                        }
                    }
                });
            }
        }

        const membershipProductStripePriceId = process.env.MEMBERSHIP_PRODUCT_STRIPE_PRICE_ID;
        const fanContestProductStripePriceId = process.env.FAN_CONTEST_PRODUCT_STRIPE_PRICE_ID;

        // Check if contestant already has Fan Contest for this competition (or global legacy)
        let hasExistingFanContest = false;
        if (competition.fanVotingEnabled) {
            const existingFanContest = await prisma.purchase.findFirst({
                where: {
                    contestantId: contestant.id,
                    product: { type: 'FAN_CONTEST' },
                    competitionId: competition.id
                },
                include: { product: true }
            });
            hasExistingFanContest = Boolean(existingFanContest);
        }

        if (data.addOns.membership && membershipProductStripePriceId) {
            lineItems.push({
                price: membershipProductStripePriceId,
                quantity: 1,
                adjustable_quantity: {
                    enabled: false
                }
            });
        }

        const includeFanContest = Boolean(
            data.addOns.fanContest &&
            fanContestProductStripePriceId &&
            competition.fanVotingEnabled &&
            !hasExistingFanContest
        );
        if (includeFanContest) {
            lineItems.push({
                price: fanContestProductStripePriceId,
                quantity: 1,
                adjustable_quantity: {
                    enabled: false
                }
            });
        }
        
        // Check if we have any paid line items
        const hasPaidItems = lineItems.length > 0;
        const isEntirelyFree = competition.price === 0 && !data.addOns.membership && !includeFanContest;
        
        // If the contest is entirely free (no fan voting, no membership), skip Stripe and handle as free entry
        if (isEntirelyFree) {
            // For free contests with no paid add-ons, we'll create the entries but bypass Stripe checkout
            console.timeEnd('9. Construct Line Items');
            
            // No purchase paid flag on schema; entries are marked paid below
            
            // Mark all entries as paid
            await prisma.entry.updateMany({
                where: { id: { in: entryIds } },
                data: { paid: true }
            });
            
            console.timeEnd('Full Request');
            // Redirect to success page for free entries, include order and entry ids
            const entryIdsParam = encodeURIComponent(JSON.stringify(entryIds));
            return NextResponse.json({ url: `${siteUrl}/checkout/success?free=true&session_id=FREE_ENTRY&order_id=${purchase.id}&entry_ids=${entryIdsParam}` });
        }
        
        console.timeEnd('9. Construct Line Items');

        console.time('10. Stripe Checkout Session Creation');
        // Prepare rich metadata for Stripe (limit to first 5 songs to stay within Stripe metadata limits)
        const submissionDate = new Date().toISOString();
        const maxSongsForMetadata = Math.min(5, data.songs.length);
        const songDetails = data.songs.slice(0, maxSongsForMetadata).map((song) => {
            const categoryTitles = song.categories
                .map((id) => categories.find((c) => c.id === id)?.title)
                .filter(Boolean)
                .join(', ');
            return {
                title: song.title,
                url: song.link,
                artistName: song.artistName,
                coWriters: song.coWriters,
                categories: categoryTitles,
            };
        });

        const baseMetadata: Record<string, string> = {
            contestantId: contestant.id.toString(),
            contestantEmail: data.email,
            competitionId: competition.id,
            competitionName: competition.name,
            hasMembership: data.addOns.membership ? 'true' : 'false',
            hasFanContest: includeFanContest ? 'true' : 'false',
            smsConsent: data.smsConsent ? 'true' : 'false',
            phone: data.phone,
            type: 'entry',
            orderId: purchase.id,
            // Extended reporting metadata
            product_id: process.env.SONG_ENTRY_PRODUCT_ID || '',
            submission_date: submissionDate,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            payment_status: 'pending',
            entry_count: totalEntries.toString(),
        };

        // Duplicate convenient first-item fields if available
        if (songDetails[0]) {
            baseMetadata.artist_name = songDetails[0].artistName || '';
            baseMetadata.co_writers = songDetails[0].coWriters || '';
            baseMetadata.song_title = songDetails[0].title;
            baseMetadata.song_categories = songDetails[0].categories;
            baseMetadata.song_url = songDetails[0].url;
        }

        // Per-song enumerated fields up to 5
        songDetails.forEach((s, idx) => {
            const i = idx + 1;
            baseMetadata[`song${i}_title`] = s.title;
            baseMetadata[`song${i}_categories`] = s.categories;
            baseMetadata[`song${i}_url`] = s.url;
            baseMetadata[`song${i}_co_writers`] = s.coWriters || '';
            baseMetadata[`song${i}_artist_name`] = s.artistName || '';
        });

        // Add entryIds in chunks to stay under Stripe's 500-char per value limit
        const entryIdChunks: string[][] = [];
        {
            let currentChunk: string[] = [];
            let currentLength = 2; // for []
            for (const id of entryIds) {
                const idLength = JSON.stringify(id).length + (currentChunk.length > 0 ? 1 : 0); // +comma if needed
                if (currentLength + idLength > 480) { // keep buffer
                    entryIdChunks.push(currentChunk);
                    currentChunk = [id];
                    currentLength = 2 + JSON.stringify(id).length;
                } else {
                    currentChunk.push(id);
                    currentLength += idLength;
                }
            }
            if (currentChunk.length > 0) entryIdChunks.push(currentChunk);
        }

        if (entryIdChunks.length === 1) {
            baseMetadata.entryIds = JSON.stringify(entryIdChunks[0]);
        } else {
            entryIdChunks.forEach((chunk, idx) => {
                baseMetadata[`entryIds_${idx + 1}`] = JSON.stringify(chunk);
            });
        }

        // 7. Create Stripe Checkout Session
        const isSubscriptionMode = Boolean(data.addOns.membership && membershipProductStripePriceId);

        const session = await stripe.checkout.sessions.create({
            line_items: lineItems,
            mode: isSubscriptionMode ? 'subscription' : 'payment',
            customer: stripeCustomerId,
            success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${siteUrl}/checkout`,
            phone_number_collection: {
                enabled: true
            },
            allow_promotion_codes: true,
            automatic_tax: {
                enabled: true
            },
            ...(isSubscriptionMode
                ? { subscription_data: { metadata: baseMetadata } }
                : { payment_intent_data: { metadata: baseMetadata } }),
            customer_update: {
                name: 'auto',
                address: 'auto',
            },
             metadata: baseMetadata
        });
        console.timeEnd('10. Stripe Checkout Session Creation');

        if (!session.url) {
            console.error("Stripe Checkout Session URL is missing.");
            return NextResponse.json(
                { error: 'Failed to create checkout session.' },
                { status: 500 }
            );
        }

        console.timeEnd('Full Request');
        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error('Checkout session error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.timeEnd('Full Request'); // End timer on error as well
        return NextResponse.json(
            { error: `Failed to create checkout session: ${errorMessage}` },
            { status: 500 }
        );
    }
}
