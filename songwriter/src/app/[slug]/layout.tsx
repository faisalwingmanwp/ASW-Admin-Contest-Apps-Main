import { checkContestantHasMembershipBySlug } from "@/lib/membership-actions";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default async function SlugLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode, 
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const hasMembership = await checkContestantHasMembershipBySlug(slug);

  if (!hasMembership) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
        <div className="rounded-3xl p-8 max-w-md w-full text-center outline outline-1 outline-gray-300">
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
          
          <h1 className="text-2xl font-bold mb-2">Artist Not Found</h1>
          
          <p className="text-gray-600 mb-8">
            This artist profile is currently competing in American Songwriter contests.
          </p>
          
          <div className="space-y-4">
            <Link 
              href="/checkout" 
              className="block w-full bg-[#D33F49] hover:bg-[#D33F49]/80 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Sign Up to Compete
            </Link>
            
            <Link
              href="/checkout" 
              className="block w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors"
            >
              View Current Competitions
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return <div>{children}</div>;
}