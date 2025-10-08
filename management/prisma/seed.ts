// import { PrismaClient, UserRole, ProductType, ReviewStatus, Category, Song, User, Competition, Product, Contestant, Fan, Screener, Entry } from '@prisma/client';
// import { v4 as uuidv4 } from 'uuid';
// import bcrypt from 'bcryptjs';

// const prisma = new PrismaClient();

// async function main() {
//   // Clean existing data
//   console.log('Cleaning existing data...');
//   await cleanDatabase();
  
//   console.log('Starting seed process...');

//   // Seed categories
//   console.log('Creating categories...');
//   const categories = await seedCategories();
  
//   // Seed songs
//   console.log('Creating songs...');
//   const songs = await seedSongs();

//   // Connect songs and categories
//   console.log('Creating song categories...');
//   await seedSongCategories(songs, categories);

//   // Seed products
//   console.log('Creating products...');
//   const products = await seedProducts();

//   // Seed competitions
//   console.log('Creating competitions...');
//   const competitions = await seedCompetitions();

//   // Seed users with different roles
//   console.log('Creating users...');
//   const users = await seedUsers();
  
//   // Seed contestants
//   console.log('Creating contestants...');
//   const contestants = await seedContestants();

//   // Seed fans
//   console.log('Creating fans...');
//   const fans = await seedFans();
  
//   // Seed screeners
//   console.log('Creating screeners...');
//   const screeners = await seedScreeners(users.filter(u => u.role === 'SCREENER'));

//   // Connect screeners with their preferred categories
//   console.log('Assigning preferred categories to screeners...');
//   await assignCategoriesForScreeners(screeners, categories);

//   // Seed entries
//   console.log('Creating entries...');
//   const entries = await seedEntries(songs, categories, competitions, contestants, products);
  
//   // Seed entry reviews
//   console.log('Creating entry reviews...');
//   await seedEntryReviews(entries, screeners);
  
//   // Seed vote packs
//   console.log('Creating vote packs...');
//   await seedVotePacks(products);
  
//   // Seed votes
//   console.log('Creating votes...');
//   await seedVotes(entries, fans);
  
//   // Seed purchases
//   console.log('Creating purchases...');
//   await seedPurchases(products, fans, contestants);

//   console.log('Seed complete!');
// }

// async function cleanDatabase() {
//   // Delete in order to respect foreign key constraints
//   await prisma.purchase.deleteMany();
//   await prisma.vote.deleteMany();
//   await prisma.entryReview.deleteMany();
//   await prisma.entry.deleteMany();
//   await prisma.votePack.deleteMany();
//   await prisma.screener.deleteMany();
//   await prisma.fan.deleteMany();
//   await prisma.contestant.deleteMany();
//   await prisma.user.deleteMany();
//   await prisma.songCategory.deleteMany();
//   await prisma.song.deleteMany();
//   await prisma.category.deleteMany();
//   await prisma.competition.deleteMany();
//   await prisma.product.deleteMany();
// }

// async function seedCategories() {
//   const categories = [
//     { title: 'Pop', icon: '🎵' },
//     { title: 'Rock', icon: '🎸' },
//     { title: 'Hip Hop', icon: '🎤' },
//     { title: 'Country', icon: '🤠' },
//     { title: 'R&B', icon: '🎷' },
//     { title: 'Electronic', icon: '🎛️' },
//     { title: 'Folk', icon: '🪕' }
//   ];

//   const createdCategories = [];

//   for (const category of categories) {
//     const created = await prisma.category.create({
//       data: category
//     });
//     createdCategories.push(created);
//   }

//   return createdCategories;
// }

// async function seedSongs() {
//   const songs = [
//     { title: 'Summer Breeze', link: 'https://example.com/songs/summer-breeze' },
//     { title: 'City Lights', link: 'https://example.com/songs/city-lights' },
//     { title: 'Mountain High', link: 'https://example.com/songs/mountain-high' },
//     { title: 'Ocean Waves', link: 'https://example.com/songs/ocean-waves' },
//     { title: 'Desert Moon', link: 'https://example.com/songs/desert-moon' },
//     { title: 'Forest Dreams', link: 'https://example.com/songs/forest-dreams' },
//     { title: 'River Flow', link: 'https://example.com/songs/river-flow' },
//     { title: 'Starlight', link: 'https://example.com/songs/starlight' }
//   ];

//   const createdSongs = [];

//   for (const song of songs) {
//     const created = await prisma.song.create({
//       data: song
//     });
//     createdSongs.push(created);
//   }

