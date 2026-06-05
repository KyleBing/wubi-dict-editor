const EOL = '\n'

function getUnicodeStringLength(str) {
    let wordLength = 0
    for (const letter of str) {
        wordLength = wordLength + 1
    }
    return wordLength
}

function wordFromLine(index, lineStr) {
    const wordArray = lineStr.split('\t')
    let code = wordArray[1]
    code = code.replaceAll('\r', '')
    return {
        id: index,
        code,
        word: wordArray[0],
        priority: wordArray[2] || '',
        note: wordArray[3] || '',
        indicator: '',
    }
}

function wordToYamlString(word) {
    if (word.priority && word.note) {
        return word.word + '\t' + word.code + '\t' + word.priority + '\t' + word.note
    }
    if (word.priority) {
        return word.word + '\t' + word.code + '\t' + word.priority
    }
    if (word.note) {
        return word.word + '\t' + word.code + '\t' + word.priority + '\t' + word.note
    }
    return word.word + '\t' + word.code
}

function parseNormalMode(body) {
    const startPoint = Date.now()
    body = body.replace(/\r\n/g, '\n')
    const lines = body.split(EOL)
    const lastIndex = lines.length
    const linesValid = lines.filter(item => item.indexOf('\t') > -1)
    const dictSetExceptCharacter = []
    const dictSet = new Set()
    const wordsOrigin = linesValid.map((item, index) => {
        const currentWord = wordFromLine(index, item)
        dictSet.add(currentWord.word)
        return currentWord
    })
    dictSet.forEach(w => dictSetExceptCharacter.push(w))
    console.log(`处理yaml码表文件：完成，共：${wordsOrigin.length} 条，用时 ${Date.now() - startPoint} ms`)
    return { wordsOrigin, lastIndex, lastGroupIndex: 0, dictSetExceptCharacter }
}

function parseGroupMode(body) {
    const startPoint = Date.now()
    body = body.replace(/\r\n/g, '\n')
    const lines = body.split(EOL)
    const wordsGroup = []
    let temp = null
    let lastItemIsEmptyLine = false
    let lastGroupIndex = 0
    const lastIndex = lines.length

    lines.forEach((item, index) => {
        if (item.startsWith('##')) {
            if (temp && temp.groupName) {
                wordsGroup.push(temp)
            }
            temp = { id: lastGroupIndex++, groupName: item.substring(3).trim(), dict: [] }
            lastItemIsEmptyLine = false
        } else if (item.indexOf('\t') > -1) {
            if (!temp) {
                temp = { id: lastGroupIndex++, groupName: '', dict: [] }
            }
            temp.dict.push(wordFromLine(index, item))
            lastItemIsEmptyLine = false
        } else if (item.startsWith('#')) {
            lastItemIsEmptyLine = false
        } else {
            if (!lastItemIsEmptyLine) {
                if (temp) {
                    temp.groupName = temp.groupName || '未命名'
                    wordsGroup.push(temp)
                    temp = { id: lastGroupIndex++, groupName: '', dict: [] }
                }
            }
            lastItemIsEmptyLine = true
        }
    })

    console.log(`处理yaml码表文件：完成，共：${wordsGroup.length} 组，用时 ${Date.now() - startPoint} ms`)
    if (temp && temp.dict.length > 0) {
        wordsGroup.push(temp)
    }
    const dictSetExceptCharacter = []
    wordsGroup.forEach(group => group.dict.forEach(w => {
        if (!dictSetExceptCharacter.includes(w.word)) {
            dictSetExceptCharacter.push(w.word)
        }
    }))
    return { wordsOrigin: wordsGroup, lastIndex, lastGroupIndex, dictSetExceptCharacter }
}

function parseDictFile(fileContent, isForceProcessInUngroupMode) {
    const indexEndOfHeader = fileContent.indexOf('...')
    if (indexEndOfHeader < 0) {
        throw new Error('文件格式错误，没有 ... 这一行')
    }
    const headerEnd = indexEndOfHeader + 3
    const header = fileContent.substring(0, headerEnd)
    const isGroupMode = header.includes('dict_grouped: true')
    const body = fileContent.substring(headerEnd)
    let parsedBody

    if (isForceProcessInUngroupMode) {
        parsedBody = parseNormalMode(body)
    } else if (isGroupMode) {
        parsedBody = parseGroupMode(body)
    } else {
        parsedBody = parseNormalMode(body)
    }

    return {
        header,
        indexEndOfHeader: headerEnd,
        isGroupMode: isForceProcessInUngroupMode ? false : isGroupMode,
        fileName: '',
        filePath: '',
        ...parsedBody,
    }
}

function serializeDictYaml(parsed) {
    const startPoint = Date.now()
    let yamlBody
    if (parsed.isGroupMode) {
        yamlBody = parsed.wordsOrigin
            .map(group => {
                const groupHeader = `## ${group.groupName}${EOL}`
                const lines = group.dict.map(wordToYamlString)
                return groupHeader + lines.join(EOL)
            })
            .join(EOL + EOL)
    } else {
        yamlBody = parsed.wordsOrigin.map(wordToYamlString).join(EOL)
    }
    const result = parsed.header + EOL + yamlBody
    console.log(`词条文本已生成，用时 ${Date.now() - startPoint} ms`)
    return result
}

function dictToPlainObject(dict) {
    if (dict.isGroupMode) {
        return {
            header: dict.header,
            isGroupMode: true,
            wordsOrigin: dict.wordsOrigin.map(group => ({
                id: group.id,
                groupName: group.groupName,
                dict: group.dict.map(w => ({
                    id: w.id,
                    code: w.code,
                    word: w.word,
                    priority: w.priority,
                    note: w.note,
                    indicator: w.indicator || '',
                })),
            })),
        }
    }
    return {
        header: dict.header,
        isGroupMode: false,
        wordsOrigin: dict.wordsOrigin.map(w => ({
            id: w.id,
            code: w.code,
            word: w.word,
            priority: w.priority,
            note: w.note,
            indicator: w.indicator || '',
        })),
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseDictFile,
        serializeDictYaml,
        dictToPlainObject,
        wordToYamlString,
        getUnicodeStringLength,
    }
}
