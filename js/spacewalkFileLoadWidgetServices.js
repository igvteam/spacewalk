import {FileUtils, URIUtils, GooglePicker, GoogleUtils, GoogleDrive} from 'igv-utils'
import {ensembleManager, sceneManager} from './main.js'
import SpacewalkEventBus from './spacewalkEventBus.js'

let traceURLlModal
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
    traceURLlModal = createAndConfigureURLLoadModal(rootContainer, urlLoadModalId, async path => await fileLoader.load(path))

    // trace from select list
    traceSelectModal = createAndConfigureTraceSelectModal(rootContainer, traceModalId, async path => await fileLoader.load(path))

    // Ensemble group from select list
    ensembleGroupModal = createAndConfigureEnsembleGroupSelectModal(rootContainer, ensembleGroupModalId)

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

function createAndConfigureTraceSelectModal(parentElement, traceModalId, fileLoader) {

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
                                <option value="" disabled selected hidden>Please select</option>
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

    const traceSelectModalElement =  fragment.firstChild

    parentElement.appendChild(traceSelectModalElement)

    const modal = new bootstrap.Modal(traceSelectModalElement)

    const selectElement = traceSelectModalElement.querySelector('select')

    selectElement.addEventListener('change', event => {

        event.stopPropagation()

        if ('' !== selectElement.value) {
            fileLoader(selectElement.value);
        }

        modal.hide();

    })

    return modal

}

function createAndConfigureEnsembleGroupSelectModal(parentElement, ensembleGroupModalId) {

    const modalElement = createEnsembleGroupModalElement(ensembleGroupModalId)
    parentElement.appendChild(modalElement)

    const modal = new bootstrap.Modal(modalElement)

    const selectElement = modalElement.querySelector('select')

    selectElement.addEventListener('change', async event => {

        event.stopPropagation()

        modal.hide()

        await sceneManager.ingestEnsembleGroup(selectElement.value)

        const data = ensembleManager.createEventBusPayload()

        SpacewalkEventBus.globalBus.post({ type: "DidLoadEnsembleFile", data })

    })

    const loadEventHandler = ({ data }) => {

        // discard pre-exisiting option elements
        selectElement.innerHTML = ''

        selectElement.appendChild(createPlaceholderOptionElement())

        // sort
        const sorted = data.sort((a, b) => {
            // Extract the first number after the initial string
            const firstNumberA = parseInt(a.match(/^\D+(\d+)/)?.[1] || 0, 10);
            const firstNumberB = parseInt(b.match(/^\D+(\d+)/)?.[1] || 0, 10);

            // Extract the second number, whether it's foo23, foo_23, or foo_03
            const secondNumberA = parseInt(a.match(/\D(\d+)$/)?.[1] || 0, 10);
            const secondNumberB = parseInt(b.match(/\D(\d+)$/)?.[1] || 0, 10);

            // Sort by the first number, then by the second number
            return firstNumberA - firstNumberB || secondNumberA - secondNumberB;
        });

        for (const key of sorted ) {
            const html = `<option value=\"${ key }\">${ key }</option>`
            const fragment = document.createRange().createContextualFragment(html)
            selectElement.appendChild(fragment.firstChild)
        }
    }

    SpacewalkEventBus.globalBus.subscribe('DidLoadCNDBFile', loadEventHandler)
    SpacewalkEventBus.globalBus.subscribe('DidLoadSWBEnsembleGroup', loadEventHandler)

    return modal
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

function createPlaceholderOptionElement() {
    const placeholderOption = document.createElement('option')
    placeholderOption.text = 'Please select'
    placeholderOption.disabled = true
    placeholderOption.selected = true
    placeholderOption.hidden = true
    return placeholderOption
}

function createAndConfigureURLLoadModal(root, id, input_handler) {

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

export { createSpacewalkFileLoaders, createAndConfigureURLLoadModal }
