import hic from '../../node_modules/juicebox.js/dist/juicebox.esm.js';
import { GoogleFilePicker } from '../../node_modules/igv-widgets/dist/igv-widgets.js';
import FilteredModalTable from '../filteredModalTable.js';
import { FileUtils } from '../../node_modules/igv-utils/src/index.js';
import ContactMapDatasource from "./contactMapDatasource.js";
import { eventBus, appendAndConfigureLoadURLModal } from "../app.js";

let mapType = undefined;

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

                    const paths = responses.map(({ name, url }) => { return { url: hic.igv.google.driveDownloadURL(url), name }; });

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

            this.contactMapModal = new FilteredModalTable({ id: dataModalId, title: 'Contact Map', selectionStyle: 'single', pageLength: 100 });

            const { items: path } = contactMapMenu;
            this.contactMapModal.setDatasource(new ContactMapDatasource(path));

            this.contactMapModal.selectHandler = async selectionList => {
                const { url, name } = this.contactMapModal.datasource.tableSelectionHandler(selectionList);
                await loadHandler(url, name, mapType);
            };
        }

        eventBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ data }) {
        const { genomeAssembly } = data;
        this.contactMapModal.referenceGenome = genomeAssembly;
        this.contactMapModal.removeTable();
    }

}

export default ContactMapLoad
