function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function expandPattern(pattern) {
  if (!pattern || pattern === '*') {
    return [pattern];
  }

  if (pattern.includes('://')) {
    return [pattern];
  }

  // If scheme is omitted, support both for convenience.
  return [`https://${pattern}`, `http://${pattern}`];
}

function parseAllowedOrigins(rawOrigins) {
  if (!rawOrigins) {
    return [];
  }

  return String(rawOrigins)
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean)
    .flatMap(expandPattern)
    .map((origin) => normalizeOrigin(origin));
}

function patternToRegExp(pattern) {
  const escaped = pattern
    .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escaped}$`);
}

function isOriginAllowed(origin, allowlist) {
  const normalizedOrigin = normalizeOrigin(origin);

  if (!normalizedOrigin) {
    return true;
  }

  if (!allowlist || allowlist.length === 0) {
    return true;
  }

  return allowlist.some((allowedOrigin) => {
    const normalizedAllowedOrigin = normalizeOrigin(allowedOrigin);

    if (normalizedAllowedOrigin === '*') {
      return true;
    }

    if (normalizedAllowedOrigin === normalizedOrigin) {
      return true;
    }

    return patternToRegExp(normalizedAllowedOrigin).test(normalizedOrigin);
  });
}

module.exports = {
  parseAllowedOrigins,
  isOriginAllowed
};
