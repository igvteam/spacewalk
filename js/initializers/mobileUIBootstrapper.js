import GenomicNavigator from '../genomicNavigator.js'
import { highlightColor } from "../utils/colorUtils.js"
import SpacewalkEventBus from "../spacewalkEventBus.js"
import { showGlobalSpinner, hideGlobalSpinner } from '../utils/utils.js'

/**
 * Minimal UI bootstrapper for mobile Spacewalk.
 * Only handles genomic navigator and simple URL file loading.
 */
class MobileUIBootstrapper {
    constructor(appContext) {
        this.appContext = appContext;
    }

    /**
     * Initialize minimal mobile UI components
     * @returns {Object} Object containing initialized mobile UI components
     */
    async initialize() {
        const mobileUIComponents = {};

        // Initialize genomic navigator
        mobileUIComponents.genomicNavigator = new GenomicNavigator(
            document.querySelector('#spacewalk-trace-navigator-container'), 
            highlightColor, 
            this.appContext.ensembleManager
        );

        // Initialize URL file loader
        this.initializeURLFileLoader();

        return mobileUIComponents;
    }

    initializeURLFileLoader() {
        const urlInput = document.getElementById('mobile-url-input');
        const loadButton = document.getElementById('mobile-load-button');

        const loadFile = async () => {
            const url = urlInput.value.trim();
            
            if (!url) {
                alert('Please enter a valid URL');
                return;
            }

            try {
                showGlobalSpinner();

                // Use the same loading logic as desktop
                await this.appContext.sceneManager.ingestEnsemblePath(url, '0', undefined);
                const data = this.appContext.ensembleManager.createEventBusPayload();
                SpacewalkEventBus.globalBus.post({ type: "DidLoadEnsembleFile", data });

                // Clear the input after successful load
                urlInput.value = '';
                
                hideGlobalSpinner();
            } catch (error) {
                hideGlobalSpinner();
                console.error('Error loading file:', error);
                alert(`Error loading file: ${error.message}`);
            }
        };

        // Handle button click
        loadButton.addEventListener('click', loadFile);

        // Handle enter key in input
        urlInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                loadFile();
            }
        });
    }

    initializeResizeObserver(traceContainer, threeJSObjects) {
        const renderContainerResizeObserver = new ResizeObserver(entries => {
            const container = document.querySelector('#spacewalk-threejs-canvas-container');
            const { width, height } = container.getBoundingClientRect();
            threeJSObjects.renderer.setSize(width, height);
            threeJSObjects.camera.aspect = width / height;
            threeJSObjects.camera.updateProjectionMatrix();
            // Trigger a render through the app context
            if (this.appContext.render) {
                this.appContext.render();
            }
        });

        renderContainerResizeObserver.observe(traceContainer);
        return renderContainerResizeObserver;
    }
}

export default MobileUIBootstrapper;

