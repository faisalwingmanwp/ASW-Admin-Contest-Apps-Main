"use server";

import prisma from "../db";
import Papa from "papaparse";
import type { Prisma } from "@prisma/client";
import { ProductType, ReviewStatus, UserRole } from "@prisma/client";
import { createServiceClient } from "../supabase/supabase-service";
import validator from "validator";
import { randomUUID } from "crypto";
import { requireAdmin } from "./auth-guards";

const UNDEFINED_CATEGORY_ID = "adsfdasfdsfddddd";

type ImportRequest = {
  csv: string;
  competitionId: string;
  productId: string;
  dryRun?: boolean;
  allowUpdate?: boolean;
  createAuthUsers?: boolean;
  concurrency?: number;
};

type ImportPreview = {
  rows: Array<{
    email: string;
    username: string;
    songs: Array<{
      title: string;
      url: string;
      coWriters?: string | null;
      categoriesRaw?: string | null;
      matchedCategoryIds: string[];
      errors: string[];
    }>;
    errors: string[];
  }>;
  warnings: string[];
};

type ImportSummary = {
  contestantsCreated: number;
  contestantsLinkedToAuth: number;
  entriesCreated: number;
  songsCreated: number;
  reviewsCreated: number;
  contestantsUpdated: number;
  entriesUpdated: number;
  skippedDuplicates: number;
};

export async function getImportBootstrap() {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const [competitions, products] = await Promise.all([
      prisma.competition.findMany({ orderBy: { startDate: "desc" } }),
      prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
    ]);
    const entryProduct = products.find((p) => p.type === ProductType.ENTRY) || null;
    return { data: { competitions, products, entryProduct } };
  } catch (e: any) {
    return { error: e.message || "Failed to load bootstrap data" };
  }
}

function normalizeUsername(artistName: string | null | undefined): string {
  const base = (artistName || "").trim().replace(/\s+/g, "_");
  return base || "unknown_artist";
}

function parseDate(maybeDate: string | undefined | null): Date | null {
  if (!maybeDate) return null;
  const d = new Date(maybeDate);
  return isNaN(d.getTime()) ? null : d;
}

function isPaid(status: string | null | undefined): boolean {
  if (!status) return false;
  return status.toLowerCase().includes("complete");
}

function ordinal(n: number) {
  return ["First", "Second", "Third", "Fourth", "Fifth"][n - 1] || String(n);
}

function pick(row: Record<string, unknown>, key: string): string | null {
  const k = Object.keys(row).find((h) => h.trim().toLowerCase() === key.trim().toLowerCase());
  if (!k) return null;
  const v = (row as Record<string, unknown>)[k];
  return v == null ? null : String(v);
}

function getSongField(row: Record<string, unknown>, n: number, kind: "title" | "url" | "categories" | "coWriters"): string | null {
  const patterns: Record<typeof kind, string[]> = {
    title: [
      `Song ${n} Title`,
      ...(n === 1 ? ["Song Title"] : []),
      `(${ordinal(n)} Entry) Song Title`,
    ],
    url: [
      `Song ${n} URL`,
      ...(n === 1 ? ["Song URL"] : []),
      `(${ordinal(n)} Entry) Song URL`,
    ],
    categories: [
      `(${ordinal(n)} Entry) Categories`,
      `Song ${n} Categories`,
    ],
    coWriters: [
      n === 1 ? `Co-Writers` : `(${ordinal(n)} Entry) Co-Writers`,
    ],
  };
  for (const label of patterns[kind]) {
    const v = pick(row, label);
    if (v) return v;
  }
  return null;
}

function normalizeCategoryTokens(categoriesRaw: string | null): string[] {
  if (!categoriesRaw) return [];
  return categoriesRaw
    .split(/[,|]/)
    .map((s) => s.replace(/Song \d+\s*-\s*/i, "").trim().toLowerCase())
    .filter(Boolean);
}

function matchCategories(tokens: string[], all: { id: string; title: string }[]): string[] {
  const matched: string[] = [];
  for (const token of tokens) {
    const exact = all.find((c) => c.title.trim().toLowerCase() === token);
    if (exact) {
      matched.push(exact.id);
      continue;
    }
    const slashPart = token.includes("/") ? token.split("/")[0] : token;
    const soft = all.find((c) => c.title.trim().toLowerCase().startsWith(slashPart));
    if (soft) matched.push(soft.id);
  }
  return Array.from(new Set(matched));
}

