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
        return this.id + '\t' + this.word + '\t' + this.code + '\t' + this.priority
    }
    toYamlString(){
        return this.word + '\t' + this.code
    }
    toFileString(seperator, codeFirst){
        if (codeFirst){
            return this.code + seperator + this.word
        } else {
            return this.word + seperator + this.code
        }
    }
    setCode(code){
        this.code = code
    }
    setId(id){
        this.id = id
    }
    // 复制一个对象
    clone(){
        return new Word(this.id, this.code, this.word, this.priority)
    }
    isEqualTo(word){
        return this.id === word.id
    }
}

module.exports =  Word
