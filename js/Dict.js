// 字典对象
import Word from "./Word.js";

class Dict {
    constructor(yaml) {
        this.yaml = yaml // 原文件内容
        // this.header = '' // 文件头部内容
        // this.body = '' // 文件体
        // this.dict = [] // 文件词条数组
        let indexEndOfHeader = this.yaml.indexOf('...')
        if (indexEndOfHeader < 0){
            console.log('文件格式错误，没有 ... 这一行')
        } else {
            this.indexEndOfHeader = indexEndOfHeader
        }
    }

    getDictHeader(){
        return this.yaml.substring(0, this.indexEndOfHeader)
    }
    getDictBody(){
        return this.yaml.substring(this.indexEndOfHeader)
    }
    getDictWords(){
        let body = this.getDictBody()
        let lines = body.split('\r\n') // 拆分词条与编码成单行
        let linesValid = lines.filter(item => item.indexOf('\t') > -1) // 选取包含 \t 的行
        return linesValid.map(item => {
            let wordArray = item.split('\t')
            let code = wordArray[0]
            let word = wordArray[1]
            return new Word(code, word)
        })
    }
}

export default Dict
