import { ensembleManager } from "./app.js";
import Zlib from "../vendor/zlib_and_gzip.js";

const getSessionURL = () => {

    const path = window.location.href.slice();
    const index = path.indexOf("?");
    const prefix = index > 0 ? path.substring(0, index) : path;
    const compressedSession = getCompressedSession();

    const sessionURL = `${ prefix }?sessionURL=data:${ compressedSession }`;

    return sessionURL;

};

const getCompressedSession = function () {

    const json = ensembleManager.toJSON();

    const jsonString = JSON.stringify( json );

    return getCompressedString(jsonString);
};

const getCompressedString = string => {

    const bytes = [];

    for (let i = 0; i < string.length; i++) {
        bytes.push(string.charCodeAt(i));
    }

    const compressedBytes = new Zlib.RawDeflate(bytes).compress();

    // const compressedString = String.fromCharCode(null, compressedBytes);

    const compressedString = compressedBytes
        .reduce((accumulator, byte) => {
            return accumulator + String.fromCharCode(byte)
        }, '');

    let base64EncodedString = btoa(compressedString);
    return base64EncodedString.replace(/\+/g, '.').replace(/\//g, '_').replace(/=/g, '-');   // URL safe
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

export { getUrlParams, getSessionURL };
