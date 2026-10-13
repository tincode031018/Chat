function getClientOrigins() {
  const configuredOrigins = process.env.CLIENT_ORIGIN
    || (process.env.RENDER_EXTERNAL_HOSTNAME && `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`)
    || 'http://localhost:8080,http://localhost:5173';

  return configuredOrigins.split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
    .map(origin => /^https?:\/\//i.test(origin) ? new URL(origin).origin : `https://${origin}`);
}

module.exports = getClientOrigins;
