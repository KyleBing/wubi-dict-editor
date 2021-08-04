// 词条对象
class Word{
    /**
     *
     * @param id Number
     * @param code String
     * @param word String
     */
    constructor(id, code, word) {
        this.id = id
        this.code = code
        this.word = word
    }
    toString(){
        return this.word + '\t' + this.code
    }
}

export default Word