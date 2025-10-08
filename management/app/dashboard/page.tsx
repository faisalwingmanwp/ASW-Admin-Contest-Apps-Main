"use client"

import Link from "next/link"
import { redirect } from "next/navigation"

export default function DashboardHome() {
    redirect("/dashboard/competitions");

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Projects</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/dashboard/fan-voting">Fan Voting</Link>
            </div>

            <div>
                <Link href="/dashboard/screeners">Screeners</Link>
            </div>

            <div>
                <Link href="/dashboard/competitions">Competitions</Link>
            </div>

            <div>
                <Link href="/dashboard/entries">Entries</Link>
            </div>
        </div>
    )
}