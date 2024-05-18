import {FileUtils, URIUtils, GooglePicker, GoogleUtils, GoogleDrive} from 'igv-utils'
import {GenericDataSource, ModalTable} from 'data-modal'
import {appendAndConfigureLoadURLModal, ensembleManager, sceneManager} from './app.js'
import {gsdbDatasourceConfigurator} from './gsdbDatasourceConfig.js'
import SpacewalkEventBus from './spacewalkEventBus.js'

let gsdbModal = undefined

function createSpacewalkFileLoaders ({ rootContainer, localFileInput, urlLoadModalId, gsdbModalId, dropboxButton, googleDriveButton, googleEnabled, fileLoader }) {

    localFileInput.addEventListener('change', async () => {
        const [ file ] = localFileInput.files
        localFileInput.value = ''
        await fileLoader.load(file)
    });

    appendAndConfigureLoadURLModal(rootContainer, urlLoadModalId, async path => await fileLoader.load(path))

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

    // select from cndb replica list
    const ensembleGroupModalElement = createEnsembleGroupSelectDOMElement()
    rootContainer.appendChild(ensembleGroupModalElement)

    const ensembleGroupSelectElement = ensembleGroupModalElement.querySelector('select')
    $(ensembleGroupSelectElement).selectpicker()

    ensembleGroupSelectElement.addEventListener('change', async event => {

        event.stopPropagation()

        $(ensembleGroupModalElement).modal('hide')

        await sceneManager.ingestEnsembleGroup(ensembleGroupSelectElement.value)

        const data = ensembleManager.createEventBusPayload()
        SpacewalkEventBus.globalBus.post({ type: "DidLoadEnsembleFile", data })

    })

    const ensembleGroupHandler = ({ data }) => {

        // discard pre-exisiting option elements
        ensembleGroupSelectElement.innerHTML = ''

        for (const key of data ) {
            const html = `<option value=\"${ key }\">${ key }</option>`
            const fragment = document.createRange().createContextualFragment(html)
            ensembleGroupSelectElement.appendChild(fragment.firstChild)
        }

        $(ensembleGroupSelectElement).selectpicker('destroy')
        $(ensembleGroupSelectElement).selectpicker('render')
    }

    SpacewalkEventBus.globalBus.subscribe('DidLoadCNDBFile', ensembleGroupHandler)
    SpacewalkEventBus.globalBus.subscribe('DidLoadSWBEnsembleGroup', ensembleGroupHandler)

    // select from list
    const $selectModal = $(select_modal)
    $(rootContainer).append($selectModal)
    $selectModal.find('select').selectpicker()

    configureSelectOnChange($selectModal.find('select'), $selectModal, async path => await fileLoader.load(path))

    dropboxButton.addEventListener('click', () => {

        const config =
            {
                success: async dbFiles => {

                    const paths = dbFiles.map(dbFile => dbFile.link)
                    const [ path ] = paths
                    await fileLoader.load(path)
                },
                cancel: () => {},
                linkType: 'preview',
                multiselect: false,
                folderselect: false,
            };

        Dropbox.choose( config );

    });

    if (false === googleEnabled) {
        googleDriveButton.parentNode.style.display = 'none';
    }

    if (true === googleEnabled) {

        googleDriveButton.addEventListener('click', () => {

            GooglePicker.createDropdownButtonPicker(false, async responses => {

                const paths = responses.map(({ name, url }) => url)
                const [ path ] = paths

                const name = await SpacewalkGetFilename(path)
                const extension = FileUtils.getExtension(name)

                await fileLoader.load(path)

            });

        });
    }

}

async function SpacewalkGetFilename(path){

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

function createEnsembleGroupSelectDOMElement() {

    const html =
        `<div id="spacewalk-ensemble-group-select-modal" class="modal fade">

        <div class="modal-dialog">

            <div class="modal-content">

                <div class="modal-header">

                    <div class="modal-title">Ensemble Group Selection</div>

                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>

                </div>

                <div class="modal-body">
                    <div>
                        <div class="input-group my-3">

                            <div class="spinner-border" style="display: none;">
                            </div>

                            <select data-live-search="true" title="Select an ensemble group" data-width="100%">
                            </select>
                        </div>
                    </div>
                </div>

            </div>

        </div>

    </div>`

    const fragment = document.createRange().createContextualFragment(html)

    return fragment.firstChild
}

const select_modal =
    `<div id="spacewalk-sw-load-select-modal" class="modal fade">

        <div class="modal-dialog">

            <div class="modal-content">

                <div class="modal-header">

                    <div class="modal-title">Select File</div>

                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>

                </div>

                <div class="modal-body">
                    <div>
                        <div class="input-group my-3">

                            <div class="spinner-border" style="display: none;">
                                <!-- spinner border-radius: .25rem; -->
                            </div>
                            <select data-live-search="true" title="Select an ensemble" data-width="100%">
                                <option value="https://www.dropbox.com/scl/fi/slx5xkk540i8si7wr6tv5/A549_chr21-28-30Mb.sw?rlkey=mufheyn60384w0hemlknm53ad&dl=0">A549 chr21:28-30</option>
                                <option value="https://www.dropbox.com/scl/fi/6by67mrc3ywm646j6zm8f/HCT116_chr21-28-30Mb_6h_auxin.sw?rlkey=0zrb50erkuznyxvv0fnfzfy48&dl=0">HCT116 6h_auxin chr21:28-30</option>
                                <option value="https://www.dropbox.com/scl/fi/sl5q79az2r7sdxtaz6j0g/HCT116_chr21-28-30Mb_untreated.sw?rlkey=8tjwzsgtybwlukyfrt0s5aa5e&dl=0">HCT116 untreated chr21:28-30</option>
                                <option value="https://www.dropbox.com/scl/fi/e5hcmfp8a5uzghytdbxwr/IMR90_chr21-18-20Mb.sw?rlkey=6qr9rekct5vc8e3a5c8g2mg3o&dl=0">IMR90 chr21:18-20</option>
                                <option value="https://www.dropbox.com/scl/fi/295mfufin32ps41ejffxw/IMR90_chr21-28-30Mb.sw?rlkey=q0lxcfccr4mbh3jtzj8hwuwr7&dl=0">IMR90 chr21:28-30</option>
                                <option value="https://www.dropbox.com/scl/fi/xukd5fxx99syofnrag9zr/K562_chr21-28-30Mb.sw?rlkey=mzbpzf5o72gusgfzqlpye0h5u&dl=0">K562 chr21:28-30</option>
                            </select>
                        </div>
                    </div>
                </div>

            </div>

        </div>

    </div>`

function configureSelectOnChange($select, $selectModal, fileLoader) {

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

}

export { createSpacewalkFileLoaders }
