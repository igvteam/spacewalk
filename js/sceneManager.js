import { globalEventBus } from "./main.js";

class SceneManager {
    constructor() {
        globalEventBus.subscribe("DidLoadSequence", this);
        globalEventBus.subscribe("DidLoadDemoTrack", this);
    }

    receiveEvent(event) {

        if ("DidLoadSequence" === event.type) {
            console.log("Neat! " + event.type);
        } else if ("DidLoadDemoTrack" === event.type) {
            console.log("Very cool! " + event.type);
        }

    }

}

export default SceneManager;
