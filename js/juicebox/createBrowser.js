/*
 * @author Jim Robinson Dec-2020
 */

import HICEvent from "./hicEvent.js"
import EventBus from "./eventBus.js"

const defaultSize = {width: 640, height: 640}

let allBrowsers = []
let currentBrowser
function setCurrentBrowser(browser) {// unselect current browser
    if (undefined === browser) {
        if (currentBrowser) {
            currentBrowser.$root.removeClass('hic-root-selected');
        }
        currentBrowser = browser;
        return;
    }
    if (browser !== currentBrowser) {
        if (currentBrowser) {
            currentBrowser.$root.removeClass('hic-root-selected');
        }
        browser.$root.addClass('hic-root-selected');
        currentBrowser = browser;
        EventBus.globalBus.post(HICEvent("BrowserSelect", browser))
    }
}


function deleteBrowser(browser) {
    browser.unsyncSelf();
    browser.$root.remove();
    allBrowsers = allBrowsers.filter(b => b !== browser);
    if (allBrowsers.length <= 1) {
        allBrowsers.forEach(function (b) {
            b.$browser_panel_delete_button.hide();
        });
    }
}


// Set default values for config properties
export {
    defaultSize,
    deleteBrowser,
    setCurrentBrowser
}
