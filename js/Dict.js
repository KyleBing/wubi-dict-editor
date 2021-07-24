// 字典对象
import Word from "./Word.js";
import WordGroup from "./WordGroup.js";

// const RETURN_SYMBOL = '\r\n' // on windows
const RETURN_SYMBOL = '\n' // on mac
class Dict {
    constructor(yaml) {
        this.yaml = yaml // 原文件内容
        this.header = null // 文件头部内容
        this.body = '' // 文件体
        this.dict = [] // 文件词条数组
        this.dictWithGroup = [] // 文件词条 分组
        let indexEndOfHeader = this.yaml.indexOf('...') + 3
        if (indexEndOfHeader < 0){
            console.log('文件格式错误，没有 ... 这一行')
        } else {
            this.indexEndOfHeader = indexEndOfHeader
            this.header = this.getDictHeader()
            this.body = this.getDictBody()
            this.dict = this.getDictWords()
            this.dictWithGroup = this.getDictWordsWithGroup()
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
        lines.forEach(item => {
            if (item.indexOf('##') === 0) { // 注释分组
                if (temp && temp.groupName) { // 如果上一个已经有名字了，说明需要保存
                    dictGroup.push(temp)
                }
                temp = new WordGroup(item.substring(3))
            } else if (item.indexOf('\t') > -1) { // 是词条
                console.log(item)
                temp.dict.push(getWordFromLine(item))
            } else if (item.indexOf('#') === 0) { // 注释

            } else {

            }
        })
        dictGroup.push(temp) // 加上最后一个
        return dictGroup
    }
}

// 从一条词条字符串中获取 word 对象
function getWordFromLine(lineStr){
    let wordArray = lineStr.split('\t')
    let code = wordArray[0]
    let word = wordArray[1]
    return new Word(code, word)
}
export default Dict
