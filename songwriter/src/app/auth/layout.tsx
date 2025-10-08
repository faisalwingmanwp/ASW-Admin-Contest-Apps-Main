import Image from 'next/image';
import { ReactNode } from 'react';

export default function AuthLayout({children}: {children: ReactNode}) {
    return (
        <div className="flex min-h-screen flex-col md:flex-row">            
            {/* Main Content */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8">
                <div className="mb-8 md:hidden">
                    <img    
                        src="/songwriter-logo-black.png" 
                        alt="American Songwriter"
                        width={160}
                        height={120}
                    />
                </div>
                <div className="w-full max-w-md">
                    {children}
                </div>
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>© {new Date().getFullYear()} American Songwriter. All rights reserved.</p>
                </div>
            </div>
            
            {/* Image Section */}
            <div className="hidden md:flex md:w-1/2 items-center justify-center bg-gray-100 relative">
                <img 
                    src="/betty.webp" 
                    alt="Promotional image" 
                    style={{ objectFit: 'cover' }}
                />
            </div>
        </div>
    );
}