//   return createdSongs;
// }

// async function seedSongCategories(songs: Song[], categories: Category[]) {
//   // Assign random categories to songs
//   for (const song of songs) {
//     // Select 1-3 random categories for each song
//     const numCategories = Math.floor(Math.random() * 3) + 1;
//     const shuffled = [...categories].sort(() => 0.5 - Math.random());
//     const selectedCategories = shuffled.slice(0, numCategories);

//     for (const category of selectedCategories) {
//       await prisma.songCategory.create({
//         data: {
//           songId: song.id,
//           categoryId: category.id
//         }
//       });
//     }
//   }
// }

// async function seedProducts() {
//   const entryProducts = [
//     { name: 'Standard Entry', type: ProductType.ENTRY, price: 2500, stripePriceId: 'price_entry_standard' },
//     { name: 'Premium Entry', type: ProductType.ENTRY, price: 5000, stripePriceId: 'price_entry_premium' }
//   ];
  
//   const votePackProducts = [
//     { name: '10 Votes', type: ProductType.VOTEPACK, price: 999, stripePriceId: 'price_votepack_10' },
//     { name: '25 Votes', type: ProductType.VOTEPACK, price: 1999, stripePriceId: 'price_votepack_25' },
//     { name: '50 Votes', type: ProductType.VOTEPACK, price: 3499, stripePriceId: 'price_votepack_50' }
//   ];
  
//   const membershipProducts = [
//     { name: 'Monthly Membership', type: ProductType.MEMBERSHIP, price: 1499, stripePriceId: 'price_membership_month' },
//     { name: 'Annual Membership', type: ProductType.MEMBERSHIP, price: 14999, stripePriceId: 'price_membership_year' }
//   ];
  
//   const fanContestProducts = [
//     { name: 'Fan Contest Entry', type: ProductType.FAN_CONTEST, price: 1000, stripePriceId: 'price_fan_contest' }
//   ];
  
//   const products = [...entryProducts, ...votePackProducts, ...membershipProducts, ...fanContestProducts];
//   const createdProducts = [];

//   for (const product of products) {
//     const created = await prisma.product.create({
//       data: product
//     });
//     createdProducts.push(created);
//   }

//   return createdProducts;
// }

// async function seedCompetitions() {
//   const now = new Date();
//   const competitions = [
//     {
//       name: 'Summer Songwriting Challenge',
//       description: 'Write a summer-themed song that captures the essence of the season.',
//       startDate: new Date(now.getFullYear(), 5, 1), // June 1st
//       endDate: new Date(now.getFullYear(), 7, 31), // August 31st
//       open: true,
//       price: 2500,
//       stripeProductId: 'prod_summer_challenge',
//       stripePriceId: 'price_summer_challenge'
//     },
//     {
//       name: 'Winter Ballad Contest',
//       description: 'Create a heartfelt ballad with winter themes.',
//       startDate: new Date(now.getFullYear(), 10, 1), // November 1st
//       endDate: new Date(now.getFullYear() + 1, 1, 31), // February 28th next year
//       open: true,
//       price: 3000,
//       stripeProductId: 'prod_winter_ballad',
//       stripePriceId: 'price_winter_ballad'
//     },
//     {
//       name: 'Pop Anthem Competition',
//       description: 'Write a catchy pop anthem with commercial appeal.',
//       startDate: new Date(now.getFullYear() - 1, 1, 1), // Past competition
//       endDate: new Date(now.getFullYear() - 1, 3, 31),
//       open: false,
//       price: 2000,
//       stripeProductId: 'prod_pop_anthem',
//       stripePriceId: 'price_pop_anthem'
//     }
//   ];

//   const createdCompetitions = [];

//   for (const competition of competitions) {
//     const created = await prisma.competition.create({
//       data: competition
//     });
//     createdCompetitions.push(created);
//   }

//   return createdCompetitions;
// }

// async function seedUsers() {
//   const users = [
//     {
//       id: uuidv4(),
//       email: 'admin@example.com',
//       firstName: 'Admin',
//       lastName: 'User',
//       role: 'ADMIN' as UserRole,
//       approved: true,
//       isSuperAdmin: true
//     },
//     {
//       id: uuidv4(),
//       email: 'judge1@example.com',
//       firstName: 'Judge',
//       lastName: 'One',
//       role: 'JUDGE' as UserRole,
//       approved: true,
//       isSuperAdmin: false
//     },
//     {
//       id: uuidv4(),
//       email: 'screener1@example.com',
//       firstName: 'Screener',
//       lastName: 'One',
//       role: 'SCREENER' as UserRole,
//       approved: true,
//       isSuperAdmin: false
//     },
//     {
//       id: uuidv4(),
//       email: 'screener2@example.com',
//       firstName: 'Screener',
//       lastName: 'Two',
//       role: 'SCREENER' as UserRole,
//       approved: true,
//       isSuperAdmin: false
//     }
//   ];

