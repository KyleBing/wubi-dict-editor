// 词条对象 分组
class WordGroup{
    constructor(id, groupName, words, editing) {
        this.id = id
        this.groupName = groupName || ''
        this.dict = words || []
        this.isEditingTitle = editing || false // 标题是否在编辑
    }
    // 复制一个对象
    clone(){
        return new WordGroup(this.id, this.groupName, [...this.dict])
    }
}

module.exports = WordGroup
