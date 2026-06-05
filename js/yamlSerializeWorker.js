importScripts('dictParseCore.js')

self.onmessage = function (event) {
    try {
        const yaml = serializeDictYaml(event.data.plain)
        self.postMessage({ ok: true, yaml })
    } catch (error) {
        self.postMessage({ ok: false, error: error.message || String(error) })
    }
}
