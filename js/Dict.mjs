// 字典对象
import Word from "./Word.mjs";
import WordGroup from "./WordGroup.mjs";

const os = require('os')

class Dict {
    constructor(yaml, filename) {
        this.filename = filename // 文件路径
        this.header = null // 文件头部内容
        this.wordsOrigin = [] // 文件词条数组
        this.lastIndex = 0 // 最后一个 Index 的值，用于新添加词时，作为唯一的 id 传入
        this.isGroupMode = false // 识别码表是否为分组形式的

        this.characterMap = new Map() // 单字码表，用于根据此生成词语码表

        let indexEndOfHeader = yaml.indexOf('...')
        if (indexEndOfHeader < 0){
            console.log('文件格式错误，没有 ... 这一行')
        } else {
            this.indexEndOfHeader = indexEndOfHeader + 3
            this.header = yaml.substring(0, this.indexEndOfHeader)
            this.isGroupMode = this.header.includes('dict_grouped: true') // 根据有没有这一段文字进行判断，是否为分组形式的码表
            let body = yaml.substring(this.indexEndOfHeader)
            this.wordsOrigin = this.isGroupMode? this.getDictWordsInGroupMode(body): this.getDictWordsInNormalMode(body)
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
    getDictWordsInNormalMode(body){
        let startPoint = new Date().getTime()
        let lines = body.split(os.EOL) // 拆分词条与编码成单行
        this.lastIndex = lines.length
        let linesValid = lines.filter(item => item.indexOf('\t') > -1) // 选取包含 \t 的行
        let words = []
        linesValid.forEach((item, index) => {
            let currentWord = getWordFromLine(index, item)
            words.push(currentWord) // 获取词条
            if (currentWord.word.length === 1
                && currentWord.code.length >=2
                && !this.characterMap.has(currentWord.word)) // map里不存在这个字
            { // 编码长度为 4 的单字
                this.characterMap.set(currentWord.word, currentWord.code)
            }
         })
        console.log(`处理yaml码表文件：完成，共：${words.length } ${this.isGroupMode? '组': '条'}，用时 ${new Date().getTime() - startPoint} ms`)
        return words
    }

    // 返回 word 分组
    getDictWordsInGroupMode(body){
        let startPoint = new Date().getTime()
        let lines = body.split(os.EOL) // 拆分词条与编码成单行
        let wordsGroup = [] // 总分组
        let temp = null // 第一个分组
        let lastItemIsEmptyLine = false // 上一条是空，用于循环中判断是否需要新起一个 WordGroup
        this.lastIndex = lines.length
        lines.forEach((item, index) => {
            if (item.startsWith('##')) { // 注释分组
                if (temp && temp.groupName) { // 如果上一个已经有名字了，说明需要保存
                    wordsGroup.push(temp)
                }
                temp = new WordGroup(item.substring(3).trim())
                lastItemIsEmptyLine = false
            } else if (item.indexOf('\t') > -1) { // 是词条
                if (!temp){ // 第一行是词条时，没有分组名时
                    temp = new WordGroup()
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
                        temp = new WordGroup()
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
     * 添加新 Word
     * @param word Word
     * @param groupIndex Number
     */
    addNewWord(word, groupIndex){
        if(this.isGroupMode){
            if (groupIndex !== -1){
                this.wordsOrigin[groupIndex].dict.push(word)
            } else {
                let newWordGroup = new WordGroup('- 未命名 -',[word])
                this.wordsOrigin.unshift(newWordGroup) // 添加到第一组
            }
        } else {
            console.log('TODO: 确定插入的位置')
            this.wordsOrigin.push(word)
        }
        this.lastIndex = this.lastIndex + 1 // 新加的词添加后， lastIndex + 1
    }

    // 依次序添加 words
    addWordsInOrder(words){
        let startPoint = new Date().getTime()
        if (this.isGroupMode){
            this.addWordToDictWithGroup()
        } else {
            words.forEach(word => {
                this.addWordToDict(word)
            })
        }
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


    // 依次序添加 word groupMode
    addWordToDictWithGroup(word){
        console.log('TODO: add to group')
    }


    // 删除词条
    deleteWords(wordIds){
        if (this.isGroupMode){
            let deleteGroupIds = [] // 记录 words 为 0 的 group，最后删除分组
            this.wordsOrigin.forEach((group, index) => {
                group.dict = group.dict.filter(item => !wordIds.includes(item.id))
                if (group.dict.length === 0){
                    deleteGroupIds.push(index)
                }
            })
            this.wordsOrigin = this.wordsOrigin.filter((group, index) => !deleteGroupIds.includes(index))
        } else {
            this.wordsOrigin = this.wordsOrigin.filter(item => !wordIds.includes(item.id))
        }
    }

    addGroupBeforeId(groupIndex){
        this.wordsOrigin.splice(groupIndex,0,new WordGroup('',[],true))
    }

    // 分组模式：删除分组
    deleteGroup(groupIndex){
        this.wordsOrigin.splice(groupIndex, 1)
    }
    // 转为 yaml String
    toYamlString(){
        let yamlBody = ''
        if (this.isGroupMode){
            this.wordsOrigin.forEach(group => {
                let tempGroupString = ''
                tempGroupString = tempGroupString + `## ${group.groupName}${os.EOL}` // + groupName
                group.dict.forEach(item =>{
                    tempGroupString = tempGroupString + item.toString() + os.EOL
                })
                yamlBody = yamlBody + tempGroupString + os.EOL // 每组的末尾加个空行
            })
            return this.header + os.EOL + yamlBody
        } else {
            let yamlBody = ''
            this.wordsOrigin.forEach(item =>{
                yamlBody = yamlBody + item.toString() + os.EOL
            })
            return this.header + os.EOL + yamlBody
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
    let word = wordArray[0]
    let priority = wordArray.length > 2 ? wordArray[2] : null
    return new Word(index, code, word, priority)
}
export default Dict
