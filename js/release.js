async function showRelease() {

    let data
    try {
        const response = await fetch('https://api.github.com/repos/igvteam/spacewalk/releases/latest')
        data = await response.json()
    } catch(error) {
        console.error('Error fetching release tag:', error)
    }

    return data
}

export { showRelease }
