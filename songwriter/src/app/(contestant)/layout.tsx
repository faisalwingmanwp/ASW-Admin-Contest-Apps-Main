import { getCurrentContestant } from "@/lib/auth-actions";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { LogOut, User, Settings, Receipt, Plus } from 'lucide-react';

export default async function DashboardLayout({
    children,
}: {
    children: ReactNode;
}) {

    const contestant = await getCurrentContestant();
    
    if (!contestant) {
        redirect('/auth/login')
    }

    const profileImageUrl = contestant?.profilePhoto 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-photos/${contestant.profilePhoto}`
      : '/default.png';

    return (
        <div>
            <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 py-3 bg-[#F2F2F2] w-full">
                <div className="flex items-center">
                    <img
                        src="/songwriter-logo-black.png"
                        alt="American Songwriter"
                        width={120}
                        height={100}
                        className=""
                        draggable={false}
                    />
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Start New Submission Button */}
                    <Link href="/checkout">
                        <Button className="bg-[#D33F49] hover:bg-[#C03541] text-white font-medium px-4 py-2 h-9 text-sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Start New Submission
                        </Button>
                    </Link>
                    
                    {/* Profile Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="outline-none">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                          <img 
                            src={profileImageUrl} 
                            alt={contestant.username}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium">{contestant.firstName} {contestant.lastName}</p>
                            <p className="text-xs text-gray-500">@{contestant.username}</p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href="/profile">
                          <DropdownMenuItem className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>My Profile</span>
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/orders">
                          <DropdownMenuItem className="cursor-pointer">
                            <Receipt className="mr-2 h-4 w-4" />
                            <span>Order History</span>
                          </DropdownMenuItem>
                        </Link>
                        <Link href="https://www.americansongwriter.com/membership">
                          <DropdownMenuItem className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Membership</span>
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <Link href="/auth/signout">
                          <DropdownMenuItem className="cursor-pointer text-red-600">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sign Out</span>
                          </DropdownMenuItem>
                        </Link>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            {children}
        </div>
    );
}