import {GenericDataSource, ModalTable} from 'data-modal'
import {FileUtils} from 'igv-utils'
import {aidenLabContactMapDatasourceConfigurator} from './aidenLabContactMapDatasourceConfig.js'
import { createAndConfigureURLLoadModal } from '../spacewalkFileLoadWidgetServices.js'

let mapType = undefined;
let encodeHostedContactMapModal;
let contactMapModal;
let urlModal
const encodeContactMapDatasourceConfiguration =
    {
        url: 'https://s3.amazonaws.com/igv.org.app/encode/hic/hic.txt',
        columns:
            [
                // 'HREF',
                'Assembly',
                'Biosample',
                'Description',
                'BioRep',
                'TechRep',
                'Lab',
                'Accession',
                'Experiment'
            ],
    }

function configureContactMapLoaders({
                                        rootContainer,
                                        localFileInput,
                                        urlLoadModalId,
                                        dataModalId,
                                        encodeHostedModalId,
                                        dropboxButton,
                                        mapMenu,
                                        loadHandler
                                    }) {

    mapType = 'contact-map'

    localFileInput.addEventListener('change', async e => {

        const file = this.files[0]

        this.value = ""

        const { name } = file
        await loadHandler(file, name, mapType)
    });

    dropboxButton.addEventListener('click', function () {

        const config =
            {
                success: async (dbFiles) => {
                    const paths = dbFiles.map(dbFile => dbFile.link);
                    const path = paths[0];
                    const name = FileUtils.getFilename(path);
                    await loadHandler(path, name, mapType);
                },
                cancel: () => {},
                linkType: 'preview',
                multiselect: false,
                folderselect: false,
            };

        Dropbox.choose(config);
    });

    urlModal = createAndConfigureURLLoadModal(rootContainer, urlLoadModalId, path => {
        const name = FileUtils.getFilename(path);
        loadHandler(path, name, mapType);
    });

    if (mapMenu) {

        const modalTableConfig =
            {
                id: dataModalId,
                parent: rootContainer,
                title: 'Contact Map',
                selectionStyle: 'single',
                pageLength: 10,
                okHandler: async ([selection]) => {
                    const {url, name} = selection
                    await loadHandler(url, name, mapType)
                }
            }
        contactMapModal = new ModalTable(modalTableConfig)

        const {items: path} = mapMenu
        const config = aidenLabContactMapDatasourceConfigurator(path)
        const datasource = new GenericDataSource(config)
        contactMapModal.setDatasource(datasource)
    }


    const encodeModalTableConfig =
        {
            id: encodeHostedModalId,
            parent: rootContainer,
            title: 'ENCODE Hosted Contact Map',
            selectionStyle: 'single',
            pageLength: 10,
            okHandler: async ([{HREF, Description}]) => {
                const urlPrefix = 'https://www.encodeproject.org'
                const path = `${urlPrefix}${HREF}`
                await loadHandler(path, Description, mapType)
            }
        }

    encodeHostedContactMapModal = new ModalTable(encodeModalTableConfig)

    const datasource = new GenericDataSource(encodeContactMapDatasourceConfiguration)
    encodeHostedContactMapModal.setDatasource(datasource)

}

export default configureContactMapLoaders
