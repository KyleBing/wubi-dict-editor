importScripts('dictParseCore.js')

self.onmessage = function (event) {
    try {
        const { fileContent, isForceProcessInUngroupMode } = event.data
        const parsed = parseDictFile(fileContent, isForceProcessInUngroupMode)
        self.postMessage({ ok: true, parsed })
    } catch (error) {
        self.postMessage({ ok: false, error: error.message || String(error) })
    }
}
