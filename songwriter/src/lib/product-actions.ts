'use server';

import { prisma } from "./db";
import { ProductType } from "@prisma/client";

export async function getStandardProducts() {
    const [songEntryProductResult, membershipProductResult, fanContestProductResult, freeVotePackResult] = await Promise.all([
        prisma.product.findFirst({ where: { type: 'ENTRY' } }),
        prisma.product.findFirst({ where: { type: 'MEMBERSHIP' } }),
        prisma.product.findFirst({ where: { type: 'FAN_CONTEST' } }),
        prisma.votePack.findFirst({
            where: { productId: "3" },
            include: { product: true }
        })
    ]);

    return {
        songEntryProduct: songEntryProductResult,
        membershipProduct: membershipProductResult,
        fanContestProduct: fanContestProductResult,
        freeVotePack: freeVotePackResult
    };
}
