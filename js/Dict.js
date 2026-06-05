// 字典对象
const Word = require("./Word")
const WordGroup = require("./WordGroup")
const {shakeDom, log, shakeDomFocus, getUnicodeStringLength} = require('./Utility')
const {parseDictFile, serializeDictYaml, dictToPlainObject} = require('./dictParseCore')

const os = require('os')
const EOL = '\n'


class Dict {
    /**
     * @param fileContent  词库内容
     * @param fileName
     * @param filePath
     * @param isForceProcessInUngroupMode 按照非分组模式读取词库
     * @param parsed  Worker 预解析结果
     */
    constructor(fileContent, fileName, filePath, isForceProcessInUngroupMode, parsed) {
        this.dictTypeName = 'Dict'
        this.filePath = filePath || ''
        this.fileName = fileName || ''
        this.header = null
        this.wordsOrigin = []
        this.lastIndex = 0
        this.lastGroupIndex = 0
        this.isGroupMode = false
        this.dictSetExceptCharacter = new Set()
        this._codeIndex = new Map()

        if (parsed) {
            this.applyParsed(parsed, fileName, filePath)
        } else if (fileContent) {
            this.applyParsed(parseDictFile(fileContent, isForceProcessInUngroupMode), fileName, filePath)
        }
    }

    static fromParsed(parsed, fileName, filePath) {
        return new Dict(null, fileName, filePath, false, parsed)
    }

    applyParsed(parsed, fileName, filePath) {
        this.fileName = fileName || parsed.fileName || this.fileName
        this.filePath = filePath || parsed.filePath || this.filePath
        this.header = parsed.header
        this.indexEndOfHeader = parsed.indexEndOfHeader
        this.isGroupMode = parsed.isGroupMode
        this.lastIndex = parsed.lastIndex
        this.lastGroupIndex = parsed.lastGroupIndex
        this.dictSetExceptCharacter = new Set(parsed.dictSetExceptCharacter || [])

        if (parsed.isGroupMode) {
            this.wordsOrigin = parsed.wordsOrigin.map(group => new WordGroup(
                group.id,
                group.groupName,
                group.dict.map(w => new Word(w.id, w.code, w.word, w.priority, w.note, w.indicator || ''))
            ))
        } else {
            this.wordsOrigin = parsed.wordsOrigin.map(w => new Word(
                w.id, w.code, w.word, w.priority, w.note, w.indicator || ''
            ))
        }
        this.buildCodeIndex()
    }

    buildCodeIndex() {
        this._codeIndex = new Map()
        const addWord = (word) => {
            if (!this._codeIndex.has(word.code)) {
                this._codeIndex.set(word.code, [])
            }
            this._codeIndex.get(word.code).push(word)
        }
        if (this.isGroupMode) {
            this.wordsOrigin.forEach(group => group.dict.forEach(addWord))
        } else {
            this.wordsOrigin.forEach(addWord)
        }
    }

    getWordsByCode(code) {
        return this._codeIndex.get(code) || []
    }

    toPlainObject() {
        return dictToPlainObject(this)
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
        this.buildCodeIndex()
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
        this.lastIndex = this.lastIndex + 1
        this.buildCodeIndex()
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
        this.buildCodeIndex()
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
        this.buildCodeIndex()
    }


    // 依次序添加 word groupMode
    addWordToDictInOrderWithGroup(words, groupIndex){
        let dictWords = this.wordsOrigin[groupIndex].dict
        console.log('TODO: add to group')
        words.forEach(word => {
            let insetPosition = null // 插入位置 index
            for (let i=0; i<dictWords.length-1; i++){ // -1 为了避免下面 i+1 为 undefined
                if (word.code >= dictWords[i].code  && word.code <= dictWords[i+1].code){
                    insetPosition = i + 1
                    break
                }
            }
            if (!insetPosition){  // 没有匹配到任何位置，添加到结尾
                insetPosition = dictWords.length
            }
            let wordInsert = word.clone() // 断开与别一个 dict 的引用链接，新建一个 word 对象，不然两个 dict 引用同一个 word
            wordInsert.id = this.lastIndex++ // 使用全局递增 id，避免跨分组出现重复 id
            dictWords.splice(insetPosition, 0, wordInsert)
        })
        this.buildCodeIndex()
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
        this.buildCodeIndex()
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
        return serializeDictYaml(this.toPlainObject())
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

module.exports =  Dict
