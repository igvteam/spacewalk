class GSDBDataSource {

    constructor() {

    }

    async tableColumns() {
        return [ 'name' ]
    }

    async tableData() {

        // const jsonFile = 'resources/gsdb.json';
        const jsonFile = 'http://calla.rnet.missouri.edu/genome3d/GSDB/GSDB_JSON_URL_LIST.txt';

        let myJSON = undefined;
        try {

            const response = await fetch(jsonFile);

            if (!response.ok) {
                throw new Error(`Unable to retrieve ${ jsonFile }.`);
            }

            myJSON = await response.json();

        } catch (error) {
            console.error(error);
        }

        if (myJSON) {

            let records = [];
            traverseJSON(myJSON, records, '');

            return records;
        } else {
            return [];
        }

    }
}

const traverseJSON = (o, records, label) => {

    if ('directory' === o.type) {

        for (let thang of o.children) {

            const str = '' === label ? o.name : `${ label }-${ o.name }`;
            traverseJSON(thang, records, str);
        }

    } else {
        const { name, url } = o;
        const str = `${ label }-${ name }`;
        records.push({ name: str, url });
    }

};

export default GSDBDataSource;
