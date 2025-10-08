import Image from 'next/image';

export default function AuthLayout({children}: {children: React.ReactNode}) {
    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            {/* Main Content */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-8">
                {children}
            </div>
            {/* Image Section */}
            <div className="hidden md:flex md:w-1/2 items-center justify-center bg-gray-100 relative">
                <Image 
                    src="/betty.webp" 
                    alt="Promotional image" 
                    layout="fill" 
                    objectFit="cover"
                    priority // Optional: Load the image faster if it's above the fold
                />
            </div>
        </div>
    );
}
