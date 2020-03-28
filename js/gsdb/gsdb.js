import ModalTable from '../../node_modules/data-modal/js/modalTable.js'
import GSDBDataSource from "./gsdbDataSource.js";

class GSDB {

    constructor(loader) {

        const gsdbModalConfig =
            {
                id: 'spacewalk-gsdb-modal',
                title: 'GSDB',
                selectionStyle: 'single',
                pageLength: 100,
                datasource: new GSDBDataSource(),
                selectHandler: (selections) => {

                    if (selections.length > 0) {

                        let { name, url } = selections.pop();

                        url = `http://${ url }`;
                        loader.load(url)

                    }
                }
            };

        this.gsdbModal = new ModalTable(gsdbModalConfig);

    }

}

export default GSDB;
