function HICEvent (type, data, propogate) {
    return {
        type: type,
        data: data || {},
        propogate: propogate !== undefined ? propogate : true
    }
}
export { HICEvent }
