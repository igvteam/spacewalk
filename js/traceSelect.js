import SpacewalkEventBus from "./spacewalkEventBus.js"
import {ensembleManager} from "./app.js"
import {clamp} from "./math.js"

let currentNumber = undefined

class TraceSelect {

  constructor() {

      this.howmany = undefined

      this.input = document.querySelector('#spacewalk_trace_select_input')
      this.input.addEventListener('keyup', (e) => {

          // enter (return) key pressed
          if (13 === e.keyCode) {
              broadcastTraceSelection(this.input, clamp(parseInt(this.input.value, 10), 0, this.howmany - 1), this.howmany)
          }

      })

      const button_minus = document.querySelector('#spacewalk_trace_select_button_minus')
      button_minus.addEventListener('click', (e) => broadcastTraceSelection(this.input, clamp(currentNumber - 1, 0, this.howmany - 1), this.howmany))

      const button_plus = document.querySelector('#spacewalk_trace_select_button_plus')
      button_plus.addEventListener('click', (e)  => broadcastTraceSelection(this.input, clamp(currentNumber + 1, 0, this.howmany - 1), this.howmany));


      SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this)

  }

    receiveEvent({ type, data }) {
        if ("DidLoadEnsembleFile" === type) {

            this.howmany = Object.keys(ensembleManager.ensemble).length

            const { initialKey } = data
            currentNumber = parseInt(initialKey, 10)

            this.input.value = `${ currentNumber } of ${ this.howmany }`

        }
    }
}

function broadcastTraceSelection(input, number, howmany) {

    input.value = `${ number } of ${ howmany }`

    currentNumber = number;
    const key = currentNumber.toString();

    window.setTimeout(() => {
        const trace = ensembleManager.getTraceWithName(key);
        ensembleManager.currentTrace = trace;
        SpacewalkEventBus.globalBus.post({ type: "DidSelectTrace", data: { trace } });
    }, 0);
}

export default TraceSelect
