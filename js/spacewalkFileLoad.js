import { FileUtils, URIUtils, GooglePicker, GoogleUtils, GoogleDrive } from '../node_modules/igv-utils/src/index.js'
import {GenericDataSource, ModalTable} from '../node_modules/data-modal/js/index.js'
import { appendAndConfigureLoadURLModal } from './app.js'
import {gsdbDatasourceConfigurator} from './gsdbDatasourceConfig.js'

let gsdbModal = undefined

class SpacewalkFileLoad {

    constructor({ rootContainer, $localFileInput, urlLoadModalId, gsdbModalId, $selectModal, $dropboxButton, $googleDriveButton, googleEnabled, fileLoader }) {

        $localFileInput.on('change', async function (e) {
            const file = ($localFileInput.get(0).files)[ 0 ];
            $localFileInput.val('');
            await fileLoader.load(file);
        });

        appendAndConfigureLoadURLModal(rootContainer, urlLoadModalId, async path => {

            const name = FileUtils.getFilename(path);
            await fileLoader.load(path);
        })

        const gsdbModalConfig =
            {
                id: gsdbModalId,
                title: 'GSDB',
                selectionStyle: 'single',
                pageLength: 100,
                datasource: new GenericDataSource(gsdbDatasourceConfigurator('http://calla.rnet.missouri.edu/genome3d/GSDB/GSDB_JSON_URL_LIST.txt')),
                okHandler: (selections) => {

                    if (selections.length > 0) {
                        let { name, url } = selections[ 0 ]
                        url = `http://${ url }`
                        fileLoader.load(url)
                    }
                }
            };

        gsdbModal = new ModalTable(gsdbModalConfig)

        configureSelectOnChange($selectModal.find('select'), $selectModal, async path => {

            const name = FileUtils.getFilename(path);
            await fileLoader.load(path);
        });

        $dropboxButton.on('click', () => {

            const config =
                {
                    success: async dbFiles => {
                        const paths = dbFiles.map(dbFile => dbFile.link);
                        const path = paths[ 0 ];
                        const name = FileUtils.getFilename(path);
                        await fileLoader.load(path);
                    },
                    cancel: () => {},
                    linkType: 'preview',
                    multiselect: false,
                    folderselect: false,
                };

            Dropbox.choose( config );

        });

        if (false === googleEnabled) {
            $googleDriveButton.parent().hide();
        }

        if (true === googleEnabled) {

            $googleDriveButton.on('click', () => {

                GooglePicker.createDropdownButtonPicker(false, async responses => {

                    const paths = responses.map(({ name, url }) => url)
                    const path = paths[ 0 ]

                    const name = await SpacewalkFileLoad.getFilename(path)
                    const extension = FileUtils.getExtension(name)

                    await fileLoader.load(path)

                });

            });
        }

    }

    static async getFilename(path ){

        if (path instanceof File) {
            return path.name
        } else if (GoogleUtils.isGoogleDriveURL(path)) {
            const info = await GoogleDrive.getDriveFileInfo(path)
            return info.name || info.originalFileName
        } else {
            const result = URIUtils.parseUri(path)
            return result.file;
        }

    }

    static isGoogleDrivePath(path) {
        return path instanceof File ? false : GoogleUtils.isGoogleDriveURL( path )
    }

}

const configureSelectOnChange = ($select, $selectModal, fileLoader) => {

    $select.on('change', event => {

        event.stopPropagation();

        let url = $select.val();
        url = url || '';

        const index = $select.get(0).selectedIndex;
        const option = $select.get(0)[ index ];
        const name = $(option).text();

        if ('' !== url) {
            fileLoader(url);
        }

        const $option = $select.find('option:first');
        $select.val( $option.val() );

        $selectModal.modal('hide');

    });

};

export default SpacewalkFileLoad
