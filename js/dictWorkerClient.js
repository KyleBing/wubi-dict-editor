const path = require('path')
const { parseDictFile, serializeDictYaml, dictToPlainObject } = require('./dictParseCore')

const PARSE_WORKER_THRESHOLD = 50000
const SERIALIZE_WORKER_THRESHOLD = 10000

function runWorker(workerFile, payload) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, workerFile))
        worker.onmessage = (event) => {
            worker.terminate()
            if (event.data.ok) {
                resolve(event.data)
            } else {
                reject(new Error(event.data.error || 'Worker failed'))
            }
        }
        worker.onerror = (error) => {
            worker.terminate()
            reject(error)
        }
        worker.postMessage(payload)
    })
}

function parseDictAsync(fileContent, isForceProcessInUngroupMode) {
    if (!fileContent || fileContent.length < PARSE_WORKER_THRESHOLD || typeof Worker === 'undefined') {
        return Promise.resolve(parseDictFile(fileContent, isForceProcessInUngroupMode))
    }
    return runWorker('dictParseWorker.js', { fileContent, isForceProcessInUngroupMode })
        .then(result => result.parsed)
}

function serializeDictAsync(dict) {
    const plain = dictToPlainObject(dict)
    const wordCount = plain.isGroupMode
        ? plain.wordsOrigin.reduce((sum, group) => sum + group.dict.length, 0)
        : plain.wordsOrigin.length

    if (wordCount < SERIALIZE_WORKER_THRESHOLD || typeof Worker === 'undefined') {
        return Promise.resolve(serializeDictYaml(plain))
    }
    return runWorker('yamlSerializeWorker.js', { plain })
        .then(result => result.yaml)
}

module.exports = {
    parseDictAsync,
    serializeDictAsync,
}
