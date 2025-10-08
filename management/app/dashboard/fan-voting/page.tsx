'use client';

import { Button } from "@/components/ui/button";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, Settings } from 'lucide-react';
import { getVotePacks } from "@/lib/actions/vote-pack-actions";
import VotePacksManagement from '@/components/vote-packs/vote-packs-management';
import ProductsManagement from '@/components/products/products-management';

export default function FanVotingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    
    const [activeTab, setActiveTab] = useState(
        tabParam === 'settings' ? 'settings' : 'votepacks'
    );

    type VotePackWithProduct = {
        id: string;
        quantity: number;
        product: {
            id: string;
            name: string;
            price: number;
            stripePriceId: string;
        };
    };

    const [votePacks, setVotePacks] = useState<VotePackWithProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.push(`/dashboard/fan-voting?${params.toString()}`, { scroll: false });
    };

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                if (activeTab === 'votepacks') {
                    const { votePacks, error: votePacksError } = await getVotePacks();
                    if (votePacksError) throw new Error(votePacksError);
                    setVotePacks(votePacks || []);
                }
            } catch (err) {
                console.error('Error loading data:', err);
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [activeTab]);

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex border-b mb-6 overflow-x-auto">
                <button
                    className={`px-4 py-2 font-medium flex items-center whitespace-nowrap ${activeTab === 'votepacks' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}`}
                    onClick={() => handleTabChange('votepacks')}
                >
                    <Package className="mr-2 h-4 w-4" /> Vote Packs
                </button>
                <button
                    className={`px-4 py-2 font-medium flex items-center whitespace-nowrap ${activeTab === 'settings' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}`}
                    onClick={() => handleTabChange('settings')}
                >
                    <Settings className="mr-2 h-4 w-4" /> Settings
                </button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                {activeTab === 'votepacks' && (
                    <VotePacksManagement />
                )}
                
                {(activeTab === 'settings') && (
                    <ProductsManagement />
                )}
            </div>
        </div>
    );
}