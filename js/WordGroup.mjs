// 词条对象 分组
class WordGroup{
    constructor(groupName, words, editing) {
        this.groupName = groupName || ''
        this.dict = words || []
        this.isEditingTitle = editing || false // 标题是否在编辑
    }
    // 复制一个对象
    clone(){
        return new WordGroup(this.groupName, [...this.dict])
    }
}

export default WordGroup