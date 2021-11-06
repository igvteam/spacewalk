
let subscribers = {};

class SpacewalkEventBus {
    constructor() {

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

    }

    post (event) {

        const subscriberList = subscribers[ event.type ];
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

SpacewalkEventBus.globalBus = new SpacewalkEventBus();

export default SpacewalkEventBus;