//   const createdUsers = [];

//   for (const user of users) {
//     const created = await prisma.user.create({
//       data: user
//     });
//     createdUsers.push(created);
//   }

//   return createdUsers;
// }

// async function seedContestants() {
//   const contestants = [
//     {
//       username: 'songwriter1',
//       firstName: 'John',
//       lastName: 'Doe',
//       bio: 'Passionate songwriter from Nashville with 10+ years of experience',
//       email: 'john.doe@example.com',
//       profilePhoto: 'https://randomuser.me/api/portraits/men/1.jpg',
//       stripeCustomerId: 'cus_contestant1'
//     },
//     {
//       username: 'musician2',
//       firstName: 'Jane',
//       lastName: 'Smith',
//       bio: 'Award-winning composer specializing in folk and acoustic genres',
//       email: 'jane.smith@example.com',
//       profilePhoto: 'https://randomuser.me/api/portraits/women/2.jpg',
//       stripeCustomerId: 'cus_contestant2'
//     },
//     {
//       username: 'beatmaker3',
//       firstName: 'Mike',
//       lastName: 'Johnson',
//       bio: 'Hip-hop producer and songwriter from Atlanta',
//       email: 'mike.johnson@example.com',
//       profilePhoto: 'https://randomuser.me/api/portraits/men/3.jpg',
//       stripeCustomerId: 'cus_contestant3'
//     }
//   ];

//   const createdContestants = [];

//   for (const contestant of contestants) {
//     const created = await prisma.contestant.create({
//       data: contestant
//     });
//     createdContestants.push(created);
//   }

//   return createdContestants;
// }

// async function seedFans() {
//   const fans = [
//     {
//       name: 'Fan One',
//       email: 'fan1@example.com'
//     },
//     {
//       name: 'Fan Two',
//       email: 'fan2@example.com'
//     },
//     {
//       name: 'Fan Three',
//       email: 'fan3@example.com'
//     }
//   ];

//   const createdFans = [];

//   for (const fan of fans) {
//     const created = await prisma.fan.create({
//       data: fan
//     });
//     createdFans.push(created);
//   }

//   return createdFans;
// }

// async function seedScreeners(users: User[]) {
//   const createdScreeners = [];

//   for (const user of users) {
//     const created = await prisma.screener.create({
//       data: {
//         userId: user.id
//       }
//     });
//     createdScreeners.push(created);
//   }

//   return createdScreeners;
// }

// async function assignCategoriesForScreeners(screeners: Screener[], categories: Category[]) {
//   // Randomly assign 2-3 preferred categories to each screener
//   for (const screener of screeners) {
//     const numCategories = Math.floor(Math.random() * 2) + 2; // 2-3 categories
//     const shuffled = [...categories].sort(() => 0.5 - Math.random());
//     const selectedCategories = shuffled.slice(0, numCategories);
    
//     for (const category of selectedCategories) {
//       await prisma.screener.update({
//         where: { id: screener.id },
//         data: {
//           preferredCategories: {
//             connect: { id: category.id }
//           }
//         }
//       });
//     }
//   }
// }

// async function seedEntries(songs: Song[], categories: Category[], competitions: Competition[], contestants: Contestant[], products: Product[]) {
//   const entries = [];

//   // Create multiple entries for each contestant
//   for (const contestant of contestants) {
//     // Create 2-3 entries per contestant
//     const numEntries = Math.floor(Math.random() * 2) + 2;
    
//     for (let i = 0; i < numEntries; i++) {
//       // Pick a random song, category, competition, and entry product
//       const song = songs[Math.floor(Math.random() * songs.length)];
//       const category = categories[Math.floor(Math.random() * categories.length)];
//       const competition = competitions[Math.floor(Math.random() * competitions.length)];
//       const entryProducts = products.filter(p => p.type === ProductType.ENTRY);
//       const product = entryProducts[Math.floor(Math.random() * entryProducts.length)];

//       const entry = await prisma.entry.create({
//         data: {
//           songId: song.id,
//           categoryId: category.id,
//           contestantId: contestant.id,
//           competitionId: competition.id,
//           productId: product.id,
//           paid: Math.random() > 0.3 // 70% chance of being paid
//         }
//       });
      
