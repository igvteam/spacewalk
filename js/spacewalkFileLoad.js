import {FileUtils, URIUtils, GooglePicker, GoogleUtils, GoogleDrive} from 'igv-utils'
import {ensembleManager, sceneManager} from './app.js'
import SpacewalkEventBus from './spacewalkEventBus.js'

let urlModal
let traceSelectModal
let ensembleGroupModal

function createSpacewalkFileLoaders ({ rootContainer, localFileInput, urlLoadModalId, traceModalId, ensembleGroupModalId, dropboxButton, googleDriveButton, googleEnabled, fileLoader }) {

    // local file
    localFileInput.addEventListener('change', async () => {
        const [ file ] = localFileInput.files
        localFileInput.value = ''
        await fileLoader.load(file)
    });

    // URL
    urlModal = createAndConfigureLoadURLModal(rootContainer, urlLoadModalId, async path => await fileLoader.load(path))

    // trace from select list
    const traceSelectModalElement = createTraceSelectModalElement(traceModalId)
    rootContainer.appendChild(traceSelectModalElement)
    traceSelectModal = new bootstrap.Modal(traceSelectModalElement)

    configureSelectOnChange(traceSelectModalElement.querySelector('select'), traceSelectModal, async path => await fileLoader.load(path))

    // Ensemble group from select list
    const ensembleGroupModalElement = createEnsembleGroupModalElement(ensembleGroupModalId)
    rootContainer.appendChild(ensembleGroupModalElement)
    ensembleGroupModal = new bootstrap.Modal(ensembleGroupModalElement)

    const ensembleGroupSelectElement = ensembleGroupModalElement.querySelector('select')

    ensembleGroupSelectElement.addEventListener('change', async event => {

        event.stopPropagation()

        ensembleGroupModal.hide()

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
    }

    SpacewalkEventBus.globalBus.subscribe('DidLoadCNDBFile', ensembleGroupHandler)
    SpacewalkEventBus.globalBus.subscribe('DidLoadSWBEnsembleGroup', ensembleGroupHandler)

    // Dropbox
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

    // Google Drive
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

function createEnsembleGroupModalElement(ensembleGroupModalId) {

    const html =
        `<div id="${ ensembleGroupModalId }" class="modal fade">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">Ensemble Group Selection</div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div>
                        <div class="input-group my-3">
                            <div class="spinner-border" style="display: none;"></div>
                            <select class="form-select" data-live-search="true" title="Select an ensemble group" data-width="100%"></select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    const fragment = document.createRange().createContextualFragment(html)

    return fragment.firstChild
}

function createTraceSelectModalElement(traceModalId) {

    const html =
        `<div id="${traceModalId}" class="modal fade">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">Select File</div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div>
                        <div class="input-group my-3">
                            <div class="spinner-border" style="display: none;">
                                <!-- spinner border-radius: .25rem; -->
                            </div>
                            <select class="form-select" data-live-search="true" title="Select an ensemble" data-width="100%">
                                <option value="https://www.dropbox.com/scl/fi/slx5xkk540i8si7wr6tv5/A549_chr21-28-30Mb.sw?rlkey=mufheyn60384w0hemlknm53ad&st=gnhzxw34&dl=0">A549 chr21:28-30</option>
                                <option value="https://www.dropbox.com/scl/fi/6by67mrc3ywm646j6zm8f/HCT116_chr21-28-30Mb_6h_auxin.sw?rlkey=0zrb50erkuznyxvv0fnfzfy48&st=zbir0o2m&dl=0">HCT116 6h_auxin chr21:28-30</option>
                                <option value="https://www.dropbox.com/scl/fi/sl5q79az2r7sdxtaz6j0g/HCT116_chr21-28-30Mb_untreated.sw?rlkey=8tjwzsgtybwlukyfrt0s5aa5e&st=lrcsoowv&dl=0">HCT116 untreated chr21:28-30</option>
                                <option value="https://www.dropbox.com/scl/fi/e5hcmfp8a5uzghytdbxwr/IMR90_chr21-18-20Mb.sw?rlkey=6qr9rekct5vc8e3a5c8g2mg3o&st=7imvnbq1&dl=0">IMR90 chr21:18-20</option>
                                <option value="https://www.dropbox.com/scl/fi/295mfufin32ps41ejffxw/IMR90_chr21-28-30Mb.sw?rlkey=q0lxcfccr4mbh3jtzj8hwuwr7&st=8f8d1n2k&dl=0">IMR90 chr21:28-30</option>
                                <option value="https://www.dropbox.com/scl/fi/xukd5fxx99syofnrag9zr/K562_chr21-28-30Mb.sw?rlkey=mzbpzf5o72gusgfzqlpye0h5u&st=lfvf6s09&dl=0">K562 chr21:28-30</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    const fragment = document.createRange().createContextualFragment(html)

    return fragment.firstChild

}

function configureSelectOnChange(select, selectModal, fileLoader) {

    select.addEventListener('change', event => {

        event.stopPropagation();

        let selectElement = event.target;
        let url = selectElement.value || '';

        const index = selectElement.selectedIndex;
        const option = selectElement.options[index];
        const name = option.textContent;

        if (url !== '') {
            fileLoader(url);
        }

        selectElement.value = selectElement.options[0].value;

        selectModal.hide();

    });

}


function createAndConfigureLoadURLModal(root, id, input_handler) {

    const html =
        `<div id="${id}" class="modal fade">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">Load URL</div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <input type="text" class="form-control" placeholder="Enter URL">
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

    root.insertAdjacentHTML('beforeend', html);

    const modalElement = document.getElementById(id);
    const inputElement = modalElement.querySelector('input');

    inputElement.addEventListener('change', function () {
        const path = inputElement.value;
        inputElement.value = "";

        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();

        input_handler(path);
    });

    return new bootstrap.Modal(modalElement)
}

export { createSpacewalkFileLoaders, createAndConfigureLoadURLModal }
