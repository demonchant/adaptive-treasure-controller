import test from 'node:test';
import assert from 'node:assert/strict';
import { GoogleIdentityProvider } from '../lib/google-auth.mjs';

test('Google login requests only identity scopes and uses PKCE with the configured callback', () => {
  const provider = new GoogleIdentityProvider({ clientId: 'client-id', clientSecret: 'client-secret', appBaseUrl: 'https://treasury.example.test/' });
  assert.equal(provider.configured(), true);
  const url = new URL(provider.authorizationUrl({ state: 'state-value', nonce: 'nonce-value', codeVerifier: 'verifier-value' }));
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.searchParams.get('scope'), 'openid email profile');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://treasury.example.test/auth/google/callback');
  assert.equal(url.searchParams.get('state'), 'state-value');
  assert.equal(url.searchParams.get('nonce'), 'nonce-value');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(url.searchParams.get('code_challenge'));
  assert.equal(url.searchParams.has('code_verifier'), false);
});

test('Google login refuses to start unless client credentials and a callback origin exist', () => {
  const provider = new GoogleIdentityProvider({ clientId: 'client-id', clientSecret: '', appBaseUrl: '' });
  assert.equal(provider.configured(), false);
  assert.throws(() => provider.authorizationUrl({ state: 's', nonce: 'n', codeVerifier: 'v' }), /not configured/);
});
