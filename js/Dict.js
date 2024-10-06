// 字典对象
const Word = require("./Word")
const WordGroup = require("./WordGroup")
const {shakeDom, log, shakeDomFocus, getUnicodeStringLength} = require('./Utility')

const os = require('os')
const EOL = '\n'


class Dict {
    /**
     * @param fileContent  词库内容
     * @param fileName
     * @param filePath
     * @param isForceProcessInUngroupMode 按照非分组模式读取词库
     */
    constructor(fileContent, fileName, filePath, isForceProcessInUngroupMode) {
        this.dictTypeName = 'Dict'
        this.filePath = filePath // 文件路径
        this.fileName = fileName // 文件名字
        this.header = null // 文件头部内容
        this.wordsOrigin = [] // 文件词条数组，groupMode 的时候，是 WordGroup Array，否则是 Word Array
        this.lastIndex = 0 // 最后一个Word Index 的值，用于新添加词时，作为唯一的 id 传入
        this.lastGroupIndex = 0 // 最后一个WordGroup Index 的值，用于新添加词时，作为唯一的 id 传入
        this.isGroupMode = false // 识别码表是否为分组形式的
        this.dictSetExceptCharacter = new Set() // 所有词组的 set


        let indexEndOfHeader = fileContent.indexOf('...')
        if (indexEndOfHeader < 0){
            console.log('文件格式错误，没有 ... 这一行')
        } else {
            this.indexEndOfHeader = indexEndOfHeader + 3
            this.header = fileContent.substring(0, this.indexEndOfHeader)
            this.isGroupMode = this.header.includes('dict_grouped: true') // 根据有没有这一段文字进行判断，是否为分组形式的码表
            let body = fileContent.substring(this.indexEndOfHeader)

            if (isForceProcessInUngroupMode) {
                this.wordsOrigin = this.getDictWordsInNormalMode(body)
            } else if (this.isGroupMode) {
                this.wordsOrigin = this.getDictWordsInGroupMode(body)
            } else {
                this.wordsOrigin = this.getDictWordsInNormalMode(body)
            }
            // console.log('处理后的词条：',this.wordsOrigin)
        }
    }
    // 总的词条数量
    get countDictOrigin(){
        if (this.isGroupMode){
            let countOrigin = 0
            this.wordsOrigin.forEach(group => {
                countOrigin = countOrigin + group.dict.length
            })
            return countOrigin
        } else {
            return this.wordsOrigin.length
        }
    }

    // 返回所有 word
    getDictWordsInNormalMode(fileContent){
        let startPoint = new Date().getTime()
        fileContent = fileContent.replace(/\r\n/g,'\n')
        let lines = fileContent.split(EOL) // 拆分词条与编码成单行
        this.lastIndex = lines.length
        let linesValid = lines.filter(item => item.indexOf('\t') > -1) // 选取包含 \t 的行
        let words = []
        linesValid.forEach((item, index) => {
            let currentWord = getWordFromLine(index, item)
            this.dictSetExceptCharacter.add(currentWord.word)
            words.push(currentWord) // 获取词条
         })
        console.log(`处理yaml码表文件：完成，共：${words.length } ${this.isGroupMode? '组': '条'}，用时 ${new Date().getTime() - startPoint} ms`)
        return words
    }

    removeDoubleReturn(fileContent){
        if (fileContent.indexOf('\n\n') > -1){
            fileContent = fileContent.replace(/\n\n/g, '\n')
            this.removeDoubleReturn(fileContent)
        } else {
            // fileContent = fileContent.replace(/##/g, '\n##')
            return fileContent
        }
    }

