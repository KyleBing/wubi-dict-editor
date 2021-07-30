// 字典对象
import Word from "./Word.js";
import WordGroup from "./WordGroup.js";

const os = require('os')

class Dict {
    constructor(yaml, filePath) {
        this.filePath = filePath // 文件路径
        this.header = null // 文件头部内容
        this.dict = [] // 文件词条数组
        this.dictOrigin = [] // 文件词条数组
        this.lastIndex = '' // 最后一个 Index 的值，用于新添加词时，作为唯一的 id 传入
        this.isGroupMode = false // 识别码表是否为分组形式的
        let indexEndOfHeader = yaml.indexOf('...') + 3
        if (indexEndOfHeader < 0){
            console.log('文件格式错误，没有 ... 这一行')
        } else {
            this.indexEndOfHeader = indexEndOfHeader
            this.header = yaml.substring(0, this.indexEndOfHeader)
            this.isGroupMode = this.header.includes('dict_grouped: true') // 根据有没有这一段文字进行判断，是否为分组形式的码表
            let body = yaml.substring(this.indexEndOfHeader)
            this.dictOrigin = this.isGroupMode? this.getDictWordsInGroupMode(body): this.getDictWordsInNormalMode(body)

            this.dict = [...this.dictOrigin] // dict 中的数据元素指向跟 Origin 里的是一样的，所以编辑 dict 也会改变 origin 数据
            if(this.dict.length < 1000){
                console.log(this.dictOrigin)
            }
            // console.log(this.dictWithGroup)
        }
    }

    // 返回所有 word
    getDictWordsInNormalMode(body){
        let startPoint = new Date().getTime()
        let lines = body.split(os.EOL) // 拆分词条与编码成单行
        let linesValid = lines.filter(item => item.indexOf('\t') > -1) // 选取包含 \t 的行
        let dicts = linesValid.map((item, index) => getWordFromLine(index,item))
        console.log(`处理yaml码表文件：完成，共：${dicts.length }`, this.isGroupMode? '组': '条', '用时: ', new Date().getTime() - startPoint, 'ms')
        return dicts
    }

