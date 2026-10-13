const getClientOrigins = require('./clientOrigins');

describe('client origin configuration', () => {
  const originalClientOrigin = process.env.CLIENT_ORIGIN;
  const originalRenderHostname = process.env.RENDER_EXTERNAL_HOSTNAME;

  afterEach(() => {
    if (originalClientOrigin === undefined) delete process.env.CLIENT_ORIGIN;
    else process.env.CLIENT_ORIGIN = originalClientOrigin;
    if (originalRenderHostname === undefined) delete process.env.RENDER_EXTERNAL_HOSTNAME;
    else process.env.RENDER_EXTERNAL_HOSTNAME = originalRenderHostname;
  });

  it('uses the Render HTTPS hostname when no explicit origin is set', () => {
    delete process.env.CLIENT_ORIGIN;
    process.env.RENDER_EXTERNAL_HOSTNAME = 'connectf.onrender.com';
    expect(getClientOrigins()).toEqual(['https://connectf.onrender.com']);
  });

  it('normalizes explicit comma-separated origins', () => {
    process.env.CLIENT_ORIGIN = 'https://app.example.com,localhost:5173';
    expect(getClientOrigins()).toEqual(['https://app.example.com', 'https://localhost:5173']);
  });
});
