require("@babel/polyfill");
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

process.env.INDEX_FILE_SRC = '<script type="module" src="js/app.js"></script>';
process.env.INDEX_FILE_DST = '<script src="./app_bundle.js"></script>';

module.exports =
    {
        mode: 'none',
        entry: ['@babel/polyfill', './js/app.js'],
        output:
            {
                path: path.resolve(__dirname, 'dist'),
                filename: 'app_bundle.js'
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
                    { from:'css/**/*.css'      },
                    { from:'css/webfonts/*' },
                    { from:'css/img/*'      },
                    { from:'img/*'          },
                    { from:'texture/**/*'   },
                    { from:'resources/**/*' },
                    { from:'vendor/*'       },
                    { from:'favicon.ico'    },
                    {
                        from: 'index.html',
                        transform: (content) => {
                            return content
                                .toString()
                                .replace(process.env.INDEX_FILE_SRC, process.env.INDEX_FILE_DST);
                        }
                    },
                ])

            ]
    };

