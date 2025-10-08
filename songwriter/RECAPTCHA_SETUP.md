# reCAPTCHA v3 Setup Guide

## 1. Get reCAPTCHA v3 Keys

1. Visit [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "Create" to add a new site
3. Choose **reCAPTCHA v3** (score-based)
4. Add your domains:
   - **Local development**: `localhost`, `127.0.0.1`
   - **Production**: Your actual domain (e.g., `yourapp.com`)
5. Accept the Terms of Service
6. Click "Submit"

## 2. Add Environment Variables

Add these to your `.env.local` file:

```env
# reCAPTCHA Keys
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

**Important**: 
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is the **Site Key** (public)
- `RECAPTCHA_SECRET_KEY` is the **Secret Key** (private)

## 3. Production Deployment

### Vercel
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add both environment variables:
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (Site Key)
   - `RECAPTCHA_SECRET_KEY` (Secret Key)

### Other Platforms
Add the same environment variables to your hosting platform's environment configuration.

## 4. Testing

1. **Local Development**: 
   - Use `localhost` in your reCAPTCHA admin console
   - Test with `.env.local` file

2. **Production**:
   - Add your actual domain to reCAPTCHA admin console
   - Verify environment variables are set correctly

## 5. How It Works

- **Free votes only**: reCAPTCHA v3 runs invisibly when users click the free vote button
- **Paid votes**: No reCAPTCHA (payment already provides friction)
- **User flow**: Click free vote → Invisible security check → Vote submitted
- **Score-based**: Returns a score (0.0-1.0) where 1.0 = human, 0.0 = bot
- **Threshold**: Votes with score < 0.5 are rejected as suspicious
- **Server validation**: reCAPTCHA token and score verified with Google's API

### Key Benefits of v3:
- **Invisible**: No user interaction required
- **Better UX**: No checkboxes or image selection
- **Smart scoring**: ML-based bot detection
- **Seamless**: Works in the background

## 6. Troubleshooting

**"Security verification failed"**
- Check if environment variables are set correctly
- Verify domain is added to reCAPTCHA admin console
- Ensure you created a **v3** key (not v2)
- Check if score threshold (0.5) is too strict

**"Security verification is loading"**
- Check `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set
- Verify the site key is correct
- Check browser console for script loading errors

**Low scores (legitimate users blocked)**
- Lower the score threshold in `vote-actions.ts` (try 0.3)
- Monitor logs for score patterns
- Consider user behavior (new browsers, VPNs, etc.)

**Server errors**
- Verify `RECAPTCHA_SECRET_KEY` is set on server
- Check server logs for API validation errors
- Ensure you're using v3 keys (not v2) 