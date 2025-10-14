import { defineConfig } from "vite"
import { resolve } from 'path'

export default defineConfig({
    build: {
        target: 'es2020',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'desktop.html')
            }
        }
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler', // or "modern", "legacy"
                importers: [
                    // ...
                ],
            },
        },
    },
    optimizeDeps: {
        esbuildOptions : {
            target: "es2020"
        }
    }

})
