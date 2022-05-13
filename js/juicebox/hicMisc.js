import {Globals} from "./globals.js";
import EventBus from "./eventBus.js";
import HICEvent from "./hicEvent.js";

function getAllBrowsers() {
    return Globals.allBrowsers;
}

function syncBrowsers(browsers) {

    const synchableBrowsers = (browsers || Globals.allBrowsers).filter(b => (false !== b.synchable) && (b.dataset !== undefined));

    // Sync compatible maps only
    for (let b1 of synchableBrowsers) {
        for (let b2 of synchableBrowsers) {
            if (b1 === b2) continue;
            if (b1.dataset.isCompatible(b2.dataset)) {
                b1.synchedBrowsers.push(b2);
                b2.synchedBrowsers.push(b1);
            }
        }
    }
}

function deleteBrowser(browser) {
    browser.$root.remove();
    Globals.allBrowsers = Globals.allBrowsers.filter(b => b !== browser);
    if (Globals.allBrowsers.length <= 1) {
        Globals.allBrowsers.forEach(function (b) {
            b.$browser_panel_delete_button.hide();
        });
    }
}

function deleteAllBrowsers() {

    if (Globals.allBrowsers && Globals.allBrowsers.length > 0) {

        for (let browser of Globals.allBrowsers) {
            browser.$root.remove();
        }

        Globals.allBrowsers = []

    }
}

function getCurrentBrowser() {
    return Globals.currentBrowser;
}

function setCurrentBrowser(browser) {
    if (undefined === browser) {
        if (Globals.currentBrowser) {
            Globals.currentBrowser.$root.removeClass('hic-root-selected');
        }
        Globals.currentBrowser = browser;
        return;
    }
    if (browser !== Globals.currentBrowser) {
        if (Globals.currentBrowser) {
            Globals.currentBrowser.$root.removeClass('hic-root-selected');
        }
        browser.$root.addClass('hic-root-selected');
        Globals.currentBrowser = browser;
        EventBus.globalBus.post(HICEvent("BrowserSelect", browser))
    }
}

export { getAllBrowsers, syncBrowsers, deleteBrowser, deleteAllBrowsers, setCurrentBrowser, getCurrentBrowser }
