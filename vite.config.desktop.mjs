import { defineConfig } from "vite"
import { resolve } from 'path'
import { renameSync } from 'fs'

// Plugin to rename desktop.html to index.html after build
function renameHtmlPlugin() {
    return {
        name: 'rename-html',
        closeBundle() {
            try {
                renameSync(
                    resolve(__dirname, 'dist/desktop.html'),
                    resolve(__dirname, 'dist/index.html')
                );
                console.log('✓ Renamed desktop.html to index.html');
            } catch (err) {
                console.error('Error renaming HTML file:', err.message);
            }
        }
    };
}

export default defineConfig({
    plugins: [renameHtmlPlugin()],
    build: {
        target: 'es2020',
        outDir: 'dist',
        rollupOptions: {
            input: resolve(__dirname, 'desktop.html'),
            output: {
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]'
            }
        }
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
                importers: [],
            },
        },
    },
    optimizeDeps: {
        esbuildOptions : {
            target: "es2020"
        }
    }
})

