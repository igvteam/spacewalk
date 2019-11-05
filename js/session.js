import * as THREE from "../node_modules/three/build/three.module.js";
import hic from '../node_modules/juicebox.js/dist/juicebox.esm.js';
import Zlib from "../vendor/zlib_and_gzip.js";
import Panel from "./panel.js";
import { parser, ensembleManager, igvPanel, sceneManager } from "./app.js";
import { decodeDataURI } from '../vendor/uriUtils.js'
import { uncompressString } from "../vendor/stringUtils.js";
import { getGUIRenderStyle, setGUIRenderStyle } from "./guiManager.js";

const tinyURLService = 'https://2et6uxfezb.execute-api.us-east-1.amazonaws.com/dev/tinyurl/';

const saveSession = async () => {

    const url = getSessionURL();

    if (url) {

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
        } catch (error) {
            console.warn(error.message);
        }

        return tinyURL;

    } else {
        return undefined;
    }

};

const getSessionURL = () => {

    try {

        const path = window.location.href.slice();
        const index = path.indexOf("?");
        const prefix = index > 0 ? path.substring(0, index) : path;

        const spacewalkCompressedSession = getCompressedSession();

        const igvCompressedSession = igvPanel.browser.compressedSession();

        const juiceboxCompressedSession = hic.getCompressedDataString();

        const sessionURL = `${ prefix }?spacewalk_session_URL=data:${ spacewalkCompressedSession }&sessionURL=data:${ igvCompressedSession }&${ juiceboxCompressedSession }`;

        return encodeURIComponent( sessionURL );

    } catch (e) {
        console.error(e);
        alert(e.message);
        return undefined;
    }

};

const getCompressedSession = () => {

    let json = parser.toJSON();

    json.traceKey = ensembleManager.getTraceKey(ensembleManager.currentTrace);

    json.igvPanelState = igvPanel.getSessionState();

    json.renderStyle = getGUIRenderStyle();

    json.panelVisibility = {};
    Panel.getPanelList().forEach( panel => {
        json.panelVisibility[ panel.constructor.name ] = true === panel.isHidden ? 'hidden' : 'visible';
    });

    json.gnomonVisibility = true === sceneManager.gnomon.group.visible ? 'visible' : 'hidden';

    json.groundPlaneVisibility = true === sceneManager.groundPlane.visible ? 'visible' : 'hidden';

    json.cameraLightingRig = sceneManager.cameraLightingRig.getState();

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

const loadSession = async (url) => {

    const params = getUrlParams(url);

    if (params.hasOwnProperty('spacewalk_session_URL')) {

        let { spacewalk_session_URL } = params;

        // spacewalk_session_URL = decodeURIComponent(spacewalk_session_URL);

        const jsonString = uncompressSession(spacewalk_session_URL);

        const { url, traceKey, igvPanelState, renderStyle, panelVisibility, gnomonVisibility, groundPlaneVisibility, cameraLightingRig } = JSON.parse(jsonString);

        await parser.loadSessionTrace({ url, traceKey });

        if ('none' !== igvPanelState) {
            await igvPanel.restoreSessionState(igvPanelState);
        }

        setGUIRenderStyle(renderStyle);

        Panel.setAllPanelVisibility(panelVisibility);

        sceneManager.gnomon.setVisibility(gnomonVisibility);

        sceneManager.groundPlane.setVisibility(groundPlaneVisibility);

        // sceneManager.cameraLightingRig.setState(cameraLightingRig);

    }

};

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

export { saveSession, getUrlParams, loadSession };
