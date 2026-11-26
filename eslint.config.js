const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // I form si riempiono con i dati che arrivano dal server o dalla copia locale:
      // è il caso d'uso che questa regola (pensata per le prestazioni) segnala.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['scripts/**/*.js', '*.config.js'],
    languageOptions: { globals: { __dirname: 'readonly', Buffer: 'readonly', process: 'readonly', console: 'readonly', require: 'readonly', module: 'writable' } },
  },
  { ignores: ['dist/*', 'coverage/*', '.expo/*', 'node_modules/*'] },
]);
