const revokedTokens = new Map();
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;


function revokeToken(token, expiresAt) {
  revokedTokens.set(token, expiresAt || Date.now() + 24 * 60 * 60 * 1000);
}

function isTokenRevoked(token) {
  return revokedTokens.has(token);
}

function cleanup() {
  const now = Date.now();
  for (const [token, expiry] of revokedTokens.entries()) {
    if (expiry < now) {
      revokedTokens.delete(token);
    }
  }
}

setInterval(cleanup, CLEANUP_INTERVAL_MS);

function getRevokedCount() {
  return revokedTokens.size;
}

module.exports = {
  revokeToken,
  isTokenRevoked,
  getRevokedCount
};
