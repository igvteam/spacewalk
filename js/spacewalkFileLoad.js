import { FileUtils, URIUtils, GooglePicker, GoogleUtils, GoogleDrive } from 'igv-utils'
import {GenericDataSource, ModalTable} from 'data-modal'
import { appendAndConfigureLoadURLModal } from './app.js'
import {gsdbDatasourceConfigurator} from './gsdbDatasourceConfig.js'

let gsdbModal = undefined

function createSpacewalkFileLoaders ({ rootContainer, localFileInput, urlLoadModalId, gsdbModalId, dropboxButton, googleDriveButton, googleEnabled, fileLoader }) {

    localFileInput.addEventListener('change', async () => {
        const file = localFileInput.files[ 0 ];
        localFileInput.value = '';
        await fileLoader.load(file);
    });

    appendAndConfigureLoadURLModal(rootContainer, urlLoadModalId, async path => {

        const name = FileUtils.getFilename(path);
        await fileLoader.load(path);
    })

    const gsdbModalConfig =
        {
            id: gsdbModalId,
            title: 'GSDB',
            selectionStyle: 'single',
            pageLength: 100,
            datasource: new GenericDataSource(gsdbDatasourceConfigurator('https://calla.rnet.missouri.edu/genome3d/GSDB/GSDB_JSON_URL_LIST.txt')),
            okHandler: (selections) => {

                if (selections.length > 0) {
                    let { name, url } = selections[ 0 ]
                    url = `https://${ url }`
                    fileLoader.load(url)
                }
            }
        };

    gsdbModal = new ModalTable(gsdbModalConfig)

    const $selectModal = $(select_modal)
    $(rootContainer).append($selectModal)


    $selectModal.find('select').selectpicker();

    configureSelectOnChange($selectModal.find('select'), $selectModal, async path => {

        const name = FileUtils.getFilename(path);
        await fileLoader.load(path);
    });

    dropboxButton.addEventListener('click', () => {

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
        googleDriveButton.parentNode.style.display = 'none';
    }

    if (true === googleEnabled) {

        googleDriveButton.addEventListener('click', () => {

            GooglePicker.createDropdownButtonPicker(false, async responses => {

                const paths = responses.map(({ name, url }) => url)
                const path = paths[ 0 ]

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
                                <option value="https://www.dropbox.com/s/o61ix7cnnfxvylm/A549_chr21-28-30Mb.sw?dl=0">A549 chr21:28-30</option>
                                <option value="https://www.dropbox.com/s/xw1n2vpt4ohppw2/HCT116_chr21-28-30Mb_6h_auxin.sw?dl=0">HCT116 6h_auxin chr21:28-30</option>
                                <option value="https://www.dropbox.com/s/lf4s45fwcdu5wfn/HCT116_chr21-28-30Mb_untreated.sw?dl=0">HCT116 untreated chr21:28-30</option>
                                <option value="https://www.dropbox.com/s/7wfnkgd7kej4aub/IMR90_chr21-18-20Mb.sw?dl=0">IMR90 chr21:18-20</option>
                                <option value="https://www.dropbox.com/s/wyhuv5frqo0q5gb/IMR90_chr21-28-30Mb.sw?dl=0">IMR90 chr21:28-30</option>
                                <option value="https://www.dropbox.com/s/fkqk2mtl20inicl/K562_chr21-28-30Mb.sw?dl=0">K562 chr21:28-30</option>
<!--                                <option value="https://www.dropbox.com/s/dzsmcn8yu9zrv2q/Nir%20et%20al.bed?dl=0">Nir et al</option>-->
                            </select>
                        </div>
                    </div>
                </div>

            </div>

        </div>

    </div>`

function createSelectModal() {

}

export { createSpacewalkFileLoaders }
