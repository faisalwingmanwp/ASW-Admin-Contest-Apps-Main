'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '../ui/input';

export type VotePackWithProduct = {
    id: string;
    quantity: number;
    productId: string;
    product: {
        name: string;
        price: number;
        stripePriceId: string;
    }
};

interface VotePackSelectProps {
    votePacks: VotePackWithProduct[];
    onSubmit: (data: { pack: VotePackWithProduct; name: string; email: string }) => Promise<void>;
    isSubmitting?: boolean;
    error?: string | null;
}

export default function VotePackSelect({ 
    votePacks,
    onSubmit,
    isSubmitting = false,
    error = null
}: VotePackSelectProps) {
    const [selectedPack, setSelectedPack] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPack || !name || !email) return;

        const votePack = votePacks.find(vp => vp.id === selectedPack);
        if (!votePack) return;

        await onSubmit({ pack: votePack, name, email });
    };

    return (
        <div>
        <div className="space-y-4 mb-6">
            {votePacks.map((pack) => (
            <label 
                key={pack.id} 
                className={`flex items-center p-4 border rounded-full cursor-pointer ${
                selectedPack === pack.id ? 'border-indigo-600' : 'border-gray-300'
                }`}
            >
                <div className="flex-1">
                <div className="relative h-12 w-12 bg-gray-200 rounded-full overflow-hidden">
                    <img
                        src="/placeholder-vote.png" 
                        alt={pack.product.name}
                        className="object-cover"
                    />
                </div>
                </div>
                <div className="flex-1">
                <span className="text-lg font-medium">
                    {pack.quantity} {pack.quantity === 1 ? 'Vote' : 'Votes'} - {
                    pack.product.price === 0 ? 'FREE' : `$${pack.product.price / 100}`
                    }
                </span>
                </div>
                <div className="flex-none ml-4">
                <input
                    type="radio"
                    name="votePack"
                    checked={selectedPack === pack.id}
                    onChange={() => setSelectedPack(pack.id)}
                    className="h-5 w-5 text-indigo-600"
                />
                </div>
            </label>
            ))}
        </div>
        
        <div className="space-y-4 mb-6">
            <Input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md"
                required
            />
            <Input
                type="email"
                placeholder="Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md"
                required
            />
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            {error}
            </div>
        )}
        
        <Button
            onClick={handleSubmit}
            disabled={!selectedPack || !name || !email || isSubmitting}
            className="w-full py-3 bg-indigo-600 text-white"
        >
            {isSubmitting ? 'Processing...' : 'Vote Now'}
        </Button>
        </div>
    );
} 