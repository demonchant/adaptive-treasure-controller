export const testIdentityProvider = {
  configured: () => true,
  authorizationUrl: ({ state }) => `https://identity.example.test/authorize?state=${encodeURIComponent(state)}`,
  async authenticateCallback({ code }) {
    return { id: `test:${code}`, email: `${code}@example.test`, name: `Test ${code}` };
  },
};

export async function signIn(base, user = 'alice') {
  const start = await fetch(`${base}/auth/google`, { redirect: 'manual' });
  const authorization = new URL(start.headers.get('location'));
  const callback = await fetch(`${base}/auth/google/callback?state=${encodeURIComponent(authorization.searchParams.get('state'))}&code=${encodeURIComponent(user)}`, { redirect: 'manual' });
  const cookie = callback.headers.get('set-cookie').split(';')[0];
  const session = await fetch(`${base}/api/session`, { headers: { Cookie: cookie } });
  return { cookie, ...(await session.json()) };
}