//       entries.push(entry);
//     }
//   }

//   return entries;
// }

// async function seedEntryReviews(entries: Entry[], screeners: Screener[]) {
//   // Assign entries to screeners for review
//   // We'll randomly assign 60% of entries to be reviewed
//   const entriesToReview = entries.filter(() => Math.random() > 0.4);
  
//   for (const entry of entriesToReview) {
//     // Assign to a random screener
//     const screener = screeners[Math.floor(Math.random() * screeners.length)];
    
//     // Determine review status
//     const statusOptions = [
//       ReviewStatus.PENDING_REVIEW,
//       ReviewStatus.UNDER_REVIEW,
//       ReviewStatus.APPROVED, 
//       ReviewStatus.REJECTED,
//       ReviewStatus.NEEDS_MORE_INFORMATION
//     ];
    
//     const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
//     const reviewedAt = status !== ReviewStatus.PENDING_REVIEW && status !== ReviewStatus.UNDER_REVIEW
//       ? new Date()
//       : null;
    
//     await prisma.entryReview.create({
//       data: {
//         screenerId: screener.id,
//         entryId: entry.id,
//         status: status,
//         notes: status !== ReviewStatus.PENDING_REVIEW ? 'Sample review notes for this entry.' : null,
//         reviewedAt: reviewedAt
//       }
//     });
//   }
// }

// async function seedVotePacks(products: Product[]) {
//   const votePackProducts = products.filter(p => p.type === ProductType.VOTEPACK);
  
//   // Create VotePacks with different quantities
//   const votePacks = [
//     { productId: votePackProducts[0].id, quantity: 10 },
//     { productId: votePackProducts[1].id, quantity: 25 },
//     { productId: votePackProducts[2].id, quantity: 50 }
//   ];
  
//   for (const votePack of votePacks) {
//     await prisma.votePack.create({
//       data: votePack
//     });
//   }
// }

// async function seedVotes(entries: Entry[], fans: Fan[]) {
//   // Create some votes for entries
//   // We'll vote for about 60% of entries
//   const entriesToVote = entries.filter(() => Math.random() > 0.4);
  
//   for (const entry of entriesToVote) {
//     // Create 1-5 votes per entry
//     const numVotes = Math.floor(Math.random() * 5) + 1;
    
//     for (let i = 0; i < numVotes; i++) {
//       // Randomly select a fan (or null for anonymous votes)
//       const useFan = Math.random() > 0.3; // 70% chance of non-anonymous vote
//       const fan = useFan ? fans[Math.floor(Math.random() * fans.length)] : null;
      
//       await prisma.vote.create({
//         data: {
//           fanId: fan?.id || null,
//           entryId: entry.id,
//           priceAtPurchase: 99, // $0.99 per vote
//           quantity: Math.floor(Math.random() * 5) + 1 // 1-5 votes
//         }
//       });
//     }
//   }
// }

// async function seedPurchases(products: Product[], fans: Fan[], contestants: Contestant[]) {
//   // Create purchases for fans
//   for (const fan of fans) {
//     // Each fan makes 0-3 purchases
//     const numPurchases = Math.floor(Math.random() * 3);
    
//     for (let i = 0; i < numPurchases; i++) {
//       // Pick a random product that makes sense for fans (vote packs)
//       const votePackProducts = products.filter(p => p.type === ProductType.VOTEPACK);
//       const product = votePackProducts[Math.floor(Math.random() * votePackProducts.length)];
      
//       await prisma.purchase.create({
//         data: {
//           fanId: fan.id,
//           productId: product.id,
//           priceAtPurchase: product.price,
//           quantity: 1
//         }
//       });
//     }
//   }
  
//   // Create purchases for contestants
//   for (const contestant of contestants) {
//     // Each contestant makes 1-3 purchases
//     const numPurchases = Math.floor(Math.random() * 3) + 1;
    
//     for (let i = 0; i < numPurchases; i++) {
//       // Pick a random product that makes sense for contestants (entry products)
//       const entryProducts = products.filter(p => p.type === ProductType.ENTRY);
//       const product = entryProducts[Math.floor(Math.random() * entryProducts.length)];
      
//       await prisma.purchase.create({
//         data: {
//           contestantId: contestant.id,
//           productId: product.id,
//           priceAtPurchase: product.price,
//           quantity: 1
//         }
//       });
//     }
//   }
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
