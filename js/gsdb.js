
const gsdbSelectLoader = async ($selectModal, onChange) => {

    const jsonFile = 'resources/gsdb.json';

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

        let urls = [];
        traverseJSON(myJSON, urls, '');

        const $select = $selectModal.find('select');

        let counter = 0;
        for (let { name, url } of urls) {

            url = `http://${ url }`;
            const str = `<option value="${ url }">${ name }</option>`;
            const $option = $(str);
            $select.append($option);

            if (3e3 === counter++) {
                break
            }
        }

        onChange($selectModal, $select);
    }

};

const traverseJSON = (o, urls, label) => {

    if ('directory' === o.type) {

        for (let thang of o.children) {

            const str = '' === label ? o.name : `${ label }-${ o.name }`;
            traverseJSON(thang, urls, str);
        }

    } else {
        const { name, url } = o;
        const str = `${ label }-${ name }`;
        urls.push({ name: str, url });
    }

};

export { gsdbSelectLoader };
