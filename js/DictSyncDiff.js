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

const Word = require('./Word')
const WordGroup = require('./WordGroup')
const Dict = require('./Dict')

function entryKey(groupName, word, code) {
    return `${groupName || ''}\t${word}\t${code}`
}

function itemFromWord(word, groupName) {
    return {
        key: entryKey(groupName, word.word, word.code),
        word: word.word,
        code: word.code,
        priority: word.priority || '',
        note: word.note || '',
        groupName: groupName || '',
    }
}

// 键带分组名，和 macOS 自动同步一致，避免不同分组里的同词同码被当成一条。
function indexDict(dict) {
    const map = new Map()
    if (!dict || !Array.isArray(dict.wordsOrigin)) return map
    if (dict.isGroupMode) {
        dict.wordsOrigin.forEach(group => {
            const groupName = group.groupName || ''
            ;(group.dict || []).forEach(word => {
                const item = itemFromWord(word, groupName)
                map.set(item.key, item)
            })
        })
    } else {
        dict.wordsOrigin.forEach(word => {
            const item = itemFromWord(word, '')
            map.set(item.key, item)
        })
    }
    return map
}

function sameContent(left, right) {
    return left.priority === right.priority
        && left.note === right.note
        && left.groupName === right.groupName
}

function mapsEqual(left, right) {
    if (left.size !== right.size) return false
    for (const [key, item] of left) {
        const other = right.get(key)
        if (!other || !sameContent(item, other)) return false
    }
    return true
}

// 有快照时：只一边改过就采用那边；两边都改且内容不同则冲突，保留本地。
// 没有快照时，云端独有词默认视为对方新增；dropRemoteOnlyWithoutBase 时视为本地已删除，避免保存后又被填回来。
function pick(base, local, remote, dropRemoteOnlyWithoutBase) {
    if (local && remote && sameContent(local, remote)) return { type: 'use', item: local }
    if (!base && local && remote) return { type: 'conflict', item: local }
    if (base && local && remote) {
        const localChanged = !sameContent(local, base)
        const remoteChanged = !sameContent(remote, base)
        if (localChanged && remoteChanged) return { type: 'conflict', item: local }
        if (remoteChanged) return { type: 'use', item: remote }
        return { type: 'use', item: local }
    }
    if (base && local && !remote) {
        if (sameContent(local, base)) return { type: 'drop' }
        return { type: 'conflict', item: local }
    }
    if (base && !local && remote) {
        // 本地删了，云端还是上次同步的内容：删除成立。
        if (sameContent(remote, base)) return { type: 'drop' }
        return { type: 'conflict', item: remote }
    }
    if (local && !remote) return { type: 'use', item: local }
    if (!local && remote) {
        if (!base && dropRemoteOnlyWithoutBase) return { type: 'drop' }
        return { type: 'use', item: remote }
    }
    return { type: 'drop' }
}

/**
 * 对照上次同步快照做三方合并。nextChosen 只推进双方已经一致的词条。
 * @returns {{
 *   chosen: Map,
 *   nextChosen: Map,
 *   conflicts: object[],
 *   tookRemote: number,
 *   dropped: number,
 *   removedByLocal: number,
 *   needsUpload: boolean,
 *   localChanged: boolean
 * }}
 */
