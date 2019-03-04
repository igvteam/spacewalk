const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

process.env.INDEX_FILE_SRC = '<script type="module" src="js/duo.js"></script>';
process.env.INDEX_FILE_DST = '<script src="./duo_bundle.js"></script>';

module.exports =
    {
        mode: 'none',
        entry:
            [
                '@babel/polyfill',
                './js/duo.js'
            ],
        output:
            {
                path: path.resolve(__dirname, 'build'),
                filename: 'duo_bundle.js'
            },
        module: {
            rules:
                [
                    {
                        test: /\.js$/,
                        exclude: /(node_modules|bower_components)/,
                        use:
                            {
                                loader: 'babel-loader',
                                options:
                                    {
                                        presets:
                                            [
                                                '@babel/preset-env'
                                            ]
                                    }
                            }
                    }
                ]
        },
        plugins:
            [
                new CopyPlugin([
                    { from:'css/duo.css', to:'css' },
                    { from:'img/*'         },
                    { from:'texture/**/*'  },
                    { from:'resource/**/*' },
                    { from:'vendor/**/*'   },
                    { from:'favicon.ico'   },
                    {
                        from: 'duo.html',
                        transform: (content) => {
                            return content
                                .toString()
                                .replace(process.env.INDEX_FILE_SRC, process.env.INDEX_FILE_DST);
                        }
                    }
                ])

            ]
    };

