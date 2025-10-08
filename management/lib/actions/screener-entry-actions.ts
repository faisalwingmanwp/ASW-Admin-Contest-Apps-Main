"use server";

import { revalidatePath } from "next/cache";
import prisma from "../db";
import { ReviewStatus } from "@prisma/client";
import crypto from 'crypto';
import { requireAdmin } from "./auth-guards";

// Assign an entry to a screener (Admin only)
export async function assignEntryToScreener(entryId: string, screenerId: string) {
  // Authorization check - only admins can assign entries
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    // Check if this entry is already assigned to this screener
    const existingAssignment = await prisma.entryReview.findFirst({
      where: {
        AND: [
          { screenerId: screenerId },
          { entryId: entryId }
        ]
      }
    });

    if (existingAssignment) {
      return { error: "This entry is already assigned to this screener" };
    }

    // Create a new entry review assignment
    const entryReview = await prisma.entryReview.create({
      data: {
        id: crypto.randomUUID(),
        screenerId,
        entryId,
        status: ReviewStatus.PENDING_REVIEW,
        assignedAt: new Date()
      },
      include: {
        Screener: {
          include: {
            users: true
          }
        },
        Entry: {
          include: {
            song: true,
            category: true
          }
        }
      }
    });

    revalidatePath("/dashboard/entries");
    return { entryReview };
  } catch (error: any) {
    console.error("Error assigning entry to screener:", error);
    return { error: error.message || "Failed to assign entry to screener" };
  }
}

// Bulk-assign many entries to a screener in one go (Admin only)
export async function bulkAssignEntries({ entryIds, screenerId }: { entryIds: string[]; screenerId: string }) {
  // Authorization check - only admins can bulk assign entries
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, created: 0, skipped: 0, error: auth.error };
  }

  try {
    // Normalize and de-duplicate input
    const uniqueIds = Array.from(new Set((entryIds || []).filter(Boolean)));
    if (uniqueIds.length === 0) {
      return { success: false, created: 0, skipped: 0, error: "No entries to assign" };
    }

    // Find already-assigned entries to this screener to avoid duplicates
    const existing = await prisma.entryReview.findMany({
      where: {
        screenerId,
        entryId: { in: uniqueIds },
      },
      select: { entryId: true },
    });
    const existingSet = new Set(existing.map(e => e.entryId));

    const toCreate = uniqueIds
      .filter((id) => !existingSet.has(id))
      .map((entryId) => ({
        id: crypto.randomUUID(),
        screenerId,
        entryId,
        status: ReviewStatus.PENDING_REVIEW,
        assignedAt: new Date(),
      }));

    let created = 0;
    if (toCreate.length > 0) {
      const result = await prisma.entryReview.createMany({
        data: toCreate,
        // Safe even if no unique constraint is present; we pre-filter
        skipDuplicates: true,
      });
      created = result.count;
    }

    // Revalidate only once
    revalidatePath("/dashboard/entries");

    return { success: true, created, skipped: uniqueIds.length - created };
  } catch (error: any) {
    console.error("Error bulk-assigning entries:", error);
    return { success: false, created: 0, skipped: 0, error: error.message || "Failed to bulk-assign entries" };
  }
}

// Remove an assignment (Admin only)
export async function removeEntryAssignment(entryReviewId: string) {
  // Authorization check - only admins can remove assignments
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    await prisma.entryReview.delete({
      where: {
        id: entryReviewId
      }
    });

    revalidatePath("/dashboard/entries");
    return { success: true };
  } catch (error: any) {
    console.error("Error removing entry assignment:", error);
    return { error: error.message || "Failed to remove entry assignment" };
  }
}

// Get all screeners
export async function getScreeners() {
  try {
    const screeners = await prisma.screener.findMany({
      include: {
        users: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          }
        },
        EntryReview: {
          select: {
            id: true,
          }
        }
      },
    });

    const formattedScreeners = screeners.map(screener => ({
      id: screener.id,
      name: screener.users.first_name && screener.users.last_name
        ? `${screener.users.first_name} ${screener.users.last_name}`
        : null,
      email: screener.users.email,
      assignedEntries: screener.EntryReview
    }));

    return { screeners: formattedScreeners };
  } catch (error) {
    console.error("Error fetching screeners:", error);
    return { error: "Failed to fetch screeners" };
  }
}

// Alias of assignEntryToScreener with simplified parameters
export async function assignEntry({ entryId, screenerId }: { entryId: string, screenerId: string }) {
  return assignEntryToScreener(entryId, screenerId);
}
