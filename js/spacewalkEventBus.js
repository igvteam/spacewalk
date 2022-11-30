
let subscribers = {};

class SpacewalkEventBus {

    constructor() {
        this.stack = []
    }

    subscribe (eventType, object) {

        let subscriberList = subscribers[ eventType ];
        if (undefined === subscriberList) {
            subscriberList = [];
            subscribers[ eventType ] = subscriberList;
        }
        subscriberList.push(object);
    }

    unsubscribe(eventType, object) {
        const current = [...subscribers[ eventType ]]
        subscribers[ eventType ] = current.filter(candidate => candidate !== object)
    }

    post (event) {

        if (this._hold) {
            this.stack.push(event)
        } else {

            const subscriberList = subscribers[ event.type ]
            if (subscriberList) {

                for (let subscriber of subscriberList) {

                    if ("function" === typeof subscriber.receiveEvent) {
                        subscriber.receiveEvent(event);
                    } else if ("function" === typeof subscriber) {
                        subscriber(event);
                    }
                }
            }

        }

    }

    isHeld() {
        return true === this._hold
    }

    hold() {
        this._hold = true;
    }

    release() {
        this._hold = false;
        for (let event of this.stack) {
            this.post(event)
        }
        this.stack = []
    }

}

SpacewalkEventBus.globalBus = new SpacewalkEventBus();

export default SpacewalkEventBus;
