import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export class GoogleIdentityProvider {
  constructor({ clientId = process.env.GOOGLE_CLIENT_ID, clientSecret = process.env.GOOGLE_CLIENT_SECRET, appBaseUrl = process.env.APP_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? (process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : undefined), fetchImpl = fetch } = {}) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.appBaseUrl = appBaseUrl?.replace(/\/$/, '');
    this.fetch = fetchImpl;
  }

  configured() { return Boolean(this.clientId && this.clientSecret && this.appBaseUrl); }
  redirectUri() { return `${this.appBaseUrl}/auth/google/callback`; }

  authorizationUrl({ state, nonce, codeVerifier }) {
    if (!this.configured()) throw new Error('Google sign-in is not configured.');
    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.search = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    return url.toString();
  }

  async authenticateCallback({ code, nonce, codeVerifier }) {
    if (!this.configured()) throw Object.assign(new Error('Google sign-in is not configured.'), { status: 503 });
    const response = await this.fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri(),
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    });
    const tokenResponse = await response.json().catch(() => ({}));
    if (!response.ok || !tokenResponse.id_token) throw Object.assign(new Error('Google sign-in could not be verified.'), { status: 401 });

    const { payload } = await jwtVerify(tokenResponse.id_token, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience: this.clientId,
    });
    if (payload.nonce !== nonce || payload.email_verified !== true || typeof payload.sub !== 'string' || !payload.sub) {
      throw Object.assign(new Error('Google did not return a verified account identity.'), { status: 401 });
    }
    return {
      id: `google:${payload.sub}`,
      email: typeof payload.email === 'string' ? payload.email : '',
      name: typeof payload.name === 'string' ? payload.name : '',
      picture: typeof payload.picture === 'string' ? payload.picture : '',
    };
  }
}

export function randomOAuthValue() { return randomBytes(32).toString('base64url'); }
