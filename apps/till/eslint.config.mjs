// https://docs.expo.dev/guides/using-eslint/
import { layerRules } from '@zahln/eslint-config/layers';
import expoConfig from 'eslint-config-expo/flat.js';
import { defineConfig } from 'eslint/config';

export default defineConfig([expoConfig, layerRules('@zahln/till'), { ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'expo-env.d.ts'] }]);
