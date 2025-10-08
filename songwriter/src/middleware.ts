import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect dashboard routes
  if (pathname.startsWith('/profile')) {
    // Create a response that we'll use to set cookies on
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Create a Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.delete({
              name,
              ...options,
            });
          },
        },
      }
    );
    
    // Get the user from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    // If there's no session, redirect to the login page
    if (!session) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protected routes
    '/profile',
  ],
}; 