    // 返回 word 分组
    getDictWordsInGroupMode(fileContent){
        // console.log(fileContent)
        let startPoint = new Date().getTime()
        fileContent = fileContent.replace(/\r\n/g,'\n')
        let lines = fileContent.split(EOL) // 拆分词条与编码成单行
        let wordsGroup = [] // 总分组
        let temp = null // 第一个分组
        let lastItemIsEmptyLine = false // 上一条是空，用于循环中判断是否需要新起一个 WordGroup
        this.lastIndex = lines.length
        lines.forEach((item, index) => {
            if (item.startsWith('##')) { // 注释分组
                if (temp && temp.groupName) { // 如果上一个已经有名字了，说明需要保存
                    wordsGroup.push(temp)
                }
                temp = new WordGroup(this.lastGroupIndex++, item.substring(3).trim())
                lastItemIsEmptyLine = false
            } else if (item.indexOf('\t') > -1) { // 是词条
                if (!temp){ // 第一行是词条时，没有分组名时
                    temp = new WordGroup(this.lastGroupIndex++)
                }
                temp.dict.push(getWordFromLine(index, item))
                lastItemIsEmptyLine = false
            } else if (item.startsWith('#')) { // 注释
                console.log(item)
                lastItemIsEmptyLine = false
            } else {
                // 为空行时
                if (lastItemIsEmptyLine){
                    // 上行和本行都是空行
                } else {
                    if (temp){
                        temp.groupName = temp.groupName || '未命名'
                        wordsGroup.push(temp)
                        temp = new WordGroup(this.lastGroupIndex++)
                    }
                }
                lastItemIsEmptyLine = true
            }
        })
        console.log(`处理yaml码表文件：完成，共：${wordsGroup.length } ${this.isGroupMode? '组': '条'}，用时 ${new Date().getTime() - startPoint} ms`)
        if (temp){
            if (temp.dict.length > 0){
                wordsGroup.push(temp) // 加上最后一个
            }
            return wordsGroup
        } else {
            return [] // 文件内容为空时
        }
    }

    // 排序
    sort(groupIndex){
        let startPoint = new Date().getTime()
        if (this.isGroupMode){ // group mode
            if (groupIndex !== -1){ // -1 代表全部
                this.wordsOrigin[groupIndex].dict.sort((a,b) => a.code < b.code ? -1: 1)
            } else {
                this.wordsOrigin.forEach(group => {
                    group.dict.sort((a,b) => a.code < b.code ? -1: 1)
                })
            }
        } else {
            this.wordsOrigin.sort((a,b) => a.code < b.code ? -1: 1)
        }
        console.log(`Sort 用时 ${new Date().getTime() - startPoint} ms`)
    }