    // 返回 word 分组
    getDictWordsInGroupMode(body){
        let startPoint = new Date().getTime()
        let lines = body.split(os.EOL) // 拆分词条与编码成单行
        let dictGroup = [] // 总分组
        let temp = null // 第一个分组
        let lastItemIsEmptyLine = false // 上一条是空，用于循环中判断是否需要新起一个 WordGroup
        this.lastIndex = lines.length
        lines.forEach((item, index) => {
            if (item.startsWith('##')) { // 注释分组
                if (temp && temp.groupName) { // 如果上一个已经有名字了，说明需要保存
                    dictGroup.push(temp)
                }
                temp = new WordGroup(item.substring(3).trim())
                lastItemIsEmptyLine = false
            } else if (item.indexOf('\t') > -1) { // 是词条
                if (!temp){ // 第一行是词条时，没有分组名时
                    temp = new WordGroup()
                }
                temp.dict.push(getWordFromLine(index, item))
                lastItemIsEmptyLine = false
            } else if (item.startsWith('#')) { // 注释
                console.log(item)
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
        console.log('用时: ', new Date().getTime() - startPoint, 'ms')
        if (temp){
            if (temp.dict.length > 0){
                dictGroup.push(temp) // 加上最后一个
            }
            return dictGroup
        } else {
            return [] // 文件内容为空时
        }
    }

    // 通过 code, word 筛选词条
    search(code, word){
        let startPoint = new Date().getTime()
        if (code || word){
            if (this.isGroupMode){
                this.dict =[]
                this.dictOrigin.forEach(groupItem => {
                    let tempGroupItem = groupItem.clone() // 不能直接使用原 groupItem，不然会改变 dictOrigin 的数据
                    tempGroupItem.dict = tempGroupItem.dict.filter(item => {
                        return item.code.includes(code) && item.word.includes(word)
                    })
                    if (tempGroupItem.dict.length > 0){ // 当前分组中有元素，添加到结果中
                        this.dict.push(tempGroupItem)
                    }
                })
                console.log('用时: ', new Date().getTime() - startPoint, 'ms')
            } else {
                this.dict = this.dictOrigin.filter(item => { // 获取包含 code 的记录
                    return item.code.includes(code) && item.word.includes(word)
                })
                console.log(`${code} ${word}: ` ,'搜索出', this.dict.length, '条，', '用时: ', new Date().getTime() - startPoint, 'ms')
            }

        } else { // 如果 code, word 为空，恢复原有数据
            this.dict = [...this.dictOrigin]
        }
    }

    /**
     * 添加新 Word
     * @param word Word
     * @param groupIndex Number
     */
    addNewWord(word, groupIndex){
        if(this.isGroupMode){
            if (groupIndex !== ''){
                this.dictOrigin[groupIndex].dict.push(word)
            } else {
                let newWordGroup = new WordGroup('未命名',[word])
                this.dictOrigin.unshift(newWordGroup) // 添加到第一组
            }
        } else {
            console.log('TODO: 确定插入的位置')
            this.dictOrigin.push(word)
        }
        this.dict = [...this.dictOrigin]
        this.lastIndex = this.lastIndex + 1 // 新加的词添加后， lastIndex + 1
    }


    // 删除词条
    deleteWords(wordIds){
        if (this.isGroupMode){
            this.dictOrigin.forEach(group => {
                group.dict = group.dict.filter(item => !wordIds.includes(item.id))
            })
        } else {
            this.dictOrigin = this.dictOrigin.filter(item => !wordIds.includes(item.id))
        }
        this.dict = [...this.dictOrigin]
    }

    // 转为 yaml String
    toYamlString(){
        let yamlBody = ''
        if (this.isGroupMode){
            this.dictOrigin.forEach(group => {
                let tempGroupString = ''
                tempGroupString = tempGroupString + `## ${group.groupName}${os.EOL}` // + groupName
                group.dict.forEach(item =>{
                    tempGroupString = tempGroupString + item.toString() + os.EOL
                })
                yamlBody = yamlBody + tempGroupString + os.EOL // 每组的末尾加个空行
            })
            return this.header + os.EOL + yamlBody
        } else {
            let yamlBody = ''
            this.dict.forEach(item =>{
                yamlBody = yamlBody + item.toString() + os.EOL
            })
            return this.header + os.EOL + yamlBody
        }
    }

    // 词条位置移动
    move(wordId, direction){
        if (this.isGroupMode){
            this.dict.forEach(group => {
                for(let i=0; i<group.dict.length; i++){
                    if (wordId === group.dict[i].id){
                        let tempItem = group.dict[i]
                        if (direction === 'up'){
                            group.dict[i] = group.dict[i - 1]
                            group.dict[i - 1] = tempItem
                            break
                        } else if (direction === 'down'){
                            group.dict[i] = group.dict[i + 1]
                            group.dict[i + 1] = tempItem
                            break
                        }
                    }
                }
            })
        } else {
            for(let i=0; i<this.dict.length; i++){
                if (wordId === this.dict[i].id){
                    let tempItem = this.dict[i]
                    if (direction === 'up'){
                        this.dict[i] = this.dict[i - 1]
                        this.dict[i - 1] = tempItem
                        break
                    } else if (direction === 'down'){
                        this.dict[i] = this.dict[i + 1]
                        this.dict[i + 1] = tempItem
                        break
                    }
                }
            }
        }
    }

    // 判断是否为第一个元素
    isFirstItem(id){
        if (this.isGroupMode){ // 分组时的第一个元素
            for (let i=0; i<this.dict.length; i++) {
                for (let j = 0; j < this.dict[i].dict.length; j++) {
                    if (this.dict[i].dict[j].id === id){
                        return j === 0 // 使用 array.forEach() 无法跳出循环
                    }
                }
            }
            return false
        } else {
            for (let i = 0; i < this.dict.length; i++) {
                if (this.dict[i].id === id){
                    return i === 0 // 使用 array.forEach() 无法跳出循环
                }
            }
            return false
        }

    }
    // 判断是否为最后一个元素
    isLastItem(id){
        if (this.isGroupMode){ // 分组时的最后一个元素
            for (let i=0; i<this.dict.length; i++) {
                for (let j = 0; j < this.dict[i].dict.length; j++) {
                    if (this.dict[i].id === id){
                        return j + 1 === this.dict.length
                    }
                }
            }
            return false
        } else {
            for (let i = 0; i < this.dict.length; i++) {
                if (this.dict[i].id === id){
                    return i + 1 === this.dict.length
                }
            }
            return false
        }
    }
}

// 从一条词条字符串中获取 word 对象
function getWordFromLine(index, lineStr){
    let wordArray = lineStr.split('\t')
    let code = wordArray[1]
    let word = wordArray[0]
    return new Word(index, code, word)
}
export default Dict
