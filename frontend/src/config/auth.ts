/** True when Vite env has Auth0 SPA + API audience (Universal Login). */
export function isAuth0Configured(): boolean {
  return Boolean(
    import.meta.env.VITE_AUTH0_DOMAIN &&
      import.meta.env.VITE_AUTH0_CLIENT_ID &&
      import.meta.env.VITE_AUTH0_AUDIENCE,
  );
}