    /**
     * 查重，返回重复定义的字词，非编码
     * @param filterSingleCharacter 当包含单字时
     * @param isWithAllRepeatWord
     * @returns {*[]}
     */
    getRepetitionWords(filterSingleCharacter, isWithAllRepeatWord){
        let startPoint = new Date().getTime()
        let wordMap = new Map()
        let repetitionWords = []
        if (this.isGroupMode){
            // 分组模式时
            let groupRepeatedWords = []
            this.wordsOrigin.forEach(wordGroup => {
                wordGroup.dict.forEach(word => {
                    word.indicator = wordGroup.groupName  // +查重的每个词里都标记属于哪个分组
                    if (filterSingleCharacter){
                        if (wordMap.has(word.word) && getUnicodeStringLength(word.word) === 1){
                            groupRepeatedWords.push(word)
                            if (isWithAllRepeatWord){
                                let matchedWord = wordMap.get(word.word) // 获取匹配到的原词条
                                if (matchedWord){
                                    // matchedWord.indicator = wordGroup.groupName
                                    groupRepeatedWords.push(matchedWord)
                                }
                            }
                        } else { // 如果 map 中没有这个词的记录，添加这个记录
                            wordMap.set(word.word, word)
                        }
                    } else {
                        if (wordMap.has(word.word) && getUnicodeStringLength(word.word) > 1){ // 单字没必要查重，所以这里只搜索 2 个字以上的词
                            groupRepeatedWords.push(word)
                            if (isWithAllRepeatWord) {
                                let matchedWord = wordMap.get(word.word)
                                if (matchedWord){
                                    // matchedWord.indicator = wordGroup.groupName
                                    groupRepeatedWords.push(matchedWord)
                                }
                            }
                        } else { // 如果 map 中没有这个词的记录，添加这个记录
                            wordMap.set(word.word, word)
                        }
                    }
                })
            })
            repetitionWords.push(new WordGroup(999, '重复的词条', groupRepeatedWords))
        } else {
            this.wordsOrigin.forEach(word => {
                if (filterSingleCharacter){
                    if (wordMap.has(word.word) && getUnicodeStringLength(word.word) === 1){
                        repetitionWords.push(word)
                        if (isWithAllRepeatWord) {
                            let matchedWord = wordMap.get(word.word)
                            if (matchedWord) repetitionWords.push(matchedWord)
                        }
                    } else { // 如果 map 中没有这个词的记录，添加这个记录
                        wordMap.set(word.word, word)
                    }
                } else {
                    if (wordMap.has(word.word) && getUnicodeStringLength(word.word) > 1){ // 单字没必要查重，所以这里只搜索 2 个字以上的词
                        repetitionWords.push(word)
                        if (isWithAllRepeatWord) {
                            let matchedWord = wordMap.get(word.word)
                            if (matchedWord) repetitionWords.push(matchedWord)
                        }
                    } else { // 如果 map 中没有这个词的记录，添加这个记录
                        wordMap.set(word.word, word)
                    }
                }
            })
        }

        if(this.isGroupMode){
            // 排序后再去除重复项
            repetitionWords[0].dict.sort((a, b) => {
                // console.log(a.word + a.code, b.word + b.code)
                return (a.toComparableString()) > (b.toComparableString())  ? 1 : -1
            })
            console.log('重复词条数量:未去重之前 ', repetitionWords[0].dict.length)
            for (let i = 0; i < repetitionWords[0].dict.length - 1; i++) {
                if (repetitionWords[0].dict[i].id === repetitionWords[0].dict[i + 1].id ) {
                    repetitionWords[0].dict.splice(i,1)
                    i = i - 1
                }
            }
        } else {
            // 排序后再去除重复项
            repetitionWords.sort((a, b) => {
                // console.log(a.word + a.code, b.word + b.code)
                return (a.toComparableString()) > (b.toComparableString())  ? 1 : -1
            })
            console.log('重复词条数量:未去重之前 ', repetitionWords.length)
            for (let i = 0; i < repetitionWords.length - 1; i++) {
                if (repetitionWords[i].id === repetitionWords[i + 1].id ) {
                    repetitionWords.splice(i,1)
                    i = i - 1
                }
            }
        }

        console.log(`查重完成，用时 ${new Date().getTime() - startPoint} ms`)
        console.log('词条字典数量: ', wordMap.size)
        console.log('重复词条数量: ', repetitionWords.length)
        console.log('重复 + 词条字典 = ', repetitionWords.length + wordMap.size)
        console.log('处理之后的：', repetitionWords)
        return repetitionWords
    }


    /**
     * 获取与单字重码的词条
     * @returns {*[]}
     */
    getRepeatedWordsWithSameCode(){
        let startPoint = new Date().getTime()
        let codeMap = new Map()
        let repetitionWords = []

        // 生成单字 code map
        this.wordsOrigin
            .filter(word => getUnicodeStringLength(word.word) === 1)
            .forEach(word => {
                codeMap.set(word.code, word)
            })

        this.wordsOrigin.forEach(word => {
            if (codeMap.has(word.code) && getUnicodeStringLength(word.word) > 1){
                repetitionWords.push(word) // 添加词条
                let matchedWord = codeMap.get(word.code)
                if (matchedWord) repetitionWords.push(matchedWord) // 同时添加跟这个词条相同编码的单字
            }
        })

        // 排序
        repetitionWords.sort((a, b) => {
            // console.log(a.word + a.code, b.word + b.code)
            return (a.isPriorityAbove(b))  ? -1 : 1
        })
        for (let i = 0; i < repetitionWords.length - 1; i++) {
            if (repetitionWords[i].id === repetitionWords[i + 1].id ) {
                repetitionWords.splice(i,1)
                i = i - 1
            }
        }

        console.log('重复词条数量:未去重之前 ', repetitionWords.length)

        console.log(`查重完成，用时 ${new Date().getTime() - startPoint} ms`)
        console.log('词条字典数量: ', codeMap.size)
        console.log('重复词条数量: ', repetitionWords.length)
        console.log('重复 + 词条字典 = ', repetitionWords.length + codeMap.size)
        console.log('处理之后的：', repetitionWords)
        return repetitionWords
    }


