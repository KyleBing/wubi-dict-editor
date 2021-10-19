// 其它字典对象
const Word = require("./Word")
const {shakeDom, log, shakeDomFocus} = require('./Utility')

const os = require('os')

class DictOther {
    constructor(fileContent, filename, seperator, dictFormat) {
        this.filename = filename // 文件路径
        this.wordsOrigin = [] // 文件词条数组
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
                return this.wordsOrigin.filter(word => word.word.length === length)
            default:
                return this.wordsOrigin.filter(word => word.word.length > 4)
        }
    }

    // 查重，返回重复定义的字词
    // includeCharacter 当包含单字时
    getRepetitionWords(includeCharacter){
        let startPoint = new Date().getTime()
        let wordMap = new Map()
        let repetitionWords = []
        this.wordsOrigin.forEach(word => {
            if (includeCharacter){
                if (wordMap.has(word.word) && word.word.length === 1){
                    repetitionWords.push(word)
                    repetitionWords.push(new Word(this.lastIndex++, wordMap.get(word.word), word.word))
                } else { // 如果 map 中没有这个词的记录，添加这个记录
                    wordMap.set(word.word, word.code)
                }
            } else {
                if (wordMap.has(word.word) && word.word.length > 1){ // 单字没必要查重，所以这里只搜索 2 个字以上的词
                    repetitionWords.push(word)
                    repetitionWords.push(new Word(this.lastIndex++, wordMap.get(word.word), word.word))
                } else { // 如果 map 中没有这个词的记录，添加这个记录
                    wordMap.set(word.word, word.code)
                }
            }

        })
        log(`查重完成，用时 ${new Date().getTime() - startPoint} ms`)
        log('WordMap count: ', wordMap.size)
        log('RepetitionWord count: ', repetitionWords.length)
        log('RepetitionWord + WordMap = ', repetitionWords.length + wordMap.size)
        return repetitionWords
    }

    // 返回所有 word
    getDictWordsInNormalMode(fileContent){
        let startPoint = new Date().getTime()
        let lines = fileContent.split(os.EOL) // 拆分词条与编码成单行
        this.lastIndex = lines.length
        let linesValid = lines.filter(item => item.indexOf(this.seperator) > -1) // 选取包含分隔符的行
        let words = []
        log('正常词条的行数：',linesValid.length)
        linesValid.forEach(item => {
            let currentWords = this.getWordsFromLine(item)
            words.push(...currentWords) // 拼接词组
            currentWords.forEach(currentWord => {
                if (currentWord.word.length === 1
                    && currentWord.code.length >=2
                    && !this.characterMap.has(currentWord.word)) // map里不存在这个字
                { // 编码长度为 4 的单字
                    this.characterMap.set(currentWord.word, currentWord.code)
                }
            })
         })
        log(`处理文件完成，共：${words.length } 条，用时 ${new Date().getTime() - startPoint} ms`)
        return words
    }
    decodeWord(word){
        try{
            let decodeArray = [] // 每个字解码后的数组表
            let letterArray = word.split('')
            if (letterArray.length > 4){ // 只截取前三和后一
                letterArray.splice(3,letterArray.length - 4)
            }
            letterArray.forEach(ch => {
                decodeArray.push(this.characterMap.get(ch) || '')
            })
            let phraseCode = ''
            switch (decodeArray.length){
                case 0:
                case 1:
                    break
                case 2: // 取一的前二码，二的前二码
                    phraseCode =
                        decodeArray[0].substring(0,2) +
                        decodeArray[1].substring(0,2)
                    break
                case 3: // 取一二前一码，三前二码
                    phraseCode =
                        decodeArray[0].substring(0,1) +
                        decodeArray[1].substring(0,1) +
                        decodeArray[2].substring(0,2)
                    break
                default: // 取一二三前一码，最后的一码
                    phraseCode =
                        decodeArray[0].substring(0,1) +
                        decodeArray[1].substring(0,1) +
                        decodeArray[2].substring(0,1) +
                        decodeArray[decodeArray.length - 1].substring(0,1)
            }
            log(phraseCode, decodeArray)
            return phraseCode
        } catch(err){
            return ''
        }
    }

    // 排序
    sort(){
        let startPoint = new Date().getTime()
        this.wordsOrigin.sort((a,b) => a.code < b.code ? -1: 1)
        log(`Sort 用时 ${new Date().getTime() - startPoint} ms`)
    }

    /**
     * 添加新 Word
     * @param word Word
     */
    addNewWord(word){
        log('TODO: 确定插入的位置')
        this.wordsOrigin.push(word)
        this.lastIndex = this.lastIndex + 1 // 新加的词添加后， lastIndex + 1
    }

    // 依次序添加 words
    addWordsInOrder(words){
        let startPoint = new Date().getTime()
        words.forEach(word => {
            this.addWordToDict(word)
        })
        log(`添加 ${words.length } 条词条到指定码表, 用时 ${new Date().getTime() - startPoint} ms`)
    }

    // 依次序添加 word
    addWordToDict(word){
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
        wordInsert.id = this.wordsOrigin.length + 1 // 给新的 words 一个新的唯一 id
        this.wordsOrigin.splice(insetPosition, 0, wordInsert)
    }


    // 删除词条
    deleteWords(wordIdSet){
        this.wordsOrigin = this.wordsOrigin.filter(item => !wordIdSet.has(item.id))
    }

    // 转为 String
    toString(){
        let fileContentString = ''
        this.wordsOrigin.forEach(item =>{
            fileContentString = fileContentString + item.toString() + os.EOL
        })
        return fileContentString
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
        let code, word
        switch (this.dictFormat){
            case 'cww':
                code = wordArray[0]
                for(let i=1; i<wordArray.length;i++){
                    this.lastIndex++
                    words.push(new Word(this.lastIndex, code, wordArray[i]))
                }
                return words
            case 'cw':
                code = wordArray[0]
                word = wordArray[1]
                this.lastIndex++
                return [new Word(this.lastIndex, code, word)]
            case 'wc':
                word = wordArray[0]
                code = wordArray[1]
                this.lastIndex++
                return [new Word(this.lastIndex, code, word)]
        }

    }
}


module.exports = DictOther
