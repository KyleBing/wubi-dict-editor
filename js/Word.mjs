// 词条对象
class Word{
    /**
     *
     * @param id Number
     * @param code String
     * @param word String
     * @param priority String
     */
    constructor(id, code, word, priority) {
        this.id = id
        this.code = code
        this.word = word
        this.priority = priority || null
    }
    toString(){
        return this.word + '\t' + this.code
    }
    // 复制一个对象
    clone(){
        return new Word(this.id, this.code, this.word, this.priority)
    }
    isEqualTo(word){
        return this.id === word.id
    }
}

export default Word