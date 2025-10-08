"use server"

import { getAuthenticatedUser } from "./actions";
import { prisma } from "./db";
import { ErrorStatus } from "@prisma/client";

export async function getSubmissionTickets() {
    const user = await getAuthenticatedUser();

    const contestant = await prisma.contestant.findUnique({
        where: { authId: user.id },
    });

    if (!contestant) {
        return [];
    }

    const submissionErrors = await prisma.submissionError.findMany({
        where: {
            contestantId: contestant.id,
            status: ErrorStatus.IN_PROGRESS
        },
        include: {
            Entry: {
                select: {
                    song: {
                        select: {
                            title: true
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return submissionErrors;
}

export async function respondToSubmissionTicket(errorId: string, response: string) {
    try {
        const user = await getAuthenticatedUser();

        const contestant = await prisma.contestant.findUnique({
            where: { authId: user.id },
        });

        if (!contestant) {
            throw new Error("Unauthorized access");
        }

        const submissionError = await prisma.submissionError.findUnique({
            where: { 
                id: errorId,
                contestantId: contestant.id // Ensure the error belongs to the contestant
            }
        });

        if (!submissionError) {
            throw new Error("Submission error not found or doesn't belong to contestant");
        }

        const updatedError = await prisma.submissionError.update({
            where: { id: errorId },
            data: {
                resolutionNote: response,
                status: ErrorStatus.IN_PROGRESS,
                updatedAt: new Date()
            }
        });

        return { success: true, submissionError: updatedError };
    } catch (error) {
        console.error("Failed to respond to submission error:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function resolveSubmissionError(errorId: string, songId: string, newSongLink: string) {
    try {
        const user = await getAuthenticatedUser();

        const contestant = await prisma.contestant.findUnique({
            where: { authId: user.id },
        });

        if (!contestant) {
            throw new Error("Unauthorized access");
        }

        const submissionError = await prisma.submissionError.findUnique({
            where: { 
                id: errorId,
                contestantId: contestant.id // Ensure the error belongs to the contestant
            }
        });

        if (!submissionError) {
            throw new Error("Submission error not found or doesn't belong to contestant");
        }

        // Update both the song link and mark the error as resolved
        await prisma.$transaction([
            prisma.song.update({
                where: { id: songId },
                data: {
                    link: newSongLink,
                    updatedAt: new Date()
                }
            }),
            prisma.submissionError.update({
                where: { id: errorId },
                data: {
                    status: ErrorStatus.RESOLVED,
                    resolutionNote: `Fixed broken link. New link: ${newSongLink}`,
                    resolvedAt: new Date(),
                    updatedAt: new Date()
                }
            })
        ]);

        return { success: true };
    } catch (error) {
        console.error("Failed to resolve submission error:", error);
        return { success: false, error: (error as Error).message };
    }
}
