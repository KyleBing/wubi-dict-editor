const Word = require('./Word')
const {getUnicodeStringLength} = require('./Utility')

function yieldToMainThread() {
    return new Promise(resolve => setTimeout(resolve, 0))
}

function buildCharPinyinMap(pinyinDict) {
    const map = new Map()
    const eachWord = (word) => {
        if (getUnicodeStringLength(word.word) === 1 && word.code) {
            if (!map.has(word.word)) {
                map.set(word.word, word.code)
            }
        }
    }
    if (pinyinDict.isGroupMode) {
        pinyinDict.wordsOrigin.forEach(group => group.dict.forEach(eachWord))
    } else {
        pinyinDict.wordsOrigin.forEach(eachWord)
    }
    return map
}

function findExactCode(pinyinDict, wordText) {
    if (pinyinDict.isGroupMode) {
        for (const group of pinyinDict.wordsOrigin) {
            const matched = group.dict.find(item => item.word === wordText)
            if (matched) {
                return matched.code
            }
        }
        return null
    }
    const matched = pinyinDict.wordsOrigin.find(item => item.word === wordText)
    return matched ? matched.code : null
}

function pinyinDictHasWord(pinyinDict, wordText) {
    return Boolean(findExactCode(pinyinDict, wordText))
}

function generatePinyinCode(wordText, charPinyinMap) {
    const chars = [...wordText]
    const codes = chars.map(ch => charPinyinMap.get(ch))
    if (codes.some(code => !code)) {
        return null
    }
    return codes.join(' ')
}

/**
 * 将选中词条转换为可写入拼音词库的 Word 列表
 */
function prepareWordsForPinyinDict(selectedWords, pinyinDict, nextIdStart) {
    const charPinyinMap = buildCharPinyinMap(pinyinDict)
    const toAdd = []
    const skipped = []
    const failed = []
    let nextId = nextIdStart

    selectedWords.forEach(sourceWord => {
        if (pinyinDictHasWord(pinyinDict, sourceWord.word)) {
            skipped.push(sourceWord.word)
            return
        }

        let pinyinCode = findExactCode(pinyinDict, sourceWord.word)
        if (!pinyinCode) {
            pinyinCode = generatePinyinCode(sourceWord.word, charPinyinMap)
        }

        if (!pinyinCode) {
            failed.push(sourceWord.word)
            return
        }

        toAdd.push(new Word(
            nextId++,
            pinyinCode,
            sourceWord.word,
            sourceWord.priority || '',
            sourceWord.note || ''
        ))
    })

    return { toAdd, skipped, failed, nextId }
}

async function prepareWordsForPinyinDictAsync(selectedWords, pinyinDict, nextIdStart, onProgress) {
    if (onProgress) {
        onProgress(0, selectedWords.length, '正在分析拼音词库...')
    }
    await yieldToMainThread()

    const charPinyinMap = buildCharPinyinMap(pinyinDict)
    const toAdd = []
    const skipped = []
    const failed = []
    let nextId = nextIdStart

    for (let i = 0; i < selectedWords.length; i++) {
        const sourceWord = selectedWords[i]
        if (pinyinDictHasWord(pinyinDict, sourceWord.word)) {
            skipped.push(sourceWord.word)
        } else {
            let pinyinCode = findExactCode(pinyinDict, sourceWord.word)
            if (!pinyinCode) {
                pinyinCode = generatePinyinCode(sourceWord.word, charPinyinMap)
            }
            if (!pinyinCode) {
                failed.push(sourceWord.word)
            } else {
                toAdd.push(new Word(
                    nextId++,
                    pinyinCode,
                    sourceWord.word,
                    sourceWord.priority || '',
                    sourceWord.note || ''
                ))
            }
        }

        if (onProgress && (i % 5 === 0 || i === selectedWords.length - 1)) {
            onProgress(i + 1, selectedWords.length, `正在转换拼音（${i + 1}/${selectedWords.length}）...`)
            await yieldToMainThread()
        }
    }

    return { toAdd, skipped, failed, nextId }
}

function insertWordToPinyinDict(pinyinDict, targetWords, word) {
    const insetPosition = findPinyinInsertIndex(targetWords, word)
    const wordInsert = word.clone()
    wordInsert.setId(pinyinDict.lastIndex++)
    targetWords.splice(insetPosition, 0, wordInsert)
}

async function addWordsToPinyinDictInOrderAsync(pinyinDict, words, groupIndex = -1, onProgress) {
    let targetWords
    if (pinyinDict.isGroupMode && groupIndex !== -1) {
        targetWords = pinyinDict.wordsOrigin[groupIndex].dict
    } else {
        targetWords = pinyinDict.wordsOrigin
    }

    for (let i = 0; i < words.length; i++) {
        insertWordToPinyinDict(pinyinDict, targetWords, words[i])
        if (onProgress && (i % 10 === 0 || i === words.length - 1)) {
            onProgress(i + 1, words.length, `正在插入词条（${i + 1}/${words.length}）...`)
            await yieldToMainThread()
        }
    }
    pinyinDict.buildCodeIndex()
}

function comparePinyinWordOrder(a, b) {
    const lenA = getUnicodeStringLength(a.word)
    const lenB = getUnicodeStringLength(b.word)
    if (lenA !== lenB) {
        return lenA - lenB
    }
    const codeA = (a.code || '').toLowerCase()
    const codeB = (b.code || '').toLowerCase()
    if (codeA < codeB) return -1
    if (codeA > codeB) return 1
    return 0
}

function findPinyinInsertIndex(words, word) {
    for (let i = 0; i < words.length; i++) {
        if (comparePinyinWordOrder(word, words[i]) < 0) {
            return i
        }
    }
    return words.length
}

/**
 * 按拼音词库规则插入：先按字数，再按编码 a-z
 */
function addWordsToPinyinDictInOrder(pinyinDict, words, groupIndex = -1) {
    let targetWords
    if (pinyinDict.isGroupMode && groupIndex !== -1) {
        targetWords = pinyinDict.wordsOrigin[groupIndex].dict
    } else {
        targetWords = pinyinDict.wordsOrigin
    }
    words.forEach(word => {
        insertWordToPinyinDict(pinyinDict, targetWords, word)
    })
    pinyinDict.buildCodeIndex()
}

module.exports = {
    prepareWordsForPinyinDict,
    prepareWordsForPinyinDictAsync,
    pinyinDictHasWord,
    addWordsToPinyinDictInOrder,
    addWordsToPinyinDictInOrderAsync,
    comparePinyinWordOrder,
}
