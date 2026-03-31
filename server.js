import * as serverBuild from 'virtual:react-router/server-build';
import {createRequestHandler, storefrontRedirect} from '@shopify/hydrogen';
import {createHydrogenRouterContext} from '~/lib/context';

/**
 * When running behind a reverse proxy/tunnel (eg. ngrok), the incoming request URL
 * can still be `localhost`, but Shopify Customer Account OAuth requires the public
 * HTTPS origin. We reconstruct the request URL using standard forwarded headers.
 * @param {Request} request
 */
/**
 * @param {Request} request
 * @param {Env} env
 */
function withPublicOrForwardedOrigin(request, env) {
  /**
   * Rebuild a Request preserving method/body/etc.
   * Some runtimes don't reliably preserve the body when spreading a Request.
   * @param {URL} url
   * @param {Request} original
   * @param {Headers} headers
   */
  function rebuild(url, original, headers) {
    /** @type {RequestInit & {duplex?: 'half'}} */
    const init = {
      method: original.method,
      headers,
      body:
        original.method === 'GET' || original.method === 'HEAD'
          ? undefined
          : original.body,
      redirect: original.redirect,
      signal: original.signal,
    };

    // Node.js fetch requires duplex for streaming bodies.
    if (init.body) init.duplex = 'half';

    return new Request(url.toString(), init);
  }

  const publicAppUrl =
    env?.PUBLIC_APP_URL || env?.PUBLIC_TUNNEL_URL || env?.PUBLIC_SITE_URL;

  if (publicAppUrl) {
    const base = new URL(publicAppUrl);
    const hostHeader = (request.headers.get('host') || '').toLowerCase();
    const xfHost = (request.headers.get('x-forwarded-host') || '').toLowerCase();
    const origin = request.headers.get('origin');
    let originHost = '';
    if (origin) {
      try {
        originHost = new URL(origin).host.toLowerCase();
      } catch {
        // ignore
      }
    }
    const publicHost = base.host.toLowerCase();
    // Only rewrite to PUBLIC_APP_URL when the client actually hit that host
    // (e.g. ngrok). If you open http://localhost:3000 while PUBLIC_APP_URL is
    // ngrok, forcing x-forwarded-host to ngrok breaks React Router's check:
    // Origin (localhost) must match x-forwarded-host.
    const requestIsForPublicApp =
      hostHeader === publicHost ||
      xfHost === publicHost ||
      originHost === publicHost;

    if (requestIsForPublicApp) {
      const url = new URL(request.url);
      url.protocol = base.protocol;
      url.host = base.host;
      const headers = new Headers(request.headers);
      headers.set('x-forwarded-host', base.host);
      headers.set('x-forwarded-proto', base.protocol.replace(':', ''));
      return rebuild(url, request, headers);
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const origin = request.headers.get('origin');

  // If the proxy didn't provide x-forwarded-* headers, infer them from Origin.
  // Hydrogen validates forwarded action requests by comparing Origin to forwarded host.
  if ((!forwardedHost || !forwardedProto) && origin) {
    try {
      const originUrl = new URL(origin);
      const headers = new Headers(request.headers);
      headers.set('x-forwarded-host', originUrl.host);
      headers.set('x-forwarded-proto', originUrl.protocol.replace(':', ''));

      const url = new URL(request.url);
      url.host = originUrl.host;
      url.protocol = originUrl.protocol;

      return rebuild(url, request, headers);
    } catch {
      // If Origin is malformed, fall through to existing behavior.
    }
  }

  if (!forwardedHost && !forwardedProto) return request;

  const url = new URL(request.url);
  if (forwardedHost) url.host = forwardedHost;
  if (forwardedProto) url.protocol = `${forwardedProto}:`;

  // Keep forwarded headers consistent with the rewritten URL.
  const headers = new Headers(request.headers);
  if (forwardedHost) headers.set('x-forwarded-host', forwardedHost);
  if (forwardedProto) headers.set('x-forwarded-proto', forwardedProto);
  return rebuild(url, request, headers);
}

/**
 * Export a fetch handler in module format.
 */
export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} executionContext
   * @return {Promise<Response>}
   */
  async fetch(request, env, executionContext) {
    try {
      request = withPublicOrForwardedOrigin(request, env);

      const hydrogenContext = await createHydrogenRouterContext(
        request,
        env,
        executionContext,
      );

      /**
       * Create a Hydrogen request handler that internally
       * delegates to React Router for routing and rendering.
       */
      const handleRequest = createRequestHandler({
        build: serverBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: () => hydrogenContext,
      });

      const response = await handleRequest(request);

      // Debug headers to diagnose proxy/action mismatches (ngrok/proxy).
      // Safe to leave in dev; remove before production deploy.
      try {
        const url = new URL(request.url);
        if (url.pathname === '/cart.data' || url.pathname.endsWith('.data')) {
          response.headers.set(
            'X-Debug-Origin',
            request.headers.get('origin') || '',
          );
          response.headers.set(
            'X-Debug-X-Forwarded-Host',
            request.headers.get('x-forwarded-host') || '',
          );
          response.headers.set(
            'X-Debug-X-Forwarded-Proto',
            request.headers.get('x-forwarded-proto') || '',
          );
        }
      } catch {}

      if (hydrogenContext.session.isPending) {
        response.headers.set(
          'Set-Cookie',
          await hydrogenContext.session.commit(),
        );
      }

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If the redirect doesn't exist, then `storefrontRedirect`
         * will pass through the 404 response.
         */
        return storefrontRedirect({
          request,
          response,
          storefront: hydrogenContext.storefront,
        });
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
