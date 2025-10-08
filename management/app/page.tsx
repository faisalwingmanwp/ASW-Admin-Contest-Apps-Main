import Link from "next/link";
import Image from 'next/image';
import { Trophy, Music, Star } from 'lucide-react';
import { createClient } from "@/lib/supabase/supabase-server";

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
              <Image
                src="/songwriter-logo-black.png"
                alt="American Songwriter"
                width={120}
                height={120}
                className="object-contain"
                draggable={false}
                priority
              />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold mb-2">American Songwriter</h1>
          
          <p className="text-gray-600 mb-6">
            Admin and Screener Login
          </p>
          
          <div className="space-y-4">
            <Link href="/auth/accept-invite" className="block">
              <button className="w-full bg-[#D33F49] hover:bg-[#D33F49]/80 text-white font-medium py-3 px-6 rounded-lg transition-colors">
                Screener Signup
              </button>
            </Link>
            
            <Link href="/auth/login" className="block">
            {user ? (
              <button className="w-full border border-[#D33F49] text-[#D33F49] hover:bg-[#D33F49]/10 font-medium py-3 px-6 rounded-lg transition-colors">
                Admin Portal
              </button>
            ) : (
              <button className="w-full border border-[#D33F49] text-[#D33F49] hover:bg-[#D33F49]/10 font-medium py-3 px-6 rounded-lg transition-colors">
                Admin and Screener Sign In
              </button>
            )}
            </Link>
            
          </div>
        </div>
      </div>
      
      {/* Image Section */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center bg-gray-100 relative">
        <Image
          src="/betty.webp"
          alt="Promotional image"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />
      </div>
    </div>
  );
}
