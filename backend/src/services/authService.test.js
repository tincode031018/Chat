const { hashPassword, verifyPassword } = require('./authService');

describe('password service', () => {
  it('hashes passwords and verifies only the original password', async () => {
    const hash = await hashPassword('a-strong-password');
    expect(hash).not.toBe('a-strong-password');
    await expect(verifyPassword('a-strong-password', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});
