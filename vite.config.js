import {defineConfig} from 'vite';
export default defineConfig({base:'./',server:{allowedHosts:['terminal.local']},build:{rollupOptions:{output:{manualChunks:{sculpture:['three'],chain:['genlayer-js','viem']}}}}});