    /**
     * 给所有词条添加权重
     * 添加规则：
     * 相同编码的词条，权重依次为 10 20 30 40 50
     * 这样以后添加词条的时候，都可以指定词条的特定位置
     */
    addCommonPriority(){
        this.sort()

        // 1. 将词条根据编码划分成不同分组数组
        let finalWordGroup = [
            // {code: 'ggtt', words: [Word]}
        ]

        let lastCode = ''
        this.wordsOrigin.forEach(word => {
            if (lastCode === word.code){
                finalWordGroup[finalWordGroup.length - 1].words.push(word)
            } else {
                finalWordGroup.push({code: word.code, words: [word]})
                lastCode = word.code
            }
        })

        // 2. 给每个 word 指定需要的权重
        const PRIORITY_GAP = 10
        finalWordGroup.forEach(wordGroupItem => {
            let wordCount = wordGroupItem.words.length
            wordGroupItem.words.forEach((word, index) => {
                word.priority = PRIORITY_GAP * (wordCount - index)
            })
        })
        // console.log(finalWordGroup.filter(item => item.words.length > 1))

    }

    /**
     * 添加新 Word
     * @param word Word
     * @param groupIndex Number
     */
    addNewWord(word, groupIndex){
        if(this.isGroupMode){
            if (groupIndex !== -1){
                this.wordsOrigin[groupIndex].dict.push(word)
            } else {
                let newWordGroup = new WordGroup(this.lastGroupIndex++,'- 未命名 -',[word])
                this.wordsOrigin.unshift(newWordGroup) // 添加到第一组
            }
        } else {
            this.addWordToDictInOrder(word)
        }
        this.lastIndex = this.lastIndex + 1 // 新加的词添加后， lastIndex + 1
    }

    // 依次序添加 words
    addWordsInOrder(words, groupIndex){
        let startPoint = new Date().getTime()
        if (this.isGroupMode && groupIndex !== -1){
            this.addWordToDictInOrderWithGroup(words, groupIndex)
        } else {
            words.forEach(word => {
                this.addWordToDictInOrder(word)
            })
        }
        console.log(`添加 ${words.length } 条词条到指定码表, 用时 ${new Date().getTime() - startPoint} ms`)
    }

    // 依次序添加 word
    addWordToDictInOrder(word){
        let insetPosition = null // 插入位置 index
        for (let i=0; i<this.wordsOrigin.length-1; i++){ // -1 为了避免下面 i+1 为 undefined
            if (word.code >= this.wordsOrigin[i]  && word.code <= this.wordsOrigin[i+1].code){
                insetPosition = i + 1
                break
            }
        }
        if (!insetPosition){  // 没有匹配到任何位置，添加到结尾
            insetPosition = this.wordsOrigin.length
        }
        let wordInsert = word.clone() // 断开与别一个 dict 的引用链接，新建一个 word 对象，不然两个 dict 引用同一个 word
        wordInsert.setId(this.lastIndex++) // 给新的 words 一个新的唯一 id
        this.wordsOrigin.splice(insetPosition, 0, wordInsert)
    }


