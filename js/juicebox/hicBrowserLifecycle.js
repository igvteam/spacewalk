/*
 * @author Jim Robinson Dec-2020
 */

import {StringUtils} from 'igv-utils'
import { defaultSize } from "./defaults.js";
import { Globals } from "./globals.js";
import {setCurrentBrowser} from "./hicMisc.js";
import HICBrowser from './hicBrowser.js'
import ColorScale from './colorScale.js'
import State from './hicState.js'
import ContactMatrixView from "./contactMatrixView.js"

async function createBrowser(hic_container, config, callback) {

    const $hic_container = $(hic_container);

    setDefaults(config);

    if (StringUtils.isString(config.state)) {
        config.state = State.parse(config.state);
    }
    if (StringUtils.isString(config.colorScale)) {
        config.colorScale = ColorScale.parse(config.colorScale);
    }
    if (StringUtils.isString(config.backgroundColor)) {
        config.backgroundColor = ContactMatrixView.parseBackgroundColor(config.backgroundColor);
    }

    const browser = new HICBrowser($hic_container, config)

    await browser.init(config)

    if (typeof callback === "function") {
        callback();
    }

    Globals.allBrowsers.push(browser)

    setCurrentBrowser(browser)

    if (Globals.allBrowsers.length > 1) {
        for (let { $browser_panel_delete_button } of Globals.allBrowsers) {
            $browser_panel_delete_button.show()
        }
    }

    return browser;
}

async function createBrowserList(hic_container, session) {

    const $hic_container = $(hic_container);
    const configList = session.browsers || [session];


    Globals.allBrowsers = [];
    const initPromises = [];
    for (let config of configList) {
        setDefaults(config);
        if (StringUtils.isString(config.state)) {
            config.state = State.parse(config.state);
        }
        if (StringUtils.isString(config.colorScale)) {
            config.colorScale = ColorScale.parse(config.colorScale);
        }
        if (StringUtils.isString(config.backgroundColor)) {
            config.backgroundColor = ContactMatrixView.parseBackgroundColor(config.backgroundColor);
        }
        if(false === session.syncDatasets) {
            config.synchable = false;
        }

        const browser = new HICBrowser($hic_container, config);

        Globals.allBrowsers.push(browser);
        initPromises.push(browser.init(config));
    }
    await Promise.all(initPromises);

    setCurrentBrowser(Globals.allBrowsers[0]);

    if (Globals.allBrowsers.length > 1) {
        Globals.allBrowsers.forEach(function (b) {
            b.$browser_panel_delete_button.show();
        });
    }
}

function setDefaults(config) {

    if (config.state) {

        if (StringUtils.isString(config.state)) {
            config.state = State.parse(config.state)
        } else {
            // copy
            config.state = new State(
                config.state.chr1,
                config.state.chr2,
                config.state.zoom,
                config.state.x,
                config.state.y,
                config.width,
                config.height,
                config.state.pixelSize,
                config.state.normalization)
        }
    }

    if (config.figureMode === true) {
        config.showLocusGoto = false;
        config.showHicContactMapLabel = false;
        config.showChromosomeSelector = false;
    } else {
        if (undefined === config.width) {
            config.width = config.state ? config.state.width : defaultSize.width
        }
        if (undefined === config.height) {
            config.height = config.state ? config.state.height : defaultSize.height
        }
        if (undefined === config.showLocusGoto) {
            config.showLocusGoto = true;
        }
        if (undefined === config.showHicContactMapLabel) {
            config.showHicContactMapLabel = true;
        }
        if (undefined === config.showChromosomeSelector) {
            config.showChromosomeSelector = true
        }
    }

}

export { createBrowser, createBrowserList }
