// 词条对象
class Word{
    /**
     *
     * @param id Number ID
     * @param code String 编码
     * @param word String 词条
     * @param priority String 权重
     * @param note String 备注
     * @param indicator String 程序层面的注释，比如标记搜索出的词条在哪个词组分类下
     */
    constructor(id, code, word, priority, note, indicator = '') {
        this.id = id
        this.code = code
        this.word = word
        this.priority = priority || ''
        this.note = note || ''
        this.indicator = indicator
    }
    toCodeComparableString(){
        return this.code + '\t' + this.priority + '\t' + this.note
    }

    /**
     * 判断词条优先级是否高于另一个词条
     * @param word
     */
    isPriorityAbove(word){
        if (this.code < word.code){
            return true
        } else if (this.code === word.code) {
            return this.priority > word.priority // code 一样时，权重大的优先
        } else {
            return false
        }
    }

    toComparableString(){
        return this.word + '\t' + this.code + '\t' + this.id  + '\t' + this.priority + '\t' + this.note
    }
    toString(){
        return this.id + '\t' + this.word + '\t' + this.code + '\t' + this.priority + '\t' + this.note
    }
    toYamlString(){
        if (this.priority && this.note){
            return this.word + '\t' + this.code + '\t' + this.priority + '\t' + this.note
        } else if (this.priority){
            return this.word + '\t' + this.code + '\t' + this.priority
        } else if (this.note){
            return this.word + '\t' + this.code + '\t' + this.priority + '\t' + this.note
        } else {
            return this.word + '\t' + this.code
        }
    }
    toFileString(seperator, codeFirst){
        if (codeFirst){
            return this.code + seperator + this.word + seperator + this.priority
        } else {
            return this.word + seperator + this.code + seperator + this.priority
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
        return new Word(this.id, this.code, this.word, this.priority, this.note)
    }
    isEqualTo(word){
        return this.id === word.id
    }
    // compare a word to another word
    isContentEqualTo(word){
        return this.word === word.word && this.code === word.code
    }
}

module.exports =  Word
