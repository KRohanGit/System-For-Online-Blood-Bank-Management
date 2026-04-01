const mongoSanitize = require('express-mongo-sanitize');

const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized key: ${key} in request from ${req.ip}`);
  }
});

module.exports = { sanitizeInput };
