'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Import directly from the prisma client instance instead of generated path
import { CalendarIcon, BarChart2, Award, Mic2, Users, Package, Filter, PlusCircle, Clock } from 'lucide-react';
import { 
  getVotingAnalytics 
} from '@/lib/actions/analytics-actions';
import { getCompetitionsWithStats } from "@/lib/actions/competition/competition-actions";
import { columns, CompetitionWithStats } from "../../../components/data-table/columns/competitions-columns";
import { DataTable } from "@/components/data-table/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCategories } from "@/lib/actions/category-actions";

export default function CompetitionPage() {
    const router = useRouter();
    const [competitions, setCompetitions] = useState<CompetitionWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const { competitions, error: compError } = await getCompetitionsWithStats();
                if (compError) throw new Error(compError);
                setCompetitions(competitions || []);
            } catch (err) {
                console.error('Error loading data:', err);
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    return (
        <div className="container">

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Active Competitions</p>
                            <h3 className="text-2xl font-bold mt-1">
                                {loading ? '...' : competitions.filter(c => c.status === 'Active').length}
                            </h3>
                        </div>
                        <div className="p-2 bg-purple-50 rounded-md">
                            <Award className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Total Entries</p>
                            <h3 className="text-2xl font-bold mt-1">
                                {loading ? '...' : competitions.reduce((sum, comp) => sum + comp.entriesCount, 0)}
                            </h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-md">
                            <Mic2 className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg  border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Total Votes</p>
                            <h3 className="text-2xl font-bold mt-1">
                                {/* {loading || !analytics ? '...' : analytics.stats?.totalVotes.toLocaleString() || 0} */}
                            </h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-md">
                            <Users className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg  border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Revenue Generated</p>
                            <h3 className="text-2xl font-bold mt-1">
                                {loading ? '...' : `$${competitions.reduce((sum, comp) => sum + comp.revenue, 0).toLocaleString()}`}
                            </h3>
                        </div>
                        <div className="p-2 bg-yellow-50 rounded-md">
                            <BarChart2 className="h-6 w-6 text-yellow-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white">
                <div>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center p-8 text-red-500">{error}</div>
                    ) : competitions.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">No competitions found. Create one to get started.</div>
                    ) : (
                        <DataTable 
                            columns={columns} 
                            data={competitions}
                            onRowClick={(competition) => {
                                router.push(`/dashboard/competitions/${competition.id}`);
                            }}
                        />
                    )}
                </div>


            </div>
        </div>
    );
}