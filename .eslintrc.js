module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
    },
    plugins: [
      'react',
      'react-native',
      '@typescript-eslint',
    ],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:react/recommended',
      'plugin:react-native/all',
      'expo',
    ],
    env: {
      'react-native/react-native': true,
      es6: true,
      node: true,
    },
    rules: {
      // Example custom rules
      'react/react-in-jsx-scope': 'off', // React 17+ JSX transform
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  };
  