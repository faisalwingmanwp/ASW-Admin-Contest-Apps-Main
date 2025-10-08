'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCheckoutStore } from '@/stores/checkout-store';

// Facebook Pixel functions
declare global {
  interface Window {
    fbq: any;
  }
}

const FB_PIXEL_ID = '1891611881076889';

// Initialize Facebook Pixel
const initFacebookPixel = () => {
  if (typeof window !== 'undefined' && !window.fbq) {
    (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    
    window.fbq('init', FB_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
};

// Facebook Pixel event tracking
const trackFBEvent = (eventName: string, parameters?: any) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, parameters);
  }
};

export default function CheckoutSuccessHandler() {
  const reset = useCheckoutStore((state) => state.reset);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialize Facebook Pixel
    initFacebookPixel();

    // Track Facebook Pixel Purchase event
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      // Get purchase details from URL parameters or session storage if available
      // For now, we'll track a basic purchase event
      trackFBEvent('Purchase', {
        currency: 'USD',
        value: 0, // This would ideally be the actual purchase amount
        content_type: 'product',
        content_name: 'Contest Entry Purchase'
      });

      console.log('Facebook Pixel Purchase event tracked for session:', sessionId);
    }

    // Reset checkout store
    reset();
  }, [reset, searchParams]);

  return null; // This component renders nothing.
} 