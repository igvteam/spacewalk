import * as THREE from "three"
import { BGZip, igvxhr } from 'igv-utils'
import SpacewalkEventBus from './spacewalkEventBus.js'
import {
    scene,
    ensembleManager,
    sceneManager,
    cameraLightingRig
} from './appGlobals.js'
import { SpacewalkGlobals } from './spacewalkGlobals.js'

/**
 * Load a session JSON for mobile app
 * @param {Object} json - The session JSON object
 */
async function loadMobileSession(json) {
    if (json.spacewalk) {
        await loadMobileSpacewalkSession(json.spacewalk)
    }
}

/**
 * Load the Spacewalk-specific session data for mobile
 * @param {Object} session - The spacewalk session object
 */
async function loadMobileSpacewalkSession(session) {
    const {
        url,
        traceKey,
        ensembleGroupKey,
        renderStyle,
        gnomonColor,
        gnomonVisibility,
        groundplaneColor,
        groundPlaneVisibility,
        cameraLightingRig: cameraState,
        backgroundColor
    } = session

    // Load the ensemble data
    if (url) {
        await sceneManager.ingestEnsemblePath(url, traceKey, ensembleGroupKey)
    }

    // Set render style if specified
    if (renderStyle) {
        sceneManager.configureRenderStyle(renderStyle)
    }

    // Configure gnomon if available
    const gnomonInstance = sceneManager.getGnomon()
    if (gnomonInstance && gnomonColor && gnomonVisibility) {
        gnomonInstance.setState({ visibility: gnomonVisibility, ...gnomonColor })
    }

    // Configure ground plane if available
    const groundPlaneInstance = sceneManager.getGroundPlane()
    if (groundPlaneInstance && groundplaneColor && groundPlaneVisibility) {
        groundPlaneInstance.setState({ visibility: groundPlaneVisibility, ...groundplaneColor })
    }

    // Restore camera state if available
    if (cameraState && cameraLightingRig) {
        try {
            cameraLightingRig.setState(cameraState)
        } catch (error) {
            console.warn('Could not restore camera state:', error)
        }
    }

    // Set background color if specified
    if (backgroundColor) {
        const { r, g, b } = backgroundColor
        scene.background = new THREE.Color(r, g, b)
    }

    // Post event to notify other components
    const data = ensembleManager.createEventBusPayload()
    SpacewalkEventBus.globalBus.post({ type: "DidLoadEnsembleFile", data })
}

/**
 * Get URL parameters from a URL string
 * @param {string} url - The URL to parse
 * @returns {Object} - Object containing URL parameters
 */
function getUrlParams(url) {
    const search = decodeURIComponent(url.slice(url.indexOf('?') + 1))
    return search
        .split('&')
        .reduce((acc, key_value) => {
            const [key, value] = key_value.split('=', 2)
            acc[key] = value
            return acc
        }, {})
}

/**
 * Uncompress a session URL (blob: format)
 * @param {string} sessionURL - The compressed session URL
 * @returns {string} - The uncompressed JSON string
 */
function uncompressSessionURL(sessionURL) {
    if (sessionURL.indexOf('/gzip;base64') > 0) {
        const bytes = BGZip.decodeDataURI(sessionURL, undefined)
        let json = ''
        for (let b of bytes) {
            json += String.fromCharCode(b)
        }
        return json
    } else {
        const enc = sessionURL.slice(5) // Remove 'blob:' prefix
        return BGZip.uncompressString(enc)
    }
}

/**
 * Check if a URL is a session file (JSON) vs a data file (.sw)
 * @param {string} url - The URL to check
 * @returns {boolean} - True if it's likely a session file
 */
function isSessionFile(url) {
    // Remove query parameters and check file extension
    const urlWithoutParams = url.split('?')[0].toLowerCase()
    return urlWithoutParams.endsWith('.json') || 
           url.includes('spacewalkSessionURL') ||
           url.startsWith('blob:')
}

/**
 * Load a session from a URL (handles both direct JSON and compressed blob URLs)
 * @param {string} url - The session URL
 * @returns {Promise<Object>} - The parsed session JSON
 */
async function loadSessionFromURL(url) {
    try {
        let json
        
        if (url.startsWith('blob:')) {
            // Compressed session URL
            const jsonString = uncompressSessionURL(url)
            json = JSON.parse(jsonString)
        } else if (url.includes('spacewalkSessionURL=')) {
            // URL with session parameter
            const params = getUrlParams(url)
            if (params.spacewalkSessionURL) {
                const jsonString = uncompressSessionURL(params.spacewalkSessionURL)
                json = JSON.parse(jsonString)
            } else {
                throw new Error('No spacewalkSessionURL parameter found')
            }
        } else {
            // Direct JSON file URL - use igvxhr.loadJson() like desktop
            json = await igvxhr.loadJson(url)
        }
        
        return json
    } catch (error) {
        console.error('Error loading session:', error)
        throw error
    }
}

export { 
    loadMobileSession, 
    getUrlParams, 
    uncompressSessionURL, 
    isSessionFile, 
    loadSessionFromURL 
}
