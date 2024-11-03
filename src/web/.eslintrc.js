// Human Tasks:
// 1. Install required ESLint plugins and dependencies from package.json
// 2. Configure IDE/editor to use project's ESLint configuration
// 3. Setup pre-commit hooks to run ESLint checks
// 4. Ensure all team members have compatible ESLint versions installed

// ESLint configuration for React web dashboard
// eslint version: ^8.40.0
// @typescript-eslint/parser version: ^5.59.0
// @typescript-eslint/eslint-plugin version: ^5.59.0
// eslint-plugin-react version: ^7.32.0
// eslint-plugin-react-hooks version: ^4.6.0
// eslint-config-prettier version: ^8.8.0

module.exports = {
  // Requirement: Web Dashboard Technology Stack (4.4.1 Frontend Technologies)
  // Configure environment for React 18 and modern browser features
  env: {
    browser: true,
    es2021: true,
    jest: true,
  },

  // Requirement: Code Quality Standards (7.2 Frameworks and Libraries)
  // Extend recommended configurations for TypeScript, React, and Prettier
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // Must be last to override other formatting rules
  ],

  // Requirement: Programming Languages (7.1 Programming Languages)
  // Configure TypeScript parser and options
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2021,
    sourceType: 'module',
    project: './tsconfig.json',
  },

  // Required plugins for React and TypeScript support
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
  ],

  // React version configuration for plugin-react
  settings: {
    react: {
      version: '18.2.0',
    },
  },

  // Requirement: Code Quality Standards (7.2 Frameworks and Libraries)
  // Custom rule configurations for code quality enforcement
  rules: {
    // React specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in React 18 with automatic runtime
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react-hooks/rules-of-hooks': 'error', // Enforce React hooks rules
    'react-hooks/exhaustive-deps': 'warn', // Warn about missing dependencies in hooks

    // TypeScript specific rules
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Allow implicit return types
    '@typescript-eslint/no-explicit-any': 'warn', // Discourage use of 'any' type
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_', // Allow unused variables starting with underscore
    }],

    // General code quality rules
    'no-console': ['warn', {
      allow: ['warn', 'error'], // Only allow console.warn and console.error
    }],
    'eqeqeq': ['error', 'always'], // Require strict equality comparisons

    // Additional best practices
    'no-var': 'error', // Prefer let/const over var
    'prefer-const': 'error', // Prefer const when possible
    'no-multiple-empty-lines': ['error', { max: 1 }], // Limit empty lines
    'no-trailing-spaces': 'error', // No trailing whitespace
    'quotes': ['error', 'single', { avoidEscape: true }], // Use single quotes
    'semi': ['error', 'always'], // Require semicolons
    'arrow-body-style': ['error', 'as-needed'], // Simplify arrow functions
    'no-unused-expressions': 'error', // No unused expressions
    'no-duplicate-imports': 'error', // No duplicate imports
    'sort-imports': ['error', {
      ignoreDeclarationSort: true,
    }], // Sort import statements
    'no-shadow': 'off', // Disable base rule
    '@typescript-eslint/no-shadow': 'error', // Use TypeScript-aware version
    'no-return-await': 'off', // Disable base rule
    '@typescript-eslint/return-await': 'error', // Use TypeScript-aware version
    'no-throw-literal': 'off', // Disable base rule
    '@typescript-eslint/no-throw-literal': 'error', // Use TypeScript-aware version
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
    }], // Prefer type imports
    '@typescript-eslint/no-non-null-assertion': 'error', // No non-null assertions
    '@typescript-eslint/no-inferrable-types': 'error', // No redundant type annotations
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'], // Prefer interface over type
  },

  // Specific overrides for test files
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
  ],
};