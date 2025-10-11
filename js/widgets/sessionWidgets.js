import { FileUtils } from 'igv-utils'
import * as Utils from './utils.js'
import FileLoadManager from './fileLoadManager.js'
import FileLoadWidget from './fileLoadWidget.js'
import SessionFileLoad from "./sessionFileLoad.js"
import { createURLModalElement } from './urlModal.js'
import {dropboxDropdownItem, googleDriveDropdownItem} from "./markupFactory.js"

let fileLoadWidget
let sessionWidgetModal
let saveSessionModal

function createSessionWidgets(rootContainer,
                              prefix,
                              localFileInputId,
                              initializeDropbox,
                              dropboxButtonId,
                              googleDriveButtonId,
                              urlModalId,
                              sessionSaveModalId,
                              googleEnabled,
                              loadHandler,
                              JSONProvider) {

    // Session - Dropbox and Google Drive buttons
    $('div#spacewalk-session-dropdown-menu > :nth-child(1)').after(dropboxDropdownItem('igv-main-dropdown-dropbox-session-file-button'));
    $('div#spacewalk-session-dropdown-menu > :nth-child(2)').after(googleDriveDropdownItem('igv-main-dropdown-google-drive-session-file-button'));

    const urlModalElement = createURLModalElement(urlModalId, 'Session URL')
    rootContainer.appendChild(urlModalElement)

    if (!googleEnabled) {
        document.querySelector(`#${googleDriveButtonId}`).parentElement.style.display = 'none'
    }

    const fileLoadWidgetConfig = {
        widgetParent: urlModalElement.querySelector('.modal-body'),
        dataTitle: 'Session',
        indexTitle: undefined,
        mode: 'url',
        fileLoadManager: new FileLoadManager(),
        dataOnly: true,
        doURL: undefined
    }

    fileLoadWidget = new FileLoadWidget(fileLoadWidgetConfig)

    const sessionFileLoadConfig = {
        localFileInput: document.querySelector(`#${localFileInputId}`),
        initializeDropbox,
        dropboxButton: dropboxButtonId ? document.querySelector(`#${dropboxButtonId}`) : undefined,
        googleEnabled,
        googleDriveButton: document.querySelector(`#${googleDriveButtonId}`),
        loadHandler
    }

    const sessionFileLoad = new SessionFileLoad(sessionFileLoadConfig)

    sessionWidgetModal = new bootstrap.Modal(urlModalElement)
    Utils.configureModal(fileLoadWidget, sessionWidgetModal, async fileLoadWidget => {
        await sessionFileLoad.loadPaths(fileLoadWidget.retrievePaths())
        return true
    })

    saveSessionModal = configureSaveSessionModal(rootContainer, prefix, JSONProvider, sessionSaveModalId)
}

function configureSaveSessionModal(rootContainer, prefix, JSONProvider, sessionSaveModalId) {

    const html =
        `<div id="${sessionSaveModalId}" class="modal fade">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="${sessionSaveModalId}Label">Save Session File</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <input class="form-control" type="text" placeholder="igv-main-session.json" aria-label="Session filename">
                <div>Enter session filename with .json suffix</div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-sm btn-secondary">OK</button>
            </div>
        </div>
    </div>
</div>`;

    const fragment = document.createRange().createContextualFragment(html)
    const modalElement = fragment.firstChild

    rootContainer.appendChild(modalElement)

    const modal = new bootstrap.Modal(modalElement)

    const inputElement = modalElement.querySelector('input')

    modalElement.addEventListener('show.bs.modal', () => {
        inputElement.value = `${prefix}-session.json`
    })

    const okHandler = () => {
        const extensions = new Set(['json', 'xml'])
        let filename = inputElement.value

        if (filename === undefined || filename === '') {
            filename = inputElement.placeholder
        } else if (!extensions.has(FileUtils.getExtension(filename))) {
            filename = filename + '.json'
        }

        const json = JSONProvider()

        if (json) {
            const jsonString = JSON.stringify(json, null, '\t')
            const data = URL.createObjectURL(new Blob([jsonString], { type: "application/octet-stream" }))
            FileUtils.download(filename, data)
            modal.hide()
        } else {
            modal.hide()
            const str = `Warning! Unable to save session. Local files not supported.`
            console.warn(str)
            alert(str)
        }

    }

    const okElement = modalElement.querySelector('.modal-footer button:nth-child(2)')
    okElement.addEventListener('click', okHandler)

    inputElement.addEventListener('keyup', e => {
        if (e.keyCode === 13) {
            okHandler()
        }
    })

    return modal
}

export { createSessionWidgets }
