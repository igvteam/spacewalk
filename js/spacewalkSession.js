import hic from '../node_modules/juicebox.js/js/index.js'
import {BGZip} from 'igv-utils'
import Panel from './panel.js'
import { igvPanel, juiceboxPanel, ensembleManager, sceneManager, liveContactMapService, SpacewalkGlobals, guiManager } from './app.js'
import SpacewalkEventBus from './spacewalkEventBus.js'
import {defaultDistanceThreshold} from './juicebox/liveContactMapService.js'
import { shortenURL } from "./share/shareHelper.js"

const loadSessionURL = async spacewalkSessionURL => {

    if (spacewalkSessionURL) {
        const spacewalk = JSON.parse( uncompressSession(spacewalkSessionURL) )
        await loadSpacewalkSession(spacewalk)

        if ('none' !== spacewalk.igvPanelState) {
            await igvPanel.restoreSessionState(spacewalk.igvPanelState)
        }

    }

}

async function loadSession(json) {

    await loadSpacewalkSession(json.spacewalk)

    if (json.juicebox) {
        await loadJuiceboxSession(json.juicebox)
    } else {
        const { chr, genomicStart, genomicEnd } = json.spacewalk.locus
        juiceboxPanel.locus = `${chr}:${genomicStart}-${genomicEnd}`
    }

    await loadIGVSession(json.spacewalk, json.igv)
}

async function loadIGVSession(spacewalk, igv) {

    igvPanel.browser.removeAllTracks()
    await igvPanel.browser.loadSession(igv)
    igvPanel.configureMouseHandlers()

    if ('none' !== spacewalk.igvPanelState) {
        await igvPanel.restoreSessionState(spacewalk.igvPanelState)
    }

}

async function loadJuiceboxSession(session) {
    await juiceboxPanel.loadSession(session)
}

async function loadSpacewalkSession (session) {

    const {
        url,
        traceKey,
        ensembleGroupKey,
        renderStyle,
        gnomonVisibility,
        groundPlaneVisibility,
        gnomonColor,
        groundplaneColor,
        contactFrequencyMapDistanceThreshold,
        panelVisibility,
        cameraLightingRig,
        backgroundColor
    } = session

    guiManager.setRenderStyle(renderStyle)

    await sceneManager.ingestEnsemblePath(url, traceKey, ensembleGroupKey)

    sceneManager.gnomon.setState({ visibility: gnomonVisibility, ...gnomonColor })

    sceneManager.groundPlane.setState({ visibility: groundPlaneVisibility, ...groundplaneColor })

    liveContactMapService.setState(contactFrequencyMapDistanceThreshold || defaultDistanceThreshold)
    Panel.setState(panelVisibility)

    // TODO: Decide whether to restore camera state
    // sceneManager.cameraLightingRig.setState(cameraLightingRig);

    if (backgroundColor) {
        sceneManager.setBackground(backgroundColor);
    }

    const data = ensembleManager.createEventBusPayload()
    SpacewalkEventBus.globalBus.post({ type: "DidLoadEnsembleFile", data })

}

function getUrlParams(url) {

    const search = decodeURIComponent( url.slice( url.indexOf( '?' ) + 1 ) );

    return search
        .split('&')
        .reduce((acc, key_value) => {

            const [ key, value ] = key_value.split( '=', 2 );
            acc[ key ] = value;
            return acc;
        }, {});

}

async function getShareURL() {

    const spacewalkCompressedSession = getCompressedSession()

    if (spacewalkCompressedSession) {
        const igvCompressedSession = igvPanel.browser.compressedSession()

        let juiceboxCompressedSession
        if (juiceboxPanel.browser.dataset && undefined === juiceboxPanel.browser.dataset.isLiveContactMapDataSet) {
            // Note format is: session=blob:${BGZip.compressString(jsonString)}
            juiceboxCompressedSession = hic.compressedSession()
        }

        const path = window.location.href.slice()
        const index = path.indexOf("?")
        const prefix = index > 0 ? path.substring(0, index) : path

        let url
        if (juiceboxCompressedSession) {
            url = `${ prefix }?spacewalkSessionURL=blob:${ spacewalkCompressedSession }&sessionURL=blob:${ igvCompressedSession }&${ juiceboxCompressedSession }`
        } else {
            url = `${ prefix }?spacewalkSessionURL=blob:${ spacewalkCompressedSession }&sessionURL=blob:${ igvCompressedSession }`
        }

        return shortenURL(url)

    } else {
        return undefined
    }

}

function getCompressedSession() {
    const json = spacewalkToJSON()
    if (json) {
        return BGZip.compressString( JSON.stringify( json ) )
    } else {
        return undefined
    }

}

function spacewalkToJSON () {

    let spacewalk
    if (SpacewalkGlobals.url) {

        spacewalk = { url: SpacewalkGlobals.url }

        spacewalk.locus = { ...ensembleManager.locus }

        spacewalk.traceKey = ensembleManager.currentIndex.toString()

        spacewalk.ensembleGroupKey = ensembleManager.datasource.currentEnsembleGroupKey

        spacewalk.igvPanelState = igvPanel.getSessionState()

        spacewalk.renderStyle = guiManager.getRenderStyle()

        spacewalk.panelVisibility = Panel.toJSON()

        let json

        // gnomon
        json = sceneManager.gnomon.toJSON()
        spacewalk.gnomonVisibility = json.visibility
        spacewalk.gnomonColor = { r:json.r, g:json.g, b:json.b }

        // groundplane
        json = sceneManager.groundPlane.toJSON()
        spacewalk.groundPlaneVisibility = json.visibility
        spacewalk.groundplaneColor = { r:json.r, g:json.g, b:json.b }

        // background
        spacewalk.backgroundColor = sceneManager.toJSON()

        spacewalk.cameraLightingRig = sceneManager.cameraLightingRig.getState()

        spacewalk.contactFrequencyMapDistanceThreshold = liveContactMapService.distanceThreshold

        return spacewalk
    } else {
        return undefined
    }


}

function toJSON () {

    const spacewalk = spacewalkToJSON()

    if (spacewalk) {
        const igv = igvPanel.browser.toJSON()

        const json = { spacewalk, igv }

        if (juiceboxPanel.browser.dataset && undefined === juiceboxPanel.browser.dataset.isLiveContactMapDataSet) {
            json.juicebox = hic.toJSON()
        }

        return json

    } else {
        return undefined
    }


}

function uncompressSession(url) {

    if (url.indexOf('/gzip;base64') > 0) {

        const bytes = BGZip.decodeDataURI(url, undefined)
        let json = '';
        for (let b of bytes) {
            json += String.fromCharCode(b)
        }
        return json;
    } else {

        let enc = url.substring(5);
        return BGZip.uncompressString(enc)
    }
}

export { getShareURL, getUrlParams, loadSessionURL, toJSON, loadSession, uncompressSession };
