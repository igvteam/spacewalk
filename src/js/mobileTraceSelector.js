import SpacewalkEventBus from "./spacewalkEventBus.js"
import {clamp} from "./utils/mathUtils.js"
import {StringUtils} from "igv-utils";

let numberForDisplay = undefined

class MobileTraceSelector {

  constructor(displayElement, minusButton, plusButton, ensembleManager) {

      this.ensembleManager = ensembleManager;
      this.display = displayElement;
      this.minusButton = minusButton;
      this.plusButton = plusButton;

      // Add click event listeners to buttons
      this.minusButton.addEventListener('click', async () => {
          const total = await this.ensembleManager.getTraceCount()
          await broadcastTraceSelection(this.display, getBroadcastValue(numberForDisplay, total, '-'), total, this.ensembleManager)
      })

      this.plusButton.addEventListener('click', async () => {
          const total = await this.ensembleManager.getTraceCount()
          await broadcastTraceSelection(this.display, getBroadcastValue(numberForDisplay, total, '+'), total, this.ensembleManager)
      });

      SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this)

  }

    receiveEvent({ type, data }) {
        if ("DidLoadEnsembleFile" === type) {

            (async () => {
                const total = await this.ensembleManager.getTraceCount()
                numberForDisplay = 1 + data.initialIndex
                this.display.textContent = getDisplayString(numberForDisplay, total)
            })()

        }
    }
}

function getDisplayString(number, total) {
    return `${ StringUtils.numberFormatter(number) } of ${ StringUtils.numberFormatter(total) }`
}

function getBroadcastValue(number, total, incrementOrDecrement) {

    if ('-' === incrementOrDecrement) {
        return clamp(number - 1, 1, total)
    } else if ('+' === incrementOrDecrement) {
        return clamp(number + 1, 1, total)
    } else {
        return clamp(number, 1, total)
    }

}

async function broadcastTraceSelection(display, number, total, ensembleManager) {

    if (numberForDisplay !== number) {
        console.log(`MobileTraceSelector. Will change number from ${StringUtils.numberFormatter(numberForDisplay)} to ${StringUtils.numberFormatter(number)}`)

        numberForDisplay = number

        display.textContent = getDisplayString(numberForDisplay, total)

        const index = numberForDisplay - 1

        ensembleManager.currentTrace = await ensembleManager.createTrace(index)
        ensembleManager.currentIndex = index

        SpacewalkEventBus.globalBus.post({type: "DidSelectTrace", data: {trace: ensembleManager.currentTrace}})
    }
}

export default MobileTraceSelector
