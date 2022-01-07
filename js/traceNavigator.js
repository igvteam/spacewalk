import SpacewalkEventBus from './spacewalkEventBus.js'
import {colorRampMaterialProvider} from './app.js'

class TraceNavigator {
    constructor(container) {

        this.container = container

        this.howmany = undefined

        this.header = container.querySelector('#spacewalk-trace-navigator-header')
        this.footer = container.querySelector('#spacewalk-trace-navigator-footer')

        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        if ("DidSelectTrace" === type) {

            this.repaint()

        } else if ("DidLoadEnsembleFile" === type) {

            const { genomicStart, genomicEnd } = data

            this.footer.innerText = `${ Math.round(genomicStart / 1e6) }Mb`
            this.header.innerText = `${ Math.round(genomicEnd / 1e6) }Mb`

            this.repaint()
        }

    }

    repaint() {
        colorRampMaterialProvider.repaint()
    }

    resize(sceneManagerContainer) {
        const { height } = sceneManagerContainer.getBoundingClientRect()

        this.container.style.height = `${ height }px`

        colorRampMaterialProvider.resize()
    }
}

export default TraceNavigator
