import { Utils, FileLoadManager, FileLoadWidget, MultipleTrackFileLoad } from '../../node_modules/igv-widgets/dist/igv-widgets.js';
import { Alert } from '../../node_modules/igv-ui/src/index.js';
import EncodeDataSource from '../../node_modules/data-modal/js/encodeDataSource.js';
import { igvPanel } from "../app.js";

class TrackLoadController {

    constructor({ browser, trackRegistryFile, trackLoadModal, multipleTrackFileLoad, encodeModalTable }) {

        this.browser = browser;
        this.trackRegistryFile = trackRegistryFile;
        this.encodeModalTable = encodeModalTable;

        const config =
            {
                widgetParent: trackLoadModal.querySelector('.modal-body'),
                dataTitle: 'Track',
                indexTitle: 'Track Index',
                mode: 'url',
                fileLoadManager: new FileLoadManager(),
                dataOnly: false,
                doURL: true
            };

        this.urlWidget = new FileLoadWidget(config);

        Utils.configureModal(this.urlWidget, trackLoadModal, async fileLoadWidget => {
            await multipleTrackFileLoad.loadPaths(fileLoadWidget.retrievePaths());
            return true;
        });

    }

    async updateTrackMenus(browser, genomeID, trackRegistryFile, dropdownMenu, selectModal) {

        const id_prefix = 'genome_specific_';

        const $dropdownMenu = $(dropdownMenu);

        const $found = $dropdownMenu.find("[id^='genome_specific_']");
        $found.remove();

        this.trackRegistry = undefined;
        try {
            this.trackRegistry = await this.getTrackRegistry(trackRegistryFile);
        } catch (e) {
            Alert.presentAlert(e.message);
        }

        if (undefined === this.trackRegistry) {
            const e = new Error("Error retrieving registry via getTrackRegistry function");
            Alert.presentAlert(e.message);
            throw e;
        }

        const paths = this.trackRegistry[ genomeID ];

        if (undefined === paths) {
            console.warn(`There are no tracks in the track registryy for genome ${ genomeID }`);
            return;
        }

        let responses = [];
        try {
            responses = await Promise.all( paths.map( path => fetch(path) ) )
        } catch (e) {
            Alert.presentAlert(e.message);
        }

        let jsons = [];
        try {
            const promises = responses.map( response => response.json() );
            jsons = await Promise.all( promises )
        } catch (e) {
            Alert.presentAlert(e.message);
        }

        let buttonConfigurations = [];

        for (let json of jsons) {

            if ('ENCODE' === json.type) {
                this.createEncodeTable(json.genomeID);
                buttonConfigurations.push(json);
            } else {
                buttonConfigurations.push(json);
            }


        }

        const $divider = $dropdownMenu.find('.dropdown-divider');

        buttonConfigurations = buttonConfigurations.reverse();
        for (let { label, type, description, tracks } of buttonConfigurations) {

            const $button = $('<button>', { class:'dropdown-item', type:'button' });
            $button.text(`${ label}...`);
            $button.attr('id', `${ id_prefix }${ label.toLowerCase().split(' ').join('_') }`);

            $button.insertAfter($divider);

            $button.on('click', () => {

                if ('ENCODE' === type) {

                    this.encodeModalTable.$modal.modal('show');

                } else {

                    let markup = '<div>' + label + '</div>';

                    if (description) {
                        markup += '<div>' + description + '</div>';
                    }

                    const $modal = $(selectModal);

                    $modal.find('#igv-app-generic-track-select-modal-label').html(markup);

                    configureModalSelectList(browser, $modal, tracks);

                    $modal.modal('show');

                }

            });

        }


    };

    createEncodeTable(genomeID) {
        const datasource = new EncodeDataSource(genomeID);
        this.encodeModalTable.setDatasource(datasource)
    };

    async getTrackRegistry(trackRegistryFile) {

        let response = undefined;

        try {
            response = await fetch(trackRegistryFile);
        } catch (e) {
            console.error(e);
        }

        if (response) {
            return await response.json();
        } else {
            return undefined;
        }

    }

}

function configureModalSelectList(browser, $selectModal, tracks) {

    let $found;

    $found = $selectModal.find('select');
    $found.remove();

    const $select = $('<select>', { class: 'form-control' });
    $found = $selectModal.find('.form-group');
    $found.append($select);

    let $option;

    $option = $('<option>', {text: 'Select...'});
    $select.append($option);

    $option.attr('selected', 'selected');
    $option.val(undefined);

    tracks.reduce(($accumulator, configuration) => {

        $option = $('<option>', {value: configuration.name, text: configuration.name});
        $select.append($option);

        $option.data('track', configuration);

        $accumulator.append($option);

        return $accumulator;
    }, $select);

    $select.on('change', () => {

        let $option = $select.find('option:selected');
        const value = $option.val();

        if ('' === value) {
            // do nothing
        } else {

            $option.removeAttr("selected");

            const configuration = $option.data('track');
            igvPanel.loadTrack(configuration);
        }

        $selectModal.modal('hide');

    });

}

export default TrackLoadController;
