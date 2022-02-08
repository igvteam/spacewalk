function distanceTo(a, b) {
    return Math.sqrt( distanceToSquared(a, b) )
}

function distanceToSquared(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
    return dx * dx + dy * dy + dz * dz
}

export { distanceTo }
