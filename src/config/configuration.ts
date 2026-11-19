export default () => ({
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX === '' ? '' : (process.env.API_PREFIX ?? 'api'),
  mongodbUri: process.env.MONGODB_URI,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d'
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    jwksUrl: process.env.GOOGLE_JWKS_URL ?? 'https://www.googleapis.com/oauth2/v3/certs',
    successRedirectUrl: process.env.GOOGLE_SUCCESS_REDIRECT_URL,
    failureRedirectUrl: process.env.GOOGLE_FAILURE_REDIRECT_URL
  },
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? 'no-reply@gopharma.local'
  },
  rateLimit: {
    limit: Number(process.env.RATE_LIMIT_LIMIT ?? 120),
    ttlMs: Number(process.env.RATE_LIMIT_TTL_MS ?? 60_000)
  }
});
