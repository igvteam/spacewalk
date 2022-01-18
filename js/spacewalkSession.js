import { URIUtils, StringUtils, URLShortener } from 'igv-utils'
import Zlib from './vendor/zlib_and_gzip.js'
import hic from './juicebox/index.js'
import Panel from './panel.js'
import {parser, igvPanel, juiceboxPanel, ensembleManager, sceneManager} from './app.js'
import { getGUIRenderStyle, setGUIRenderStyle } from './guiManager.js'
import SpacewalkEventBus from './spacewalkEventBus.js'

const urlShortener = URLShortener.getShortener({ provider: "tinyURL" })

const loadSessionURL = async spacewalkSessionURL => {

    if (spacewalkSessionURL) {
        await loadSpacewalkSession( JSON.parse( uncompressSession(spacewalkSessionURL) ))
    }

}

async function loadSession(json) {

    await loadSpacewalkSession(json.spacewalk)

    if (json.juicebox) {
        await loadJuiceboxSession(json.spacewalk.locus, json.juicebox)
    }

    await loadIGVSession(json.spacewalk, json.igv)
}

async function loadIGVSession(spacewalk, igv) {

    await igvPanel.browser.loadSession(igv)
    igvPanel.configureMouseHandlers()

    if ('none' !== spacewalk.igvPanelState) {
        await igvPanel.restoreSessionState(spacewalk.igvPanelState);
    }

}

async function loadJuiceboxSession(locus, session) {
    await hic.restoreSession($('#spacewalk_juicebox_root_container').get(0), session)
    const { chr, genomicStart:start, genomicEnd:end } = locus
    await juiceboxPanel.goto({ chr, start, end })
    juiceboxPanel.configureMouseHandlers()
}

async function loadSpacewalkSession (session) {

    SpacewalkEventBus.globalBus.unsubscribe('DidLoadEnsembleFile', igvPanel)
    SpacewalkEventBus.globalBus.unsubscribe('DidLoadEnsembleFile', juiceboxPanel)

    const { url, traceKey, igvPanelState, renderStyle, panelVisibility, gnomonVisibility, groundPlaneVisibility, cameraLightingRig, gnomonColor, groundplaneColor, sceneBackground } = session

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

    SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', igvPanel)
    SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', juiceboxPanel)

}

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

    for (let [key, value] of Object.entries( Panel.getPanelDictionary() )) {
        json.panelVisibility[ key ] = true === value.isHidden ? 'hidden' : 'visible'
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

    const spacewalk = parser.toJSON()
    spacewalk.locus = ensembleManager.locus
    spacewalk.traceKey = ensembleManager.getTraceKey(ensembleManager.currentTrace)
    spacewalk.igvPanelState = igvPanel.getSessionState()
    spacewalk.renderStyle = getGUIRenderStyle()
    spacewalk.panelVisibility = {}

    for (let [key, value] of Object.entries( Panel.getPanelDictionary() )) {
        spacewalk.panelVisibility[ key ] = true === value.isHidden ? 'hidden' : 'visible'
    }

    spacewalk.gnomonVisibility = true === sceneManager.gnomon.group.visible ? 'visible' : 'hidden'
    spacewalk.groundPlaneVisibility = true === sceneManager.groundPlane.visible ? 'visible' : 'hidden'
    spacewalk.cameraLightingRig = sceneManager.cameraLightingRig.getState()
    spacewalk.gnomonColor = sceneManager.gnomon.getColorState()
    spacewalk.groundplaneColor = sceneManager.groundPlane.getColorState()

    // spacewalk.sceneBackground = sceneManager.getBackgroundState()

    const igv = igvPanel.browser.toJSON()

    const juicebox = hic.toJSON()

    return { spacewalk, igv, juicebox }

    // if (hic.Globals.currentBrowser && hic.Globals.currentBrowser.dataset ) {
    //     const juicebox = hic.toJSON()
    //     return { spacewalk, igv, juicebox }
    // } else {
    //     return { spacewalk, igv }
    // }

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

export { getShareURL, getUrlParams, loadSessionURL, toJSON, loadSession };
