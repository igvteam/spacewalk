import igv from '../../node_modules/igv/dist/igv.esm.js';
import { GoogleFilePicker } from '../../node_modules/igv-widgets/dist/igv-widgets.js';
import ModalTable from '../../node_modules/data-modal/js/modalTable.js';
import { FileUtils } from '../../node_modules/igv-utils/src/index.js';
import ContactMapDatasource from "./contactMapDatasource.js";
import { appendAndConfigureLoadURLModal } from "../app.js";

let mapType = undefined;
let contactMapDatasource = undefined;

class ContactMapLoad {

    constructor({ rootContainer, $dropdowns, $localFileInputs, urlLoadModalId, dataModalId, $dropboxButtons, $googleDriveButtons, googleEnabled, contactMapMenu, loadHandler }) {

        $dropdowns.on('show.bs.dropdown', function () {

            // Contact or Control dropdown button
            const $child = $(this).children('.dropdown-toggle');

            // button id
            const id = $child.attr('id');

            // Set map type based on dropdown selected
            mapType = 'hic-contact-map-dropdown' === id ? 'contact-map' : 'control-map';

        });

        $localFileInputs.on('change', async function (e) {
            const file = ($(this).get(0).files)[ 0 ];
            $(this).val("");

            const { name } = file;
            await loadHandler(file, name, mapType);
        });

        $dropboxButtons.on('click', () => {

            const config =
                {
                    success: async dbFiles => {
                        const paths = dbFiles.map(dbFile => dbFile.link);
                        const path = paths[ 0 ];
                        const name = FileUtils.getFilename(path);
                        await loadHandler(path, name, mapType);
                    },
                    cancel: () => {},
                    linkType: 'preview',
                    multiselect: false,
                    folderselect: false,
                };

            Dropbox.choose( config );

        });

        if (false === googleEnabled) {
            $googleDriveButtons.parent().hide();
        }

        if (true === googleEnabled) {
            $googleDriveButtons.on('click', () => {

                GoogleFilePicker.createDropdownButtonPicker(false, async responses => {

                    const paths = responses.map(({ name, url }) => { return { url: igv.google.driveDownloadURL(url), name }; });

                    let { name, url: path } = paths[ 0 ];
                    await loadHandler(path, name);

                });

            });
        }

        appendAndConfigureLoadURLModal(rootContainer, urlLoadModalId, path => {
            const name = FileUtils.getFilename(path);
            loadHandler( path, name, mapType );
        });

        if (contactMapMenu) {

            this.contactMapModal = new ModalTable({ id: dataModalId, title: 'Contact Map', selectionStyle: 'single', pageLength: 100 });

            const { items: path } = contactMapMenu;
            contactMapDatasource = new ContactMapDatasource(path);

            this.contactMapModal.setDatasource(contactMapDatasource);

            this.contactMapModal.selectHandler = async selectionList => {
                const { url, name } = contactMapDatasource.tableSelectionHandler(selectionList);
                await loadHandler(url, name, mapType);
            };
        }

    }
}

export default ContactMapLoad
