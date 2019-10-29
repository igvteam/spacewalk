import { parser, ensembleManager, igvPanel } from "./app.js";
import Zlib from "../vendor/zlib_and_gzip.js";
import { decodeDataURI } from '../vendor/uriUtils.js'
import { uncompressString } from "../vendor/stringUtils.js";
import hic from '../node_modules/juicebox.js/dist/juicebox.esm.js';

const tinyURLService = 'https://2et6uxfezb.execute-api.us-east-1.amazonaws.com/dev/tinyurl/';

const sessionSaveHandler = async (e) => {

    const url = getSessionURL();

    let response;

    const useService = `${ tinyURLService }${ url }`;
    try {
        response = await fetch(useService);
    } catch (error) {
        console.warn(error.message);
        return;
    }

    if (200 !== response.status) {
        console.log('ERROR: bad response status');
    }

    let tinyURL = undefined;
    try {
        tinyURL = await response.text();
    } catch (e) {
        console.warn(e.message);
    }

    if (tinyURL) {
        console.log(`session: ${ tinyURL }`);

        const $spacewalk_share_url = $('#spacewalk-share-url');
        $spacewalk_share_url.val( tinyURL );
        $spacewalk_share_url.get(0).select();

    }

    return false;

};

const loadSession = async (url) => {

    const params = getUrlParams(url);

    if (params.hasOwnProperty('spacewalk_session_URL')) {

        let { spacewalk_session_URL } = params;

        // spacewalk_session_URL = decodeURIComponent(spacewalk_session_URL);

        const jsonString = uncompressSession(spacewalk_session_URL);

        const { url, traceKey, igvPanelState } = JSON.parse(jsonString);

        await parser.loadSessionTrace({ url, traceKey });

        if ('none' !== igvPanelState) {
            await igvPanel.restoreState(igvPanelState);
        }

    }

};

const getSessionURL = () => {

    const path = window.location.href.slice();
    const index = path.indexOf("?");
    const prefix = index > 0 ? path.substring(0, index) : path;
    const compressedSession = getCompressedSession();

    const igvCompressedSession = igvPanel.browser.compressedSession();

    const juiceboxSession = hic.getCompressedDataString();

    const sessionURL = `${ prefix }?spacewalk_session_URL=data:${ compressedSession }&sessionURL=data:${ igvCompressedSession }&${ juiceboxSession }`;

    const encodedURI = encodeURIComponent( sessionURL );

    return encodedURI;

};

const getCompressedSession = function () {

    const json = parser.toJSON();

    json.traceKey = ensembleManager.getTraceKey(ensembleManager.currentTrace);

    json.igvPanelState = igvPanel.getState();

    const jsonString = JSON.stringify( json );

    return getCompressedString(jsonString);
};

const getCompressedString = string => {

    const bytes = [];

    for (let i = 0; i < string.length; i++) {
        bytes.push(string.charCodeAt(i));
    }

    const compressedBytes = new Zlib.RawDeflate(bytes).compress();

    const compressedString = compressedBytes
        .reduce((accumulator, byte) => {
            return accumulator + String.fromCharCode(byte)
        }, '');

    let base64EncodedString = btoa(compressedString);
    return base64EncodedString.replace(/\+/g, '.').replace(/\//g, '_').replace(/=/g, '-');   // URL safe
};

const uncompressSession = url => {

    if (url.indexOf('/gzip;base64') > 0) {

        const bytes = decodeDataURI(url);
        let json = '';
        for (let b of bytes) {
            json += String.fromCharCode(b)
        }
        return json;
    } else {

        let enc = url.substring(5);
        return uncompressString(enc);
    }
};

// url - window.location.href
const getUrlParams = url => {

    const search = decodeURIComponent( url.slice( url.indexOf( '?' ) + 1 ) );

    return search
        .split('&')
        .reduce((acc, key_value) => {

            const [ key, value ] = key_value.split( '=', 2 );
            acc[ key ] = value;
            return acc;
        }, {});

};

export { sessionSaveHandler, getUrlParams, loadSession };
