// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import copy from 'rollup-plugin-copy'

process.env.INDEX_FILE_SRC = '<script type="module" src="js/app.js"></script>';
process.env.INDEX_FILE_DST = '<script src="./app_bundle.js"></script>';

module.exports =
    {
        input: 'js/app.js',
        output:
            {
                file: 'tmp/app_bundle.js',
                format: 'umd',
                name: 'spacewalk_app_bundle'
            },
        plugins:
            [
                resolve(),
                babel(
                    {
                        exclude: 'node_modules/**'
                    }),
                copy({
                    targets:
                        [
                            {
                                src:
                                    [
                                        'css/app.css',
                                        'css/juicebox.css',
                                        'css/spectrum.css'
                                    ],
                                dest: 'dist/css/'
                            },
                            {
                                src: 'css/fontawesome', dest: 'dist/css/'
                            },
                            {
                                src: 'css/img', dest: 'dist/css/'
                            },
                            {
                                src: 'css/webfonts', dest: 'dist/css/'
                            },
                            {
                                src: 'favicon.ico', dest: 'dist/'
                            },
                            {
                                src: 'vendor', dest: 'dist/'
                            },
                            {
                                src: 'img', dest: 'dist/'
                            },
                            {
                                src: 'texture', dest: 'dist/'
                            },
                            {
                                src: 'resources', dest: 'dist/'
                            },
                            {
                                src: 'index.html',
                                dest: 'dist/',
                                transform: (content) => {
                                    return content
                                        .toString()
                                        .replace(process.env.INDEX_FILE_SRC, process.env.INDEX_FILE_DST);
                                }
                            }
                        ],
                    verbose: true
                })
            ]
    };
