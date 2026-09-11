/**
 * 对比本地与线上词库差异
 * 词条唯一键：词 + 编码；权重/备注不同视为「内容变更」
 */

/**
 * @param {object} dict Dict 实例
 * @returns {{key: string, word: string, code: string, priority: string, note: string, groupName: string}[]}
 */
function flattenDictWords(dict) {
    if (!dict || !Array.isArray(dict.wordsOrigin)) {
        return []
    }
    const list = []
    if (dict.isGroupMode) {
        dict.wordsOrigin.forEach(group => {
            const groupName = group.groupName || ''
            ;(group.dict || []).forEach(w => {
                list.push({
                    key: `${w.word}\t${w.code}`,
                    word: w.word,
                    code: w.code,
                    priority: w.priority || '',
                    note: w.note || '',
                    groupName,
                })
            })
        })
    } else {
        dict.wordsOrigin.forEach(w => {
            list.push({
                key: `${w.word}\t${w.code}`,
                word: w.word,
                code: w.code,
                priority: w.priority || '',
                note: w.note || '',
                groupName: '',
            })
        })
    }
    return list
}

function wordSignature(item) {
    return `${item.priority}\t${item.note}`
}

/**
 * @param {object} localDict
 * @param {object|null} remoteDict 无线上备份时传 null
 * @returns {{
 *   localCount: number,
 *   remoteCount: number,
 *   onlyLocal: object[],
 *   onlyRemote: object[],
 *   changed: {local: object, remote: object}[],
 *   sameCount: number,
 *   hasRemote: boolean,
 *   isIdentical: boolean
 * }}
 */
function compareDicts(localDict, remoteDict) {
    const localWords = flattenDictWords(localDict)
    const remoteWords = remoteDict ? flattenDictWords(remoteDict) : []

    const localMap = new Map()
    localWords.forEach(item => localMap.set(item.key, item))

    const remoteMap = new Map()
    remoteWords.forEach(item => remoteMap.set(item.key, item))

    const onlyLocal = []
    const onlyRemote = []
    const changed = []
    let sameCount = 0

    localMap.forEach((localItem, key) => {
        if (!remoteMap.has(key)) {
            onlyLocal.push(localItem)
            return
        }
        const remoteItem = remoteMap.get(key)
        if (wordSignature(localItem) === wordSignature(remoteItem)) {
            sameCount += 1
        } else {
            changed.push({ local: localItem, remote: remoteItem })
        }
    })

    remoteMap.forEach((remoteItem, key) => {
        if (!localMap.has(key)) {
            onlyRemote.push(remoteItem)
        }
    })

    const hasRemote = !!remoteDict
    const isIdentical = hasRemote
        && onlyLocal.length === 0
        && onlyRemote.length === 0
        && changed.length === 0

    return {
        localCount: localWords.length,
        remoteCount: remoteWords.length,
        onlyLocal,
        onlyRemote,
        changed,
        sameCount,
        hasRemote,
        isIdentical,
    }
}

module.exports = {
    flattenDictWords,
    compareDicts,
}
