// 其它字典对象
const Word = require("./Word")
const os = require('os')

class DictOther {
    constructor(yaml, filename) {
        this.filename = filename // 文件路径
        this.wordsOrigin = [] // 文件词条数组
        this.lastIndex = 0 // 最后一个 Index 的值，用于新添加词时，作为唯一的 id 传入
        this.getDictWordsIn(yaml)
    }

    // 返回所有 word
    getDictWordsIn(body){
        let startPoint = new Date().getTime()
        let lines = body.split(os.EOL) // 拆分词条与编码成单行
        let wordsArray = lines.map(item => this.getWordsFromLine(item)) // [[Word, Word], [Word], [Word, Word]]
        wordsArray.forEach(arr => {
            arr.forEach(item => {
                this.wordsOrigin.push(item)
            })
        })
        console.log(`处理yaml码表文件：完成，共：${this.wordsOrigin.length } 条，用时 ${new Date().getTime() - startPoint} ms`)
    }

    // 获取词条长度为 length 的词条
    getWordsLengthOf(length){
        return this.wordsOrigin.filter(item => item.word.length === length && item.code.length === 4)
    }

    // 依次序添加 words
    addWordsInOrder(words){
        let startPoint = new Date().getTime()
        words.forEach(word => {
            this.addWordToDict(word)
        })
        console.log(`添加 ${words.length } 条词条到主码表, 用时 ${new Date().getTime() - startPoint} ms`)
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
    deleteWords(wordIds){
        this.wordsOrigin = this.wordsOrigin.filter(item => !wordIds.includes(item.id))
    }
    // 转为 yaml String
    toYamlString(){
        let yamlBody = ''
        this.wordsOrigin.forEach(item =>{
            yamlBody = yamlBody + item.toString() + os.EOL
        })
        return yamlBody
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
    getWordsFromLine(lineStr){
        let wordArray = lineStr.split(' ')
        let code = wordArray[0]
        let words = []
        for(let i=1; i<wordArray.length;i++){
            this.lastIndex++
            words.push(new Word(this.lastIndex, code, wordArray[i]))
        }
        return words
    }
}


module.exports = DictOther
