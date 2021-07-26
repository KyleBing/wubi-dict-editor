// 词条对象
class Word{
    constructor(code, word) {
        this.code = code
        this.word = word
    }
    toString(){
        return this.word + '\t' + this.code
    }
}

export default Word