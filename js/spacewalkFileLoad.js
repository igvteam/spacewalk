import hic from '../node_modules/juicebox.js/dist/juicebox.esm.js';
import { GoogleFilePicker } from '../node_modules/igv-widgets/dist/igv-widgets.js';
import { FileUtils } from '../node_modules/igv-utils/src/index.js';
import { appendAndConfigureLoadURLModal } from "./app.js";
``
class SpacewalkFileLoad {

    constructor({ rootContainer, $localFileInput, urlLoadModalId, $selectModal, $dropboxButton, $googleDriveButton, googleEnabled, fileLoader }) {

        $localFileInput.on('change', async function (e) {
            const file = ($localFileInput.get(0).files)[ 0 ];
            $localFileInput.val('');
            await fileLoader.load(file);
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

                GoogleFilePicker.createDropdownButtonPicker(false, async responses => {

                    const paths = responses.map(({ name, url }) => { return { url: hic.igv.google.driveDownloadURL(url), name }; });

                    let { name, url } = paths[ 0 ];
                    await fileLoader.load(url);

                });

            });
        }

        appendAndConfigureLoadURLModal(rootContainer, urlLoadModalId, async path => {

            const name = FileUtils.getFilename(path);
            await fileLoader.load(path);
        });

        configureSelectOnChange($selectModal.find('select'), $selectModal, async path => {

            const name = FileUtils.getFilename(path);
            await fileLoader.load(path);
        });

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
