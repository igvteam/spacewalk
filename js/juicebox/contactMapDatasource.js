import hic from "../../node_modules/juicebox.js/dist/juicebox.esm.js";

let columns = undefined;

class ContactMapDatasource {

    constructor(path) {

        this.path = path;

        this.columnDefs =
            [
                {
                    targets: [ 0 ], // NVI
                    visible: false,
                    searchable: false
                },
                {
                    targets: [ 10 ], // hide url column
                    visible: false,
                    searchable: false
                }

            ];

    }

    async tableColumns() {
        return columns;
    }

    async tableData() {
        return fetchData(this.path);
    }

    tableSelectionHandler(selectionList){

        const obj = selectionList.shift();
        const url   = obj[ columns[ 10 ] ];
        const name  = obj[ columns[  1 ] ];
        return { url, name }
    };

}

const fetchData = async path => {

    let response = undefined;
    try {
        response = await fetch(path);
    } catch (e) {
        hic.igv.Alert.presentAlert(e.message);
        return undefined;
    }

    if (response) {
        const obj = await response.json();
        return parseData(obj);
    } else {
        return undefined;
    }
};

const parseData = obj => {

    const [ path, template ] = Object.entries(obj)[ 0 ];
    columns = Object.keys(template);
    columns.push('url');

    const result = Object.entries(obj).map(([ path, record ]) => {

        const cooked = {};
        Object.assign(cooked, record);

        for (let key of Object.keys(template)) {
            cooked[ key ] = cooked[ key ] || '-';
        }

        const output = {};
        Object.assign(output, cooked);
        output['url'] = '-' === cooked[ 'NVI' ] ? `${ path }` : `${ path }?nvi=${ cooked[ 'NVI' ] }`;
        return output;
    });

    return result;
};

export default ContactMapDatasource
