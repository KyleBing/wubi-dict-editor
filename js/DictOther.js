// 其它字典对象
const Word = require("./Word")
const {shakeDom, log, shakeDomFocus, getUnicodeStringLength} = require('./Utility')

const os = require('os')
const EOL = '\n'


class DictOther {
    constructor(fileContent, fileName, filePath, seperator, dictFormat) {
        this.dictTypeName = 'DictOther'
        this.filePath = filePath // 文件路径
        this.fileName = fileName // 文件路径
        this.lastIndex = 0 // 最后一个 Index 的值，用于新添加词时，作为唯一的 id 传入
        this.seperator = seperator ||' ' // 默认间隔符为空格
        this.dictFormat = dictFormat || 'cww' // 码表格式： 一码多词什么的 cww: 一码多词 | wc: 一词一码 | cw: 一码一词
        this.characterMap = new Map() // 单字码表，用于根据此生成词语码表
        this.wordsOrigin = this.getDictWordsInNormalMode(fileContent)
    }
    // 总的词条数量
    get countDictOrigin(){
        return this.wordsOrigin.length
    }

    // 设置 seperator
    setSeperator(seperator){
        this.seperator = seperator
    }
    // 设置 dictFormat
    setDictFormat(dictFormat){
        this.dictFormat = dictFormat
    }

    // 获取指定字数的词条组
    getWordsLengthOf(length){
        switch (length){
            case 0:
                return this.wordsOrigin
            case 1:
            case 2:
            case 3:
            case 4:
                return this.wordsOrigin.filter(word => getUnicodeStringLength(word.word) === length)
            default:
                return this.wordsOrigin.filter(word => getUnicodeStringLength(word.word) > 4)
        }
    }

    // 查重，返回重复定义的字词
    // includeCharacter 当包含单字时
    getRepetitionWords(filterSingleCharacter, isWithAllRepeatWord){
        let startPoint = new Date().getTime()
        let wordMap = new Map()
        let repetitionWords = []
        this.wordsOrigin.forEach(word => {
            if (filterSingleCharacter){
                if (wordMap.has(word.word) && getUnicodeStringLength(word.word) === 1){
                    repetitionWords.push(word)
                    if (isWithAllRepeatWord){
                        let matchedWord = wordMap.get(word.word)
                        if (matchedWord) repetitionWords.push(matchedWord)
                    }
                } else { // 如果 map 中没有这个词的记录，添加这个记录
                    wordMap.set(word.word, word)
                }
            } else {
                if (wordMap.has(word.word) && getUnicodeStringLength(word.word) > 1){ // 单字没必要查重，所以这里只搜索 2 个字以上的词
                    repetitionWords.push(word)
                    if (isWithAllRepeatWord){
                        let matchedWord = wordMap.get(word.word)
                        if (matchedWord) repetitionWords.push(matchedWord)
                    }
                } else { // 如果 map 中没有这个词的记录，添加这个记录
                    wordMap.set(word.word, word)
                }
            }
        })
        // 目前是有多个重复相同的词条存在的 差不多是 x2 倍数量，因为每次都会添加原有的比对词条
        // 排序后再去除重复项
        repetitionWords.sort((a, b) => {
            // console.log(a.word + a.code, b.word + b.code)
            return a.toComparableString() > b.toComparableString()  ? 1 : -1
        })
        console.log('重复词条数量:未去重之前 ', repetitionWords.length)

        for (let i = 0; i < repetitionWords.length - 1; i++) {
            if (repetitionWords[i].id === repetitionWords[i + 1].id ) {
                repetitionWords.splice(i,1)
                i = i - 1
            }
        }
        console.log(`查重完成，用时 ${new Date().getTime() - startPoint} ms`)
        console.log('词条字典数量: ', wordMap.size)
        console.log('重复词条数量: ', repetitionWords.length)
        console.log('重复 + 词条字典 = ', repetitionWords.length + wordMap.size)
        return repetitionWords
    }

    // 返回所有 word
    getDictWordsInNormalMode(fileContent){
        let startPoint = new Date().getTime()
        fileContent = fileContent.replace(/\r\n/g,'\n')

        let lines = fileContent.split(EOL) // 拆分词条与编码成单行
        this.lastIndex = lines.length + 1
        // 如果为纯词模式，就使用所有的行，否则就根据分隔符进行筛选
        let linesValid = this.dictFormat === 'w'? lines: lines.filter(item => item.indexOf(this.seperator) > -1)
        let words = []
        console.log('正常词条的行数：',linesValid.length)
        linesValid.forEach(item => {
            let currentWords = this.getWordsFromLine(item)
            words.push(...currentWords) // 拼接词组
            currentWords.forEach(currentWord => {
                if (getUnicodeStringLength(currentWord.word) === 1
                    && currentWord.code.length >=2
                    && !this.characterMap.has(currentWord.word)) // map里不存在这个字
                { // 编码长度为 4 的单字
                    this.characterMap.set(currentWord.word, currentWord.code)
                }
            })
         })
        console.log(`处理文件完成，共：${words.length } 条，用时 ${new Date().getTime() - startPoint} ms`)
        return words
    }

