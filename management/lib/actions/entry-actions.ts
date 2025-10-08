"use server";

import { revalidatePath } from "next/cache";
import prisma from "../db";
import { requireAdmin } from "./auth-guards";

export async function setEntryHiddenStatus(entryId: string, hidden: boolean) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const entry = await prisma.entry.update({
      where: { id: entryId },
      data: { hidden },
    });
    
    revalidatePath("/dashboard/entries");
    revalidatePath("/dashboard/competitions/[competitionId]", "page");
    
    return { success: true, entry };
  } catch (error: any) {
    console.error(`Error updating entry status to ${hidden ? 'hidden' : 'visible'}:`, error);
    return { 
      success: false, 
      error: error.message || "Failed to update entry status" 
    };
  }
}

export type UpdateEntryDetailsInput = {
  entryId: string;
  categoryId: string;
  paid: boolean;
  song: {
    title: string;
    link: string;
    artistName?: string | null;
    coWriters?: string | null;
  };
};

export async function updateEntryDetails(input: UpdateEntryDetailsInput) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const { entryId, categoryId, paid, song } = input;

  try {
    // Fetch the entry to get current songId and validate existence
    const existing = await prisma.entry.findUnique({
      where: { id: entryId },
      select: { id: true, songId: true },
    });

    if (!existing) {
      return { success: false, error: "Entry not found" };
    }

    await prisma.$transaction(async (tx) => {
      // Update Song
      await tx.song.update({
        where: { id: existing.songId },
        data: {
          title: song.title,
          link: song.link,
          artistName: song.artistName ?? null,
          coWriters: song.coWriters ?? null,
        },
      });

      // Update Entry
      await tx.entry.update({
        where: { id: entryId },
        data: {
          categoryId,
          paid,
        },
      });
    });

    revalidatePath("/dashboard/entries");
    revalidatePath("/dashboard/competitions/[competitionId]", "page");

    return { success: true };
  } catch (error: any) {
    console.error("Error updating entry details:", error);
    return { success: false, error: error.message || "Failed to update entry details" };
  }
}
