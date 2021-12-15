// 单字字典
const Word = require("./Word")
const {log, getUnicodeStringLength} = require('./Utility')
const os = require('os')

// 只接受 一词一码 的码表文件
class DictMap {
    constructor(fileContent, filename, filePath) {
        this.dictTypeName = 'DictMap'
        this.filePath = filePath // 文件路径
        this.filename = filename // 文件路径
        this.lastIndex = 0 // 最后一个 Index 的值，用于新添加词时，作为唯一的 id 传入
        this.seperator = '\t' // 间隔符为 tab
        this.characterMap = new Map() // 单字码表，用于根据此生成词语码表
        this.wordsOrigin = this.getDictWordsInNormalMode(fileContent)
    }
    // 总的词条数量
    get countDictOrigin(){
        return this.wordsOrigin.length
    }

    // 返回所有 word
    getDictWordsInNormalMode(fileContent){
        this.characterMap = new Map() // 单字码表，用于根据此生成词语码表

        // 处理 rime 码表
        let indexEndOfHeader = fileContent.indexOf('...')
        let bodyString = ''
        if (indexEndOfHeader > 0){
            bodyString = fileContent.substring(this.indexEndOfHeader)
        } else {
            bodyString = fileContent
        }
        // 处理词条
        let startPoint = new Date().getTime()
        let EOL = this.getFileEOLFrom(fileContent)
        let lines = fileContent.split(EOL) // 拆分词条与编码成单行
        this.lastIndex = lines.length + 1
        let linesValid = lines.filter(item => item.indexOf(this.seperator) > -1) // 选取包含分隔符的行
        let words = []
        log('正常词条的行数：',linesValid.length)
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
            // log(phraseCode, decodeArray)
            return phraseCode
        } catch(err){
            return ''
        }
    }

    toExportString(){
        let startPoint = new Date().getTime()
        let fileContentString = ''
        this.characterMap.forEach((code, word) => {
            fileContentString = fileContentString.concat(word, this.seperator, code, os.EOL)
        })
        log(`字典词条文本已生成，用时 ${new Date().getTime() - startPoint} ms`)
        return fileContentString
    }

    // 从一条词条字符串中获取 word 对象，只取单字的
    // 单字时返回，多字时返回空
    getWordsFromLine(lineStr){
        let wordArray = lineStr.split(this.seperator)
        let word = wordArray[0]
        let code = wordArray[1]
        if (getUnicodeStringLength(word) > 1){
            return []
        } else {
            return [new Word(this.lastIndex++, code, word)]
        }
    }

    // 判断码表文件的换行符是 \r\n 还是 \n
    getFileEOLFrom(fileContent){
        if(fileContent.indexOf('\r\n') > -1){
            log('文件换行符为： \\r\\n')
            return '\r\n'
        } else {
            log('文件换行符为： \\n')
            return '\n'
        }
    }
}

module.exports = DictMap
