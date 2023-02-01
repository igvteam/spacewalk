import SpacewalkEventBus from "./spacewalkEventBus.js"
import {ensembleManager} from "./app.js"
import {clamp} from "./math.js"

let currentNumber = undefined

class TraceSelect {

  constructor() {

      this.input = document.querySelector('#spacewalk_trace_select_input')
      this.input.addEventListener('keyup', async e => {

          // enter (return) key pressed
          if (13 === e.keyCode) {
              const howmany = await ensembleManager.getTraceCount()
              await broadcastTraceSelection(this.input, clamp(parseInt(this.input.value, 10), 0, howmany - 1), howmany)
          }

      })

      const button_minus = document.querySelector('#spacewalk_trace_select_button_minus')
      button_minus.addEventListener('click', async () => {
          const howmany = await ensembleManager.getTraceCount()
          await broadcastTraceSelection(this.input, clamp(currentNumber - 1, 0, howmany - 1), howmany)
      })

      const button_plus = document.querySelector('#spacewalk_trace_select_button_plus')
      button_plus.addEventListener('click', async () => {
          const howmany = await ensembleManager.getTraceCount()
          await broadcastTraceSelection(this.input, clamp(currentNumber + 1, 0, howmany - 1), howmany)
      });


      SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this)

  }

    receiveEvent({ type, data }) {
        if ("DidLoadEnsembleFile" === type) {

            (async () => {
                currentNumber = data.initialIndex
                const traceCount = await ensembleManager.getTraceCount()
                this.input.value = `${ currentNumber } of ${ traceCount }`
            })()

        }
    }
}

async function broadcastTraceSelection(input, number, howmany) {

    input.value = `${ number } of ${ howmany }`

    currentNumber = number;

    ensembleManager.currentTrace = await ensembleManager.createTrace(currentNumber)
    ensembleManager.currentIndex = currentNumber

    SpacewalkEventBus.globalBus.post({ type: "DidSelectTrace", data: { trace: ensembleManager.currentTrace } })
}

export default TraceSelect
