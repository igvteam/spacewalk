// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import copy from 'rollup-plugin-copy'

process.env.JUICEBOX_CSS_SRC = '<link rel="stylesheet" href="node_modules/juicebox.js/dist/css/juicebox.css"/>';
process.env.JUICEBOX_CSS_DST = '<link rel="stylesheet" href="css/juicebox.css">';

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
                                src: 'spacewalk-config.js', dest: 'dist/'
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
                                src:
                                    [
                                        'css/fontawesome',
                                        'css/webfonts',
                                        'css/app.css',
                                        'css/spectrum.css',
                                        'node_modules/juicebox.js/dist/css/juicebox.css',
                                        'node_modules/juicebox.js/dist/css/img'
                                    ],
                                dest: 'dist/css/'
                            },
                            {
                                src: 'index.html',
                                dest: 'dist/',
                                transform: content => content.toString().replace(process.env.INDEX_FILE_SRC, process.env.INDEX_FILE_DST).replace(process.env.JUICEBOX_CSS_SRC, process.env.JUICEBOX_CSS_DST)
                            }
                        ],
                    verbose: true
                })
            ]
    };
