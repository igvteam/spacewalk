import SpacewalkEventBus from "./spacewalkEventBus.js"
import {ensembleManager} from "./app.js"
import {clamp} from "./math.js"

let currentNumber = undefined

class TraceSelect {

  constructor() {

      this.input = document.querySelector('#spacewalk_trace_select_input')
      this.input.addEventListener('keyup', (e) => {

          // enter (return) key pressed
          if (13 === e.keyCode) {
              const howmany = ensembleManager.getTraceCount()
              broadcastTraceSelection(this.input, clamp(parseInt(this.input.value, 10), 0, howmany - 1), howmany)
          }

      })

      const button_minus = document.querySelector('#spacewalk_trace_select_button_minus')
      button_minus.addEventListener('click', (e) => {
          const howmany = ensembleManager.getTraceCount()
          broadcastTraceSelection(this.input, clamp(currentNumber - 1, 0, howmany - 1), howmany)
      })

      const button_plus = document.querySelector('#spacewalk_trace_select_button_plus')
      button_plus.addEventListener('click', (e)  => {
          const howmany = ensembleManager.getTraceCount()
          broadcastTraceSelection(this.input, clamp(currentNumber + 1, 0, howmany - 1), howmany)
      });


      SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this)

  }

    receiveEvent({ type, data }) {
        if ("DidLoadEnsembleFile" === type) {
            currentNumber = data.initialIndex
            this.input.value = `${ currentNumber } of ${ ensembleManager.getTraceCount() }`
        }
    }
}

function broadcastTraceSelection(input, number, howmany) {

    input.value = `${ number } of ${ howmany }`

    currentNumber = number;

    window.setTimeout(() => {
        const trace = ensembleManager.ensemble[ currentNumber ]
        ensembleManager.currentTrace = trace
        SpacewalkEventBus.globalBus.post({ type: "DidSelectTrace", data: { trace } })
    }, 0);
}

export default TraceSelect
