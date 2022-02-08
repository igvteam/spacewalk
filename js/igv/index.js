// Defines the top-level API for the igv module

import MenuUtils from "./ui/menuUtils.js";
import DataRangeDialog from "./ui/dataRangeDialog.js";
import IGVGraphics from "./igv-canvas.js";
import {createBrowser, createTrack, removeAllBrowsers, removeBrowser, visibilityChange} from './igv-create.js';
import {doAutoscale} from "./util/igvUtils.js";
import version from "./version.js"
import TrackView from "./trackView.js"
import {igvxhr, oauth} from "igv-utils"
import {
    appleCrayonRGB,
    appleCrayonRGBA,
    appleCrayonPalette,
    ColorTable,
    PaletteColorTable,
    randomColor,
    rgbaColor,
    rgbColor,
    greyScale,
    randomGrey,
    randomRGB,
    randomRGBConstantAlpha
} from './util/colorPalletes.js'

const setApiKey = igvxhr.setApiKey;

function setGoogleOauthToken(accessToken) {
    return oauth.setToken(accessToken);
}

function setOauthToken(accessToken, host) {
    return oauth.setToken(accessToken, host)
}

export default {
    IGVGraphics,
    MenuUtils,
    DataRangeDialog,
    createTrack,
    createBrowser,
    removeBrowser,
    removeAllBrowsers,
    visibilityChange,
    setGoogleOauthToken,
    setOauthToken,
    oauth,
    version,
    setApiKey,
    doAutoscale,
    TrackView,
    appleCrayonRGB,
    appleCrayonRGBA,
    appleCrayonPalette,
    ColorTable,
    PaletteColorTable,
    randomColor,
    rgbaColor,
    rgbColor,
    greyScale,
    randomGrey,
    randomRGB,
    randomRGBConstantAlpha
}

