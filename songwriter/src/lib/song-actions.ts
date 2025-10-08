'use server';

import { prisma } from "@/lib/db";
import { getCurrentContestant } from "@/lib/auth-actions";
import { ErrorStatus } from "@prisma/client";

export async function updateSongDetails(songId: string, title: string, link: string) {
  const contestant = await getCurrentContestant();
  
  if (!contestant) {
    throw new Error("You must be logged in to update a song");
  }
  
  const song = await prisma.song.findFirst({
    where: {
      id: songId,
      entries: {
        some: {
          contestantId: contestant.id
        }
      }
    }
  });
  
  if (!song) {
    throw new Error("Song not found or you don't have permission to update it");
  }

  // Safeguard: Only allow edits if there is an associated active submission ticket
  const activeSubmissionTicket = await prisma.submissionError.findFirst({
    where: {
      contestantId: contestant.id,
      status: { in: [ErrorStatus.DETECTED, ErrorStatus.IN_PROGRESS] },
      Entry: {
        songId: songId,
      },
    },
    select: { id: true },
  });

  if (!activeSubmissionTicket) {
    throw new Error("Edits are restricted. Please open a support ticket to update your entry.");
  }
  
  const updatedSong = await prisma.song.update({
    where: {
      id: songId
    },
    data: {
      title,
      link
    }
  });
  
  return updatedSong;
}
