function postMessageToWorker(worker, message) {

    return new Promise((resolve, reject) => {

        worker.postMessage(message)

        worker.addEventListener('message', function handler(event) {
            worker.removeEventListener('message', handler)
            resolve(event.data);
        });

        worker.addEventListener('error', (err) => {
            reject(err)
        });
    });
}

export { postMessageToWorker }
