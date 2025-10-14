import AlertSingleton from './alertSingleton.js'
import * as DOMUtils from "./utils/dom-utils.js"

class FileLoad {

    constructor({localFileInput, initializeDropbox, dropboxButton}) {

        localFileInput.addEventListener('change', async () => {

            if (true === FileLoad.isValidLocalFileInput(localFileInput)) {

                try {
                    await this.loadPaths(Array.from(localFileInput.files))
                } catch (e) {
                    console.error(e)
                    AlertSingleton.present(e)
                }
                localFileInput.value = ''
            }

        })

        if (dropboxButton) dropboxButton.addEventListener('click', async () => {

            const result = await initializeDropbox()

            if (true === result) {

                const config =
                    {
                        success: async dbFiles => {
                            try {
                                await this.loadPaths(dbFiles.map(dbFile => dbFile.link))
                            } catch (e) {
                                console.error(e)
                                AlertSingleton.present(e)
                            }
                        },
                        cancel: () => {
                        },
                        linkType: 'preview',
                        multiselect: true,
                        folderselect: false,
                    }

                Dropbox.choose(config)

            } else {
                AlertSingleton.present('Cannot connect to Dropbox')
            }

        })

    }

    async loadPaths(paths) {
        //console.log('FileLoad: loadPaths(...)');
    }

    static isValidLocalFileInput(input) {
        return (input.files && input.files.length > 0)
    }

}

export default FileLoad