function threeWayMerge(baseDict, localDict, remoteDict, options = {}) {
    const dropRemoteOnlyWithoutBase = !!options.dropRemoteOnlyWithoutBase
    const baseMap = indexDict(baseDict)
    const localMap = indexDict(localDict)
    const remoteMap = indexDict(remoteDict)
    const keys = new Set([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()])

    const chosen = new Map()
    const conflictKeys = new Set()
    const conflicts = []
    let tookRemote = 0
    let dropped = 0
    let removedByLocal = 0

    Array.from(keys).sort().forEach(key => {
        const decision = pick(baseMap.get(key), localMap.get(key), remoteMap.get(key), dropRemoteOnlyWithoutBase)
        if (decision.type === 'use') {
            chosen.set(key, decision.item)
            const remoteItem = remoteMap.get(key)
            if (remoteItem && sameContent(decision.item, remoteItem)) {
                const localItem = localMap.get(key)
                if (!localItem || !sameContent(localItem, remoteItem)) tookRemote += 1
            }
        } else if (decision.type === 'drop') {
            if (localMap.has(key)) dropped += 1
            if (!localMap.has(key) && remoteMap.has(key)) removedByLocal += 1
        } else if (decision.type === 'conflict') {
            conflicts.push(decision.item)
            conflictKeys.add(key)
            if (localMap.has(key)) chosen.set(key, localMap.get(key))
        }
    })

    const mergedMap = chosen
    let nextChosen
    if (conflictKeys.size === 0) {
        nextChosen = mergedMap
    } else {
        nextChosen = new Map()
        remoteMap.forEach((item, key) => {
            if (conflictKeys.has(key)) {
                if (baseMap.has(key)) nextChosen.set(key, baseMap.get(key))
                return
            }
            const kept = chosen.get(key)
            if (kept && sameContent(kept, item)) nextChosen.set(key, item)
        })
        conflictKeys.forEach(key => {
            if (baseMap.has(key)) nextChosen.set(key, baseMap.get(key))
        })
    }

    return {
        chosen,
        nextChosen,
        conflicts,
        tookRemote,
        dropped,
        removedByLocal,
        needsUpload: conflictKeys.size === 0 && !mapsEqual(mergedMap, remoteMap),
        localChanged: !mapsEqual(mergedMap, localMap),
    }
}

// 按本地分组顺序留下选中的词；分组变了或是新词则追加到对应组。
function applyChosen(dict, chosen) {
    const used = new Set()
    if (dict.isGroupMode) {
        dict.wordsOrigin.forEach(group => {
            const groupName = group.groupName || ''
            const kept = []
            ;(group.dict || []).forEach(entry => {
                const key = entryKey(groupName, entry.word, entry.code)
                const item = chosen.get(key)
                if (!item) return
                entry.priority = item.priority
                entry.note = item.note
                kept.push(entry)
                used.add(key)
            })
            group.dict = kept
        })
    } else {
        const kept = []
        dict.wordsOrigin.forEach(entry => {
            const key = entryKey('', entry.word, entry.code)
            const item = chosen.get(key)
            if (!item) return
            entry.priority = item.priority
            entry.note = item.note
            kept.push(entry)
            used.add(key)
        })
        dict.wordsOrigin = kept
    }
    chosen.forEach(item => {
        if (used.has(item.key)) return
        dict.lastIndex += 1
        const word = new Word(dict.lastIndex, item.code, item.word, item.priority, item.note)
        if (dict.isGroupMode || item.groupName) {
            let group = dict.wordsOrigin.find(g => (g.groupName || '') === item.groupName)
            if (!group) {
                dict.lastGroupIndex += 1
                group = new WordGroup(dict.lastGroupIndex, item.groupName, [], false)
                dict.wordsOrigin.push(group)
                dict.isGroupMode = true
            }
            group.dict.push(word)
        } else {
            dict.wordsOrigin.push(word)
        }
        used.add(item.key)
    })
    if (typeof dict.buildCodeIndex === 'function') dict.buildCodeIndex()
}

// 用合并结果做出一份只用于记快照的词库，不改正在编辑的那份。
function snapshotDict(template, chosen) {
    const dict = new Dict(null, template.fileName, template.filePath)
    dict.header = template.header
    dict.isGroupMode = !!template.isGroupMode
    dict.lastIndex = 0
    dict.lastGroupIndex = 0
    if (template.isGroupMode) {
        dict.wordsOrigin = template.wordsOrigin.map(group => {
            dict.lastGroupIndex += 1
            return new WordGroup(dict.lastGroupIndex, group.groupName, [], false)
        })
    } else {
        dict.wordsOrigin = []
    }
    applyChosen(dict, chosen)
    return dict
}

module.exports = {
    flattenDictWords,
    compareDicts,
    threeWayMerge,
    applyChosen,
    snapshotDict,
}
