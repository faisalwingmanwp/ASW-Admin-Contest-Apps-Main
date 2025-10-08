

import Image from 'next/image';
import Link from 'next/link';
import { Trophy, Music, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Main Content */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="rounded-3xl p-8 max-w-md w-full text-center outline outline-1 outline-gray-300 bg-white">
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 flex items-center justify-center">
              <img
                src="/songwriter-logo-black.png"
                alt="American Songwriter"
                width={120}
                height={120}
                className="object-contain"
                draggable={false}
              />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold mb-2">American Songwriter Contests</h1>
          
          <p className="text-gray-600 mb-6">
            Showcase your talent and connect with fans around the world.
          </p>
          
          {/* Feature list */}
          <div className="space-y-4 mb-8 text-left">
            <div className="flex items-start gap-3">
              <div className="mt-1 bg-red-50 p-1.5 rounded-full text-[#D33F49]">
                <Trophy size={18} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Win Prizes</h3>
                <p className="text-gray-600 text-sm">Get recognized for your songwriting talent</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-1 bg-red-50 p-1.5 rounded-full text-[#D33F49]">
                <Music size={18} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Share Your Music</h3>
                <p className="text-gray-600 text-sm">Build your audience and be heard</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-1 bg-red-50 p-1.5 rounded-full text-[#D33F49]">
                <Star size={18} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Grow Your Career</h3>
                <p className="text-gray-600 text-sm">Connect with industry professionals</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <Link href="/checkout" className="block">
              <button className="w-full bg-[#D33F49] hover:bg-[#D33F49]/80 text-white font-medium py-3 px-6 rounded-lg transition-colors">
                Enter Contest
              </button>
            </Link>
            
            <Link href="/auth/login" className="block">
            {user ? (
              <button className="w-full border border-[#D33F49] text-[#D33F49] hover:bg-[#D33F49]/10 font-medium py-3 px-6 rounded-lg transition-colors">
                My Profile
              </button>
            ) : (
              <button className="w-full border border-[#D33F49] text-[#D33F49] hover:bg-[#D33F49]/10 font-medium py-3 px-6 rounded-lg transition-colors">
                Sign In
              </button>
            )}
            </Link>
            
          </div>
        </div>
      </div>
      
      {/* Image Section */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center bg-gray-100 relative">
        <img
          src="/hero.png"
          alt="Promotional image"
          style={{ objectFit: 'cover' }}
        />
      </div>
    </div>
  );
}
