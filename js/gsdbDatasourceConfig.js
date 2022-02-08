const configuration =
    {
        isJSON: true,
        columns:
            [
                'name'
            ],
        parser: { parse } //(str) => Object.entries(JSON.parse(str))}
    }

const gsdbDatasourceConfigurator = url => {
    return {url, ...configuration}
}

function parse(str) {
    let records = []
    traverseJSON(JSON.parse(str), records, '')
    return records
}


function traverseJSON(o, records, label) {

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

}

export {gsdbDatasourceConfigurator}