    // 排序
    sort(){
        let startPoint = new Date().getTime()
        this.wordsOrigin.sort((a,b) => a.code < b.code ? -1: 1)
        console.log(`排序用时 ${new Date().getTime() - startPoint} ms`)
    }


    // 依次序添加 words
    addWordsInOrder(words){
        let startPoint = new Date().getTime()
        words.forEach(word => {
            this.addWordToDictInOrder(word)
        })
        console.log(`添加 ${words.length } 条词条到指定码表, 用时 ${new Date().getTime() - startPoint} ms`)
    }

    // 依次序添加 word
    addWordToDictInOrder(word){
        let insetPosition = null // 插入位置 index
        this.sort() // 插入之前排序码表
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


    // 删除词条
    deleteWords(wordIdSet){
        this.wordsOrigin = this.wordsOrigin.filter(item => !wordIdSet.has(item.id))
    }

    // 转为 String
    toYamlString(){
        return this.wordsOrigin
            .map(item => {
                item.toYamlString()
            })
            .join(EOL)
    }

    toExportString(seperator, dictFormat){
        let startPoint = new Date().getTime()
        let fileContentString = ''
        switch (dictFormat){
            case 'cww':
                let codeMap = new Map() // code: [word, word, word]
                this.wordsOrigin.forEach((word, index) => {
                    let code = word.code
                    if (codeMap.has(code)){ // 用 map 记录所有 code, 如果有就添加到对应的 value 中，没有就新增 map item
                        codeMap.set(code, codeMap.get(code).concat(word))
                    } else {
                        codeMap.set(code, [word])
                    }
                })
                codeMap.forEach((wordArray, code) => {
                    let oneCodewordsString = ''
                    wordArray.forEach(item => {oneCodewordsString = oneCodewordsString.concat(seperator + item.word)}) // seperater + wordsString
                    fileContentString = fileContentString.concat(code, oneCodewordsString, EOL)
                })
                console.log(`词条文本已生成，用时 ${new Date().getTime() - startPoint} ms`)
                return fileContentString
            case 'cw':
                this.wordsOrigin.forEach(word => {
                    fileContentString = fileContentString.concat(word.toFileString(seperator, true), EOL)
                })
                console.log(`词条文本已生成，用时 ${new Date().getTime() - startPoint} ms`)
                return fileContentString
            case 'wc':
                this.wordsOrigin.forEach(word => {
                    fileContentString = fileContentString.concat(word.toFileString(seperator, false), EOL)
                })
                console.log(`词条文本已生成，用时 ${new Date().getTime() - startPoint} ms`)
                return fileContentString
            case 'w':
                this.wordsOrigin.forEach(word => {
                    fileContentString = fileContentString.concat(word.word, EOL)
                })
                console.log(`词条文本已生成，用时 ${new Date().getTime() - startPoint} ms`)
                return fileContentString
            case 'rime_auto':
                this.wordsOrigin.forEach(word => {
                    fileContentString = fileContentString.concat(word.toFileString(seperator, false), EOL)
                })
                console.log(`词条文本已生成，用时 ${new Date().getTime() - startPoint} ms`)
                return fileContentString
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

    // 从一条词条字符串中获取 word 对象
    // 一编码对应多词
    getWordsFromLine(lineStr){
        let wordArray = lineStr.split(this.seperator)
        let words = []
        let code, word, priority
        switch (this.dictFormat){
            case 'cww':
                code = wordArray[0]
                for(let i=1; i<wordArray.length;i++){
                    words.push(new Word(this.lastIndex, code, wordArray[i]))
                    this.lastIndex = this.lastIndex + 1
                }
                return words
            case 'cw':
                code = wordArray[0]
                word = wordArray[1]
                return [new Word(this.lastIndex++, code, word)]
            case 'wc':
                word = wordArray[0]
                code = wordArray[1]
                return [new Word(this.lastIndex++, code, word)]
            case 'w':
                word = wordArray[0]
                // code = getCodeFromWord(word)
                return [new Word(this.lastIndex++, '', word)]
            case 'rime_auto':
                word = wordArray[0]
                code = wordArray[1]
                priority = wordArray[2]
                return [new Word(this.lastIndex++, code, word, priority)]
        }
    }
}


module.exports = DictOther
