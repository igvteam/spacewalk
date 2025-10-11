import * as THREE from "three"
import hic from 'juicebox.js'
import {BGZip} from 'igv-utils'
import Panel from './panel.js'
import SpacewalkEventBus from './spacewalkEventBus.js'
import {defaultDistanceThreshold} from './juicebox/liveContactMapService.js'
import { shortenURL } from "./share/shareHelper.js"
import {
    scene,
    trackMaterialProvider,
    igvPanel,
    juiceboxPanel,
    ensembleManager,
    sceneManager,
    liveContactMapService,
    SpacewalkGlobals,
    cameraLightingRig,
    scaleBarService
} from './main.js'
import GUIManager from "./guiManager.js"

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

    // Clear any existing track colors from previous session

    trackMaterialProvider.clearAllTracks();

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
        gnomonColor,
        gnomonVisibility,
        groundplaneColor,
        groundPlaneVisibility,
        rulerColor,
        rulerVisibility,
        contactFrequencyMapDistanceThreshold,
        panelVisibility,
        cameraLightingRig,
        backgroundColor
    } = session

    GUIManager.updateRenderStyleWidgetState(renderStyle)

    await sceneManager.ingestEnsemblePath(url, traceKey, ensembleGroupKey)

    const gnomonInstance = sceneManager.getGnomon()
    gnomonInstance.setState({ visibility: gnomonVisibility, ...gnomonColor })

    const groundPlaneInstance = sceneManager.getGroundPlane()
    groundPlaneInstance.setState({ visibility: groundPlaneVisibility, ...groundplaneColor })

    if (rulerColor && rulerVisibility) {
        scaleBarService.setState({ visibility: rulerVisibility, ...rulerColor })
    }

    liveContactMapService.setState(contactFrequencyMapDistanceThreshold || defaultDistanceThreshold)
    Panel.setState(panelVisibility)

    // TODO: Decide whether to restore camera state
    // sceneManager.cameraLightingRig.setState(cameraLightingRig);

    if (backgroundColor) {
        const { r, g, b } = backgroundColor
        scene.background = new THREE.Color(r, g, b)
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

        spacewalk.renderStyle = sceneManager.renderStyle

        spacewalk.panelVisibility = Panel.toJSON()

        let json

        // gnomon
        json = sceneManager.getGnomon().toJSON()
        spacewalk.gnomonVisibility = json.visibility
        spacewalk.gnomonColor = { r:json.r, g:json.g, b:json.b }

        // groundplane
        json = sceneManager.getGroundPlane().toJSON()
        spacewalk.groundPlaneVisibility = json.visibility
        spacewalk.groundplaneColor = { r:json.r, g:json.g, b:json.b }

        // ruler
        json = scaleBarService.toJSON()
        spacewalk.rulerVisibility = json.visibility
        spacewalk.rulerColor = { r:json.r, g:json.g, b:json.b }

        // background
        spacewalk.backgroundColor = sceneManager.toJSON()

        spacewalk.cameraLightingRig = cameraLightingRig.getState()

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

function uncompressSessionURL(sessionURL) {

    if (sessionURL.indexOf('/gzip;base64') > 0) {

        const bytes = BGZip.decodeDataURI(sessionURL, undefined)
        let json = '';
        for (let b of bytes) {
            json += String.fromCharCode(b)
        }
        return json;
    } else {

        const enc = sessionURL.slice(5);
        return BGZip.uncompressString(enc)
    }
}

export { getShareURL, getUrlParams, toJSON, loadSession, uncompressSessionURL };
