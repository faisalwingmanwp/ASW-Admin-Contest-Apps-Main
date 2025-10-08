"use client";

import { useState } from 'react';
import Link from 'next/link';

interface MenuButtonProps {
  links?: { label: string; href: string }[];
}

export default function MenuButton({ 
  links = [
    { label: 'Home', href: '/' },
    { label: 'Contest Rules', href: '/rules' },
    { label: 'Browse Artists', href: '/artists' },
    { label: 'Submit Your Music', href: '/submit' },
  ]
}: MenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button 
        className="text-black hover:bg-gray-100 rounded-full p-2 transition-colors"
        onClick={toggleMenu}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {links.map((link, index) => (
              <Link 
                key={index} 
                href={link.href}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 