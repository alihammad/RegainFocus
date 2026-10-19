import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Run `pnpm generate-icons` after changing public/icon.svg. The PNGs are committed.
const background = '#F1F2EE'; // --color-ground

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ['public/icon.svg'],
});
