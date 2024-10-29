import { defineConfig } from "vite"

export default defineConfig({
    build: {
        target: 'es2020'
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
