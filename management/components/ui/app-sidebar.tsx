"use client";

import {
  Award,
  BarChart3,
  ChevronDown,
  HelpCircle,
  LogOut,
  Plus,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

import { cn } from "@/lib/utils";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./button";
import SongWriterLogo from "./logo";
import { Badge } from "./badge";
import { logout } from "@/lib/actions/auth-actions";

// Navigation data with correct routes
const navItems = [
  {
    title: "Competitions",
    url: "/dashboard/competitions",
    icon: Trophy,
  },
  {
    title: "Vote Packs",
    url: "/dashboard/fan-voting",
    icon: Award,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "Team & Access",
    url: "/dashboard/screeners",
    icon: Users,
  },
  {
    title: "Support Tickets",
    url: "/dashboard/support",
    icon: HelpCircle,
  },
  {
    title: "Sync Data",
    url: "/dashboard/sync",
    icon: ChevronDown,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props} className="">
      <SidebarHeader className="px-4 pt-6 pb-4 space-y-4">
        <div className="flex justify-center">
          <Link href="/dashboard">
            <SongWriterLogo width={120} height={40} />
          </Link>
        </div>
        <CreateCompetitionButton />
      </SidebarHeader>
      
      <SidebarContent className="px-4">
        <NavigationMenu items={navItems} />
      </SidebarContent>
      
      <SidebarFooter className="p-4 mt-auto">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          onClick={() => logout()}
        >
          <LogOut className="mr-3 h-4 w-4" />
          <span>Log out</span>
        </Button>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}

function CreateCompetitionButton() {
  return (
    <Link href="/dashboard/competitions/new" className="w-full">
      <Button 
        className="w-full text-white font-medium"
        style={{ backgroundColor: '#D33F49' }}
        size="sm"
      >
        <div className="flex items-center justify-center">
          <Plus className="mr-2 h-4 w-4" />
          Create Contest
        </div>
      </Button>
    </Link>
  );
}

type NavigationItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
};

function NavigationMenu({ 
  items 
}: { 
  items: NavigationItem[];
}) {
  const pathname = usePathname();
  
  return (
    <SidebarGroup>
      <SidebarMenu className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(item.url + '/');
          
          return (
            <SidebarMenuItem key={item.title}>
              <Link href={item.url} className="w-full">
                <SidebarMenuButton 
                  tooltip={item.title}
                  className={cn(
                    "w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-50",
                    isActive && "bg-[#E6E6E0] text-gray-900 font-medium"
                  )}
                >
                  {item.icon && <item.icon className="mr-3 h-4 w-4" />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
