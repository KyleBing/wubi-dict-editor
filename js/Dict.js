// 字典对象
import Word from "./Word.js";
import WordGroup from "./WordGroup.js";

const os = require('os')

const RETURN_SYMBOL = getReturnSymbol()

class Dict {
    constructor(yaml) {
        this.yaml = yaml // 原文件内容
        this.header = null // 文件头部内容
        this.body = '' // 文件体
        this.dict = [] // 文件词条数组
        this.dictOrigin = [] // 文件词条数组
        this.dictWithGroup = [] // 文件词条 分组
        this.dictWithGroupOrigin = [] // 文件词条 分组
        this.keyword = '' // 筛选词条用的 keyword
        let indexEndOfHeader = this.yaml.indexOf('...') + 3
        if (indexEndOfHeader < 0){
            console.log('文件格式错误，没有 ... 这一行')
        } else {
            this.indexEndOfHeader = indexEndOfHeader
            this.header = this.getDictHeader()
            this.body = this.getDictBody()
            this.dictOrigin = this.getDictWords()
            this.dict = [...this.dictOrigin]
            this.dictWithGroupOrigin = this.getDictWordsWithGroup()
            this.dictWithGroup = [...this.dictWithGroupOrigin]
            console.log(this.dictWithGroup)
        }
    }

    getDictHeader(){
        return this.yaml.substring(0, this.indexEndOfHeader)
    }
    getDictBody(){
        return this.yaml.substring(this.indexEndOfHeader)
    }
    // 返回所有 word
    getDictWords(){
        let lines = this.body.split(RETURN_SYMBOL) // 拆分词条与编码成单行
        let linesValid = lines.filter(item => item.indexOf('\t') > -1) // 选取包含 \t 的行
        return linesValid.map(item => getWordFromLine(item))
    }
    // 返回 word 分组
    getDictWordsWithGroup(){
        let lines = this.body.split(RETURN_SYMBOL) // 拆分词条与编码成单行
        let dictGroup = [] // 总分组
        let temp = null // 第一个分组
        let lastItemIsEmptyLine = false // 上一条是空，用于循环中判断是否需要新起一个 WordGroup
        lines.forEach((item, index) => {
            if (item.indexOf('##') === 0) { // 注释分组
                if (temp && temp.groupName) { // 如果上一个已经有名字了，说明需要保存
                    dictGroup.push(temp)
                }
                temp = new WordGroup(item.substring(3).trim())
                lastItemIsEmptyLine = false
            } else if (item.indexOf('\t') > -1) { // 是词条
                if (!temp){ // 第一行是词条时，没有分组名时
                    temp = new WordGroup()
                }
                temp.dict.push(getWordFromLine(item))
                lastItemIsEmptyLine = false
            } else if (item.indexOf('#') === 0) { // 注释
                lastItemIsEmptyLine = false
            } else {
                // 为空行时
                if (lastItemIsEmptyLine){
                    // 上行和本行都是空行
                } else {
                    if (temp){
                        temp.groupName = temp.groupName || '未命名'
                        dictGroup.push(temp)
                        temp = new WordGroup()
                    }
                }
                lastItemIsEmptyLine = true
            }
        })
        if (temp.dict.length > 0){
            dictGroup.push(temp) // 加上最后一个
        }
        return dictGroup
    }
    // 设置 keyword 并筛选 dict dictWithGroup
    setKeyword(keyword){
        this.keyword = keyword
        if (keyword){
            this.dict = this.dictOrigin.filter(item => { // 获取包含 keyword 的记录
                return item.code.includes(keyword) || item.word.includes(keyword)
            })
            this.dictWithGroup =[]
            this.dictWithGroupOrigin.forEach(groupItem => { // 不能直接使用原 groupItem，不然会改变 dictWithGroupOrigin 的数据
                let tempGroupItem = groupItem.clone()
                tempGroupItem.dict = tempGroupItem.dict.filter(item => {
                    return item.code.includes(keyword) || item.word.includes(keyword)
                })
                if (tempGroupItem.dict.length > 0){
                    this.dictWithGroup.push(tempGroupItem)
                }
            })
        } else { // 如果 keyword 为空，恢复原有数据
            this.dict = [...this.dictOrigin]
            this.dictWithGroup = [...this.dictWithGroupOrigin]
        }
    }

    /**
     * 添加新 Word
     * @param word Word
     * @param groupIndex Number
     */
    addNewWord(word, groupIndex){
        if (groupIndex !== ''){
            this.dictWithGroupOrigin[groupIndex].dict.push(word)
        } else {
            let newWordGroup = new WordGroup('未命名',[word])
            this.dictWithGroupOrigin.push(newWordGroup)
        }
        this.dictOrigin.push(word)
        this.dict = [...this.dictOrigin]
        this.dictWithGroup = [...this.dictWithGroupOrigin]
    }
}

// 从一条词条字符串中获取 word 对象
function getWordFromLine(lineStr){
    let wordArray = lineStr.split('\t')
    let code = wordArray[1]
    let word = wordArray[0]
    return new Word(code, word)
}


// 根据系统返回对应文件系统的换行符
function getReturnSymbol(){
    switch (os.platform()){
        case 'linux':
        case 'darwin': return '\n' // macOS
        case 'win32': return '\r\n' // windows
        case 'aix':
        case 'freebsd':
        case 'openbsd':
        case 'sunos':
        default: return '\n'
    }
}
export default Dict
