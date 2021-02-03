import hic from './juicebox/js/juicebox.esm.js'
import { URIUtils, StringUtils, URLShortener, Zlib } from '../node_modules/igv-utils/src/index.js'
import Panel from './panel.js'
import { parser, igvPanel, ensembleManager, sceneManager } from './app.js'
import { getGUIRenderStyle, setGUIRenderStyle } from './guiManager.js'

const urlShortener = URLShortener.getShortener({ provider: "tinyURL" })

const loadSessionURL = async spacewalkSessionURL => {

    if (spacewalkSessionURL) {

        const { url, traceKey, igvPanelState, renderStyle, panelVisibility, gnomonVisibility, groundPlaneVisibility, cameraLightingRig, gnomonColor, groundplaneColor, sceneBackground } = JSON.parse( uncompressSession(spacewalkSessionURL) )

        await parser.loadSessionTrace({ url, traceKey });

        setGUIRenderStyle(renderStyle);

        Panel.setAllPanelVisibility(panelVisibility);

        sceneManager.gnomon.setVisibility(gnomonVisibility);

        sceneManager.groundPlane.setVisibility(groundPlaneVisibility);

        // TODO: Decide whether to restore camera state
        // sceneManager.cameraLightingRig.setState(cameraLightingRig);

        sceneManager.gnomon.setColorState(gnomonColor);

        sceneManager.groundPlane.setColorState(groundplaneColor);

        // TODO: Figure out how do deal with background shader
        // sceneManager.setBackgroundState(sceneBackground);

        if ('none' !== igvPanelState) {
            await igvPanel.restoreSessionState(igvPanelState);
        }

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

async function getShareURL() {

    const spacewalkCompressedSession = getCompressedSession()
    const igvCompressedSession = igvPanel.browser.compressedSession()

    // Note format is: session=blob:${StringUtils.compressString(jsonString)}
    const juiceboxCompressedSession = hic.compressedSession()

    const path = window.location.href.slice()
    const index = path.indexOf("?")
    const prefix = index > 0 ? path.substring(0, index) : path

    const url = `${ prefix }?spacewalkSessionURL=blob:${ spacewalkCompressedSession }&sessionURL=blob:${ igvCompressedSession }&${ juiceboxCompressedSession }`

    return urlShortener.shortenURL(url)

}

function getCompressedSession() {

    const json = parser.toJSON()
    json.traceKey = ensembleManager.getTraceKey(ensembleManager.currentTrace)
    json.igvPanelState = igvPanel.getSessionState()
    json.renderStyle = getGUIRenderStyle()
    json.panelVisibility = {}

    for (let panel of Panel.getPanelList()) {
        json.panelVisibility[ panel.constructor.name ] = true === panel.isHidden ? 'hidden' : 'visible'
    }

    json.gnomonVisibility = true === sceneManager.gnomon.group.visible ? 'visible' : 'hidden'
    json.groundPlaneVisibility = true === sceneManager.groundPlane.visible ? 'visible' : 'hidden'
    json.cameraLightingRig = sceneManager.cameraLightingRig.getState()
    json.gnomonColor = sceneManager.gnomon.getColorState()
    json.groundplaneColor = sceneManager.groundPlane.getColorState()

    // json.sceneBackground = sceneManager.getBackgroundState();

    return StringUtils.compressString( JSON.stringify( json ) )
}

function toJSON () {

    const json = { spacewalk: {} }

    json.spacewalk = parser.toJSON()
    json.traceKey = ensembleManager.getTraceKey(ensembleManager.currentTrace)
    json.igvPanelState = igvPanel.getSessionState()
    json.renderStyle = getGUIRenderStyle()
    json.panelVisibility = {}

    for (let panel of Panel.getPanelList()) {
        json.panelVisibility[ panel.constructor.name ] = true === panel.isHidden ? 'hidden' : 'visible'
    }

    json.gnomonVisibility = true === sceneManager.gnomon.group.visible ? 'visible' : 'hidden'
    json.groundPlaneVisibility = true === sceneManager.groundPlane.visible ? 'visible' : 'hidden'
    json.cameraLightingRig = sceneManager.cameraLightingRig.getState()
    json.gnomonColor = sceneManager.gnomon.getColorState()
    json.groundplaneColor = sceneManager.groundPlane.getColorState()

    // json.sceneBackground = sceneManager.getBackgroundState()

    json.igv = igvPanel.browser.toJSON()
    json.juicebox = hic.toJSON()

    return json

}

function uncompressSession(url) {

    if (url.indexOf('/gzip;base64') > 0) {

        const bytes = URIUtils.decodeDataURI(url);
        let json = '';
        for (let b of bytes) {
            json += String.fromCharCode(b)
        }
        return json;
    } else {

        let enc = url.substring(5);
        return StringUtils.uncompressString(enc, Zlib);
    }
}

export { getShareURL, getUrlParams, loadSessionURL, toJSON };
