/**
 * Shared global state for both desktop and mobile apps.
 * This module acts as a bridge between app.js/mobileApp.js and other modules
 * that need access to the application state.
 */

// Module-level variables - populated by App or MobileApp during initialization
export let pointCloud = null;
export let ribbon = null;
export let ballAndStick = null;
export let ensembleManager = null;
export let sceneManager = null;
export let trackMaterialProvider = null;
export let colorRampMaterialProvider = null;
export let liveContactMapService = null;
export let liveDistanceMapService = null;
export let juiceboxPanel = null;
export let igvPanel = null;
export let genomicNavigator = null;
export let googleEnabled = false;
export let cameraLightingRig = null;
export let camera = null;
export let scene = null;
export let sceneBackgroundColorPicker = null;
export let scaleBarService = null;

/**
 * Update the global state. Called by App or MobileApp during initialization.
 */
export function updateGlobals(updates) {
    if (updates.pointCloud !== undefined) pointCloud = updates.pointCloud;
    if (updates.ribbon !== undefined) ribbon = updates.ribbon;
    if (updates.ballAndStick !== undefined) ballAndStick = updates.ballAndStick;
    if (updates.ensembleManager !== undefined) ensembleManager = updates.ensembleManager;
    if (updates.sceneManager !== undefined) sceneManager = updates.sceneManager;
    if (updates.trackMaterialProvider !== undefined) trackMaterialProvider = updates.trackMaterialProvider;
    if (updates.colorRampMaterialProvider !== undefined) colorRampMaterialProvider = updates.colorRampMaterialProvider;
    if (updates.liveContactMapService !== undefined) liveContactMapService = updates.liveContactMapService;
    if (updates.liveDistanceMapService !== undefined) liveDistanceMapService = updates.liveDistanceMapService;
    if (updates.juiceboxPanel !== undefined) juiceboxPanel = updates.juiceboxPanel;
    if (updates.igvPanel !== undefined) igvPanel = updates.igvPanel;
    if (updates.genomicNavigator !== undefined) genomicNavigator = updates.genomicNavigator;
    if (updates.googleEnabled !== undefined) googleEnabled = updates.googleEnabled;
    if (updates.cameraLightingRig !== undefined) cameraLightingRig = updates.cameraLightingRig;
    if (updates.camera !== undefined) camera = updates.camera;
    if (updates.scene !== undefined) scene = updates.scene;
    if (updates.sceneBackgroundColorPicker !== undefined) sceneBackgroundColorPicker = updates.sceneBackgroundColorPicker;
    if (updates.scaleBarService !== undefined) scaleBarService = updates.scaleBarService;
}

export function getThreeJSContainerRect() {
    const container = document.querySelector('#spacewalk-threejs-canvas-container');
    return container.getBoundingClientRect();
}

/**
 * Get the current material provider for coloring.
 * On desktop: returns igvPanel.materialProvider (set by panelInitializer)
 * On mobile: returns colorRampMaterialProvider directly
 */
export function getMaterialProvider() {
    // Desktop: use IGV panel's material provider if available
    if (igvPanel && igvPanel.materialProvider) {
        return igvPanel.materialProvider;
    }
    // Mobile: use color ramp material provider directly
    return colorRampMaterialProvider;
}

