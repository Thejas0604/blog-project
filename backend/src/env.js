// Only these two NODE_ENV values are treated as non-production; anything else
// (including unset) gets production-grade cookie and secret checks.
const isDevLike = () => ['development', 'test'].includes(process.env.NODE_ENV);

module.exports = { isDevLike };
