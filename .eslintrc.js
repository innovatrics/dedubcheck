module.exports = {
  root: true,
  // 'prettier' here disables formatting-only-rules that come from the innovatrics-side,
  // that might conflict with the prettier-settings
  extends: ['@innovatrics/eslint-config-innovatrics-base', 'prettier'],
  env: {
    node: true,
  },
};
