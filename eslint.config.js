import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', 'docs/design/**', 'supabase/.temp/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