function normalizeSongTitleKey(title: string): string {
  return (title || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export async function importEntriesFromCsv(req: ImportRequest) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const requestedConcurrency = 24;
    console.log("Import: start", {
      competitionId: req.competitionId,
      productId: req.productId,
      dryRun: Boolean(req.dryRun),
      allowUpdate: Boolean(req.allowUpdate),
      createAuthUsers: req.createAuthUsers !== false,
      concurrency: requestedConcurrency,
      csvBytes: req.csv?.length ?? 0,
    });
    if (!req.csv?.trim()) return { error: "Missing CSV content" };
    if (!req.competitionId) return { error: "Missing competitionId" };

    const { data, errors } = Papa.parse(req.csv.trim(), { header: true, skipEmptyLines: true });
    if (errors?.length) {
      console.warn("Import: CSV parse error", { message: errors[0].message });
      return { error: `CSV parse error: ${errors[0].message}` };
    }

    const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
    if (rows.length === 0) {
      console.warn("Import: no rows found");
      return { error: "No rows found" };
    }
    console.log("Import: parsed CSV", { rowCount: rows.length });

    const categories = await prisma.category.findMany({ select: { id: true, title: true } });
    const products = await prisma.product.findMany();
    const entryProduct = products.find((p) => p.id === req.productId && p.type === ProductType.ENTRY);
    if (!entryProduct) {
      console.warn("Import: ENTRY product not found", { productId: req.productId });
      return { error: "ENTRY product not found" };
    }
    console.log("Import: preflight ok", {
      categories: categories.length,
      products: products.length,
      entryProductId: entryProduct.id,
    });

    const preview: ImportPreview = { rows: [], warnings: [] };
    // no-op holders to avoid lints

    for (const row of rows) {
      const email = String(pick(row, "Email") || "").trim();
      const firstName = String(pick(row, "First Name") || "").trim();
      const lastName = String(pick(row, "Last Name") || "").trim();
      const artistName = String(pick(row, "Artist Name") || "").trim();
      const username = normalizeUsername(artistName);
      const phone = String(pick(row, "Phone") || "").trim();
      const paid = isPaid(String(pick(row, "Payment Status") || ""));
      const submissionDate = String(pick(row, "Submission Date") || "").trim();
      const reviewerName = String(pick(row, "Screener") || "").trim();

      const rowPreview = { email, username, songs: [] as any[], errors: [] as string[] };
      if (!validator.isEmail(email)) rowPreview.errors.push("Invalid email");

      for (let i = 1; i <= 5; i++) {
        const title = String(getSongField(row, i, "title") || "").trim();
        const url = String(getSongField(row, i, "url") || "").trim();
        const categoriesRaw = String(getSongField(row, i, "categories") || "").trim();
        const coWriters = String(getSongField(row, i, "coWriters") || "").trim();

        if (!title && !url && !categoriesRaw && !coWriters) continue;

        const tokens = normalizeCategoryTokens(categoriesRaw || "");
        let matchedCategoryIds = matchCategories(tokens, categories);
        if (matchedCategoryIds.length === 0) {
          matchedCategoryIds = [UNDEFINED_CATEGORY_ID];
        }

        const songErrors: string[] = [];
        if (!title) songErrors.push(`Song ${i}: Missing title`);
        if (!url || !validator.isURL(url, { protocols: ["http", "https"], require_protocol: true })) songErrors.push(`Song ${i}: Invalid URL`);

        rowPreview.songs.push({ title, url, coWriters: coWriters || null, categoriesRaw, matchedCategoryIds, errors: songErrors });
      }

      if (rowPreview.songs.length === 0) rowPreview.errors.push("No songs in row");

      preview.rows.push(rowPreview);
    }

    // Category unmatched now defaults to Undefined category; no strict error here

    // If importing (not dry run) and there are validation errors, block and return details
    const rowsWithErrors = preview.rows.filter((r) => (r.errors?.length || 0) > 0 || (r.songs || []).some((s) => (s.errors?.length || 0) > 0)).length;
    const totalErrors = preview.rows.reduce((sum, r) => sum + (r.errors?.length || 0) + (r.songs || []).reduce((s, x) => s + (x.errors?.length || 0), 0), 0);
    console.log("Import: preview built", { rowCount: preview.rows.length, rowsWithErrors, totalErrors });
    if (!req.dryRun && totalErrors > 0) {
      console.warn("Import: blocked due to validation errors", { totalErrors, rowsWithErrors });
      return { error: `Import blocked: ${totalErrors} validation error(s) found. Fix them and preview again.`, preview };
    }

    if (req.dryRun) {
      console.log("Import: dry run preview ready", { rowCount: preview.rows.length, rowsWithErrors, totalErrors });
      return { preview };
    }

    const service = await createServiceClient();
    const summary: ImportSummary = {
      contestantsCreated: 0,
      contestantsLinkedToAuth: 0,
      entriesCreated: 0,
      songsCreated: 0,
      reviewsCreated: 0,
      contestantsUpdated: 0,
      entriesUpdated: 0,
      skippedDuplicates: 0,
    };
    console.log("Import: commit start", { rows: preview.rows.length, allowUpdate: Boolean(req.allowUpdate) });

    // Prepare screener cache (dummy creation if not exists)
    const screenerCache = new Map<string, { screenerId: string }>();
    async function ensureScreener(tx: Prisma.TransactionClient, label: string): Promise<string> {
      const name = label.split("-")[0].trim();
      if (!name) return (await ensureScreener(tx, "System Importer")).toString();
      const key = name.toLowerCase();
      if (screenerCache.has(key)) return screenerCache.get(key)!.screenerId;
      // Reuse existing placeholder user by email if present; otherwise create
      const emailPlaceholder = `${key.replace(/\s+/g, ".")}@placeholder.local`;
      let user = await tx.users.findUnique({ where: { email: emailPlaceholder } });
      if (!user) {
        user = await tx.users.create({
          data: {
            id: randomUUID(),
            email: emailPlaceholder,
            first_name: name,
            last_name: null,
            role: UserRole.SCREENER,
          },
        });
        console.log("Import: created placeholder screener user", { name, userId: user.id });
      }
      // Ensure screener row exists for this user
      const screener = await tx.screener.upsert({
        where: { id: user.id },
        update: {},
        create: { id: user.id, userId: user.id },
      });
      screenerCache.set(key, { screenerId: screener.id });
      return screener.id;
    }

    // Chunked concurrency for per-row processing
    type RowResult = {
      contestantsCreated: number;
      contestantsLinkedToAuth: number;
      entriesCreated: number;
      songsCreated: number;
      reviewsCreated: number;
      contestantsUpdated: number;
      entriesUpdated: number;
      skippedDuplicates: number;
      processed: number;
    };

    const totalRows = preview.rows.length;
    const startedAt = Date.now();
    let processedSoFar = 0;
    const CONCURRENCY = Math.max(1, Math.min((req.concurrency ?? 6), 24));

    async function processRow(idx: number): Promise<RowResult> {
      const rowPreview = preview.rows[idx];
      const raw = rows[idx];
      // Precompute outside the transaction to avoid long-running interactive tx
      const email = rowPreview.email;
      const firstName = String(pick(raw, "First Name") || "").trim();
      const lastName = String(pick(raw, "Last Name") || "").trim();
      const artistName = String(pick(raw, "Artist Name") || "").trim();
      const username = normalizeUsername(artistName);
      const phone = String(pick(raw, "Phone") || "").trim();
      const submissionDate = parseDate(String(pick(raw, "Submission Date") || "").trim());
      const paymentStatus = String(pick(raw, "Payment Status") || "").trim();
      const paidFlag = isPaid(paymentStatus);

      // Preflight: see if contestant exists and optionally create auth user outside tx
      let preflightContestant = await prisma.contestant.findUnique({ where: { email } });
      let preflightAuthId: string | null = null;
      if (!preflightContestant && req.createAuthUsers !== false) {
        try {
          const { data: created, error } = await service.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { first_name: firstName, last_name: lastName, artist_name: artistName },
          });
          if (!error && created?.user?.id) preflightAuthId = created.user.id;
        } catch {}
      }

      console.log("Import: row start", { idx, email, songs: rowPreview.songs?.length || 0 });
      // Build transactional work as a promise
      const txPromise = prisma.$transaction(async (tx) => {
          let local: RowResult = {
            contestantsCreated: 0,
            contestantsLinkedToAuth: 0,
            entriesCreated: 0,
            songsCreated: 0,
            reviewsCreated: 0,
            contestantsUpdated: 0,
            entriesUpdated: 0,
            skippedDuplicates: 0,
            processed: 1,
          };

        // Upsert contestant (by email) with username pre-dedup to avoid unique violations
        let contestant = await tx.contestant.findUnique({ where: { email } });
        if (!contestant) {
          // Generate a collision-resistant username to avoid unique violations under concurrency
          const emailLocal = String(email.split("@")[0] || "").replace(/\W+/g, "_").slice(0, 20) || "user";
          const base = username || emailLocal;
          const finalUsername = `${base}_${randomUUID().slice(0, 8)}`;
          const authId: string | null = preflightAuthId;

          try {
            contestant = await tx.contestant.create({
              data: {
                email,
                firstName: firstName || null,
                lastName: lastName || null,
                username: finalUsername,
                phone: phone || null,
                authId: authId || null,
              },
            });
            local.contestantsCreated += 1;
            if (authId) local.contestantsLinkedToAuth += 1;
          } catch (e: any) {
            if (e?.code === "P2002") {
              // Concurrent create by another worker; reuse the existing contestant
              const existing = await tx.contestant.findUnique({ where: { email } });
              if (!existing) throw e;
              contestant = existing;
            } else {
              throw e;
            }
          }
        } else if (req.allowUpdate) {
          contestant = await tx.contestant.update({
            where: { id: contestant.id },
            data: {
              firstName: firstName || contestant.firstName,
              lastName: lastName || contestant.lastName,
              // Do not update username here to avoid unique conflicts
              phone: phone || contestant.phone,
            },
          });
          local.contestantsUpdated += 1;
        }

        // Preload existing entries for this contestant+competition into a Set of normalized titles (reduces duplicate queries)
        const existingTitles = new Set<string>();
        const existingEntries = await tx.entry.findMany({
          where: { competitionId: req.competitionId, contestantId: contestant.id },
          include: { song: true },
        });
        for (const e of existingEntries) existingTitles.add(normalizeSongTitleKey(e.song.title));

        // For each song
        for (const s of rowPreview.songs) {
          console.log("Import: step entry-check", { idx, email, title: s.title });
          const normalized = normalizeSongTitleKey(s.title);
          if (existingTitles.has(normalized)) {
            // Seen before => skip
            local.skippedDuplicates += 1;
            continue;
          }

          const primaryCategoryId = s.matchedCategoryIds[0] || UNDEFINED_CATEGORY_ID;

          if (existingTitles.has(normalized)) {
            // Redundant check; continue for clarity
            local.skippedDuplicates += 1;
            continue;
          } else {
            console.log("Import: step song-create", { idx, email, title: s.title });
            const song = await tx.song.create({
              data: {
                title: s.title,
                link: s.url,
                coWriters: s.coWriters || null,
              },
            });
            local.songsCreated += 1;

            console.log("Import: step entry-create", { idx, email, title: s.title });
            const entry = await tx.entry.create({
              data: {
                songId: song.id,
                categoryId: primaryCategoryId,
                contestantId: contestant.id,
                productId: req.productId,
                competitionId: req.competitionId,
                paid: paidFlag,
                ...(submissionDate ? { createdAt: submissionDate } : {}),
              },
            });
            local.entriesCreated += 1;
            existingTitles.add(normalizeSongTitleKey(s.title));

            if (s.matchedCategoryIds.length > 0) {
              console.log("Import: step song-categories", { idx, email, count: s.matchedCategoryIds.length });
              await tx.songCategory.createMany({ data: s.matchedCategoryIds.map((cid) => ({ songId: song.id, categoryId: cid })) });
            }

            const scoreRaw = String(pick(raw, `Song ${rowPreview.songs.indexOf(s) + 1} Score:`) || "").trim();
            const numericScore = scoreRaw ? Number(String(scoreRaw).match(/\d+/)?.[0] || "") : null;
            const dateReviewed = parseDate(String(pick(raw, "Date Reviewed:") || "").trim());
            const screenerLabel = String(pick(raw, "Screener") || "").trim();
            if (numericScore !== null || dateReviewed || screenerLabel) {
              console.log("Import: step ensure-screener", { idx, email, screenerLabel });
              const screenerId = await ensureScreener(tx, screenerLabel || "System Importer");
              console.log("Import: step review-create", { idx, email, entryId: entry.id });
              await tx.entryReview.create({
                data: {
                  id: randomUUID(),
                  screenerId,
                  entryId: entry.id,
                  status: ReviewStatus.COMPLETED,
                  overallScore: numericScore || undefined,
                  reviewedAt: dateReviewed || new Date(),
                  assignedAt: new Date(),
                  isLatestRound: true,
                  reviewRound: 1,
                },
              });
              local.reviewsCreated += 1;
            }
          }
        }

          return local;
        }, { timeout: 60000 });
      // Per-row timeout guard so a stuck row doesn't stall the whole bucket
      const TIMEOUT_MS = 45000;
      let timeoutId: any;
      const timeoutPromise = new Promise<RowResult>((resolve) => {
        timeoutId = setTimeout(() => {
          console.error("Import: row timeout", { idx, email, timeoutMs: TIMEOUT_MS });
          resolve({ contestantsCreated: 0, contestantsLinkedToAuth: 0, entriesCreated: 0, songsCreated: 0, reviewsCreated: 0, contestantsUpdated: 0, entriesUpdated: 0, skippedDuplicates: 0, processed: 1 });
        }, TIMEOUT_MS);
      });
      const raced = await Promise.race<[RowResult, "tx" | "timeout"]>([
        txPromise.then((r) => [r, "tx"] as [RowResult, "tx"]),
        timeoutPromise.then((r) => [r, "timeout"] as [RowResult, "timeout"]),
      ]);
      if (timeoutId) clearTimeout(timeoutId);
      // Ensure we observe the tx result if it finishes later to avoid unhandled rejections
      txPromise.then(
        (ok) => console.log("Import: row done (late)", { idx, email }),
        (err) => console.error("Import: row error (late)", { idx, email, error: err?.message || String(err) })
      );
      if (raced[1] === "timeout") {
        // Already logged timeout; return raced value
        return raced[0];
      }
      console.log("Import: row done", { idx, email });
      return raced[0];
    }

    for (let base = 0; base < totalRows; base += CONCURRENCY) {
      const end = Math.min(base + CONCURRENCY, totalRows);
      console.log("Import: bucket start", { startIdx: base, endIdx: end - 1 });
      const settled = await Promise.allSettled(
        Array.from({ length: end - base }, (_, i) => processRow(base + i))
      );
      // aggregate
      let bucketProcessed = 0;
      for (const item of settled) {
        if (item.status === "fulfilled") {
          const r = item.value;
          summary.contestantsCreated += r.contestantsCreated;
          summary.contestantsLinkedToAuth += r.contestantsLinkedToAuth;
          summary.entriesCreated += r.entriesCreated;
          summary.songsCreated += r.songsCreated;
          summary.reviewsCreated += r.reviewsCreated;
          summary.contestantsUpdated += r.contestantsUpdated;
          summary.entriesUpdated += r.entriesUpdated;
          summary.skippedDuplicates += r.skippedDuplicates;
          bucketProcessed += r.processed;
        } else {
          console.error("Import: row failed", { reason: (item.reason && item.reason.message) || String(item.reason) });
          bucketProcessed += 1;
        }
      }
      processedSoFar += bucketProcessed;
      const elapsedMs = Date.now() - startedAt;
      const avgMs = elapsedMs / Math.max(1, processedSoFar);
      const remaining = totalRows - processedSoFar;
      const etaMin = Math.max(0, (avgMs * remaining) / 60000);
      console.log("Import: progress", {
        processed: processedSoFar,
        total: totalRows,
        percent: Math.round((processedSoFar / totalRows) * 100),
        etaMinutes: Number(etaMin.toFixed(1)),
      });
      console.log("Import: bucket end", { startIdx: base, endIdx: end - 1, processed: bucketProcessed });
    }

    console.log("Import: commit done", { summary });
    return { summary };
  } catch (e: any) {
    console.error("importEntriesFromCsv error", e);
    return { error: e.message || "Import failed" };
  }
}


