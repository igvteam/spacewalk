import ModalTable from '../../node_modules/data-modal/js/modalTable.js';
import ContactMapDatasource from "./contactMapDatasource.js";
import { juiceboxPanel } from "../app.js";

class JuiceboxSelectModalController {

    constructor({ elementID }) {

        const datasource = new ContactMapDatasource('https://aidenlab.org/juicebox/res/mapMenuData.txt');

        const contactMapSelectHandler = async selectionList => {
            const { url, name } = datasource.tableSelectionHandler(selectionList);
            await juiceboxPanel.selectLoad(url, name);
        };

        this.contactMapModal = new ModalTable({ id: elementID, title: 'Contact Map', selectionStyle: 'single', pageLength: 100, selectHandler:contactMapSelectHandler });
        this.contactMapModal.setDatasource(datasource);

    }
}

export default JuiceboxSelectModalController
