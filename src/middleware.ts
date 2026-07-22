import { defineMiddleware } from 'astro:middleware';

// Fixes Keystatic's GitHub OAuth redirect_uri in production.
// On proxy-based hosts (Vercel, Netlify, Cloudflare), Keystatic uses the
// internal hostname ("localhost") when building the OAuth callback URL, which
// breaks sign-in. This rewrites OAuth requests to use the real public domain
// from the x-forwarded-* headers.
// Workaround for https://github.com/Thinkmill/keystatic/issues/1022
export const onRequest = defineMiddleware(async (context, next) => {
  const isOAuthRoute =
    context.url.pathname.includes('/github/oauth/') ||
    context.url.pathname.includes('/github/login');

  if (isOAuthRoute) {
    const forwardedHost = context.request.headers.get('x-forwarded-host');
    const forwardedProto = context.request.headers.get('x-forwarded-proto');

    if (forwardedHost && forwardedProto) {
      const correctUrl = new URL(context.url);
      correctUrl.protocol = forwardedProto;
      correctUrl.host = forwardedHost;

      const newRequest = new Request(correctUrl.toString(), {
        method: context.request.method,
        headers: context.request.headers,
        body: context.request.body,
        // @ts-ignore - duplex is required when a body is present
        duplex: 'half',
      });

      Object.defineProperty(context, 'url', {
        value: correctUrl,
        writable: false,
      });

      Object.defineProperty(context, 'request', {
        value: newRequest,
        writable: false,
      });
    }
  }

  return next();
});
