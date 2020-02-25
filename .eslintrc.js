module.exports = {
  env: {
    browser: true,
  },
  extends: 'airbnb-base',
  rules: {
    'arrow-parens': ['error', 'as-needed'],
    'import/no-extraneous-dependencies': ['error', {'devDependencies': true}],
    'no-cond-assign': 'off',
    'no-confusing-arrow': 'off',
    'no-fallthrough': 'off',
    'no-mixed-operators': 'off',
    'no-multi-assign': 'off',
    'no-param-reassign': ['error', { props: false }],
    'no-plusplus': 'off',
  },
};