    // 依次序添加 word groupMode
    addWordToDictInOrderWithGroup(words, groupIndex){
        let dictWords = this.wordsOrigin[groupIndex].dict
        console.log('TODO: add to group')
        words.forEach(word => {
            let insetPosition = null // 插入位置 index
            for (let i=0; i<dictWords.length-1; i++){ // -1 为了避免下面 i+1 为 undefined
                if (word.code >= dictWords[i]  && word.code <= dictWords[i+1].code){
                    insetPosition = i + 1
                    break
                }
            }
            if (!insetPosition){  // 没有匹配到任何位置，添加到结尾
                insetPosition = dictWords.length
            }
            let wordInsert = word.clone() // 断开与别一个 dict 的引用链接，新建一个 word 对象，不然两个 dict 引用同一个 word
            wordInsert.id = dictWords.length + 1 // 给新的 words 一个新的唯一 id
            dictWords.splice(insetPosition, 0, wordInsert)
        })
    }


    // 删除词条
    deleteWords(wordIdSet, isDeleteInSelf){ // isDeleteInSelf 在移动词条到自己分组时使用，不删除空的分组
        if (this.isGroupMode){
            let deleteGroupIds = [] // 记录 words 为 0 的 group，最后删除分组
            this.wordsOrigin.forEach((group, index) => {
                group.dict = group.dict.filter(item => !wordIdSet.has(item.id))
                if (group.dict.length === 0){
                    deleteGroupIds.push(index)
                }
            })
            // config: 是否删除空的分组
            if (!isDeleteInSelf){
                this.wordsOrigin = this.wordsOrigin.filter((group, index) => !deleteGroupIds.includes(index))
            }
        } else {
            this.wordsOrigin = this.wordsOrigin.filter(item => !wordIdSet.has(item.id))
        }
    }

    addGroupBeforeId(groupIndex){
        this.wordsOrigin.splice(groupIndex,0,new WordGroup(this.lastGroupIndex++,'',[],true))
    }

    // 分组模式：删除分组
    deleteGroup(groupId){
        console.log('要删除的分组 id: ',groupId)
        this.wordsOrigin = this.wordsOrigin.filter(group => group.id !== groupId)
    }
    // 转为 yaml String
    toYamlString(){
        let yamlBody = ''
        if (this.isGroupMode){
            // 为了避免最后多出的空格，改用 join
            let tempGroupString =
                this.wordsOrigin
                    .map(group => {
                        let tempGroupString = ''
                        tempGroupString = tempGroupString + `## ${group.groupName}${EOL}` // + groupName
                        let groupWordsYamlStringArray = group.dict.map(item => item.toYamlString())
                        return tempGroupString + groupWordsYamlStringArray.join(EOL)
                    })
                    .join(EOL + EOL)
            yamlBody = yamlBody + tempGroupString // 每组的末尾加个空行
            return this.header + EOL + yamlBody
        } else {
            let yamlBody =
                this.wordsOrigin
                    .map(item => {
                        return item.toYamlString()
                    })
                    .join(EOL)
            return this.header + EOL + yamlBody
        }
    }


    // 在 origin 中调换两个词条的位置
    exchangePositionInOrigin(word1, word2){
        // 确保 word1 在前
        if (parseInt(word1.id) > parseInt(word2.id)){
            let temp = word1
            word1 = word2
            word2 = temp
        }
        for(let i=0; i<this.wordsOrigin.length; i++){
            let tempWord = this.wordsOrigin[i]
            if (tempWord.isEqualTo(word1)){
                this.wordsOrigin[i] = word2
            }
            if (tempWord.isEqualTo(word2)){
                this.wordsOrigin[i] = word1
            }
        }
    }

}

// 从一条词条字符串中获取 word 对象
function getWordFromLine(index, lineStr){
    let wordArray = lineStr.split('\t')
    let code = wordArray[1]
    code = code.replaceAll('\r', '') // 消除 v1.07 版本的错误
    let word = wordArray[0]
    let priority = wordArray[2]
    let note = wordArray[3]
    return new Word(index, code, word, priority, note)
}
module.exports =  Dict
