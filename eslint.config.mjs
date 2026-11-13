import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'apps-script/**/*'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
