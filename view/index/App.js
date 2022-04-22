const {shakeDom, shakeDomFocus, log, getUnicodeStringLength} = require('../../js/Utility')
const {IS_IN_DEVELOP} = require('../../js/Global')

const Dict = require('../../js/Dict')
const DictMap = require('../../js/DictMap')
const Word = require('../../js/Word')
const Vue  = require('../../node_modules/vue/dist/vue.common.prod')

const {ipcRenderer, net} = require('electron')
const VirtualScroller = require('vue-virtual-scroller')
const WordGroup = require("../../js/WordGroup");


// Vue 2
const app = {
    el: '#app',
    components: {RecycleScroller: VirtualScroller.RecycleScroller},
    data() {
        return {
            IS_IN_DEVELOP: IS_IN_DEVELOP, // 是否为开发模式，html 使用
            tip: '', // 提示信息
            dict: {},  // 当前词库对象 Dict
            dictMain: {}, // 主码表 Dict
            keyword: '', // 搜索关键字

            code: '', // 编码
            word: '', // 词条
            priority: '', // 优先级
            note: '', // 备注

            activeGroupId: -1, // 组 index
            keywordUnwatch: null, // keyword watch 方法的撤消方法
            labelOfSaveBtn: '保存', // 保存按钮的文本
            heightContent: 0, // content 高度
            words: [], // 显示的 words

            chosenWordIds: new Set(),
            chosenWordIdArray: [], // 对应上面的 set 内容
            lastChosenWordIndex: null, // 最后一次选中的 index


            targetDict: {}, // 要移动到的码表
            showDropdown: false, // 显示移动词条窗口
            dropdownFileList: [
                // {name: '拼音词库', path: 'pinyin_simp.dict.yaml'}
            ],
            dropdownActiveFileIndex: -1, // 选中的
            dropdownActiveGroupIndex: -1, // 选中的分组 ID

            config: {}, // 全局配置

            dictMap: null, // main 返回的 dictMap，用于解码词条

            wordEditing: null, // 正在编辑的词条


            // 同步词库
            dictSync: null
        }
    },
    mounted() {
        this.heightContent = innerHeight - 47 - 20 - 10 + 3
        // 载入主要操作码表文件
        ipcRenderer.on('showFileContent', (event, fileName, filePath, res) => {
            // 过滤移动到的文件列表，不显示正在显示的这个码表
            // this.dropdownFileList = this.dropdownFileList.filter(item => item.path !== fileName)
            this.dict = new Dict(res, fileName, filePath)
            // 载入新码表时，清除 word 保存 code
            this.word = ''
            this.refreshShowingWords()
            // this.search() // 配置项：切换码表是否自动搜索
            ipcRenderer.send('loadMainDict') // 请求主码表文件
        })
        ipcRenderer.on('saveFileSuccess', () => {
            this.labelOfSaveBtn = '保存成功'
            this.$refs.domBtnSave.classList.add('btn-green')
            setTimeout(()=>{
                this.$refs.domBtnSave.classList.remove('btn-green')
                this.labelOfSaveBtn = '保存'
            }, 2000)
        })



        // 由 window 触发获取文件目录的请求，不然无法实现适时的获取到 主进程返回的数据
        ipcRenderer.send('GetFileList')
        ipcRenderer.on('FileList', (event, fileList) => {
            log(fileList)
            this.dropdownFileList = fileList
        })
        ipcRenderer.send('loadInitDictFile')

        // 载入目标码表
        ipcRenderer.on('setTargetDict', (event, fileName, filePath, res) => {
            this.targetDict = new Dict(res, fileName, filePath)
        })

        // 载入主码表
        ipcRenderer.on('setMainDict', (event, filename, res) => {
            this.dictMain = new Dict(res, filename)
        })

        // 配置相关
        ipcRenderer.on('MainWindow:ResponseConfigFile', (event, config) => {
            this.config = config
            this.activeGroupId = config.chosenGroupIndex // 首次载入时，定位到上次选中的分组
            log('窗口载入时获取到的 config 文件：', config)
        })
        ipcRenderer.send('MainWindow:RequestConfigFile')

        // 配置文件保存后，向主窗口更新配置文件内容
        ipcRenderer.on('updateConfigFile', (event, config) => {
            this.config = config
        })

        // 获取网络请求返回的数据
        ipcRenderer.on('responseNetData', (event, data) => {
            log(data)
        })

        // 获取并设置字典文件
        ipcRenderer.on('setDictMap', (event, fileContent, fileName, filePath) => {
            this.dictMap = new DictMap(fileContent, fileName, filePath)
        })

        // 词库同步: 获取内容
        ipcRenderer.on('MainWindow:SyncDictResponseGetDictSuccess', (event, res) => {
            console.log(res)
            if (res.data === ''){
                this.tipNotice('该词库以前未同步过')
            } else {
                this.tipNotice('获取词库内容成功')
                this.dictSync = new Dict(res.data.content, res.data.title)
                this.syncDictWords()
                console.log(this.dictSync)
            }
        })


        // INIT
        ipcRenderer.send('getDictMap')

        this.addKeyboardListener()
        onresize = ()=>{
            this.heightContent = innerHeight - 47 - 20 - 10 + 3
        }
    },
    computed: {
        // 当前显示的 words 数量
        wordsCount(){
            if (this.dict.isGroupMode){
                let countCurrent = 0
                this.words.forEach(group => {
                    countCurrent = countCurrent + group.dict.length
                })
                return countCurrent
            } else {
                return this.words.length
            }
        },
        // 当前载入的是否为 主 码表
        isInMainDict(){
            return this.dict.fileName === 'wubi86_jidian.dict.yaml'
        }
    },

    methods: {
        // 工具面板展开
        toolPanelExpand(){
            this.config.isToolPanelShowing = true
            ipcRenderer.send('saveConfigFileFromMainWindow', JSON.stringify(this.config))
        },
        // 工具面板关闭
        toolPanelClose(){
            this.config.isToolPanelShowing = false
            ipcRenderer.send('saveConfigFileFromMainWindow', JSON.stringify(this.config))
        },
        // 切换码表文件
        switchToFile(file){
            ipcRenderer.send('MainWindow:LoadFile', file.path)
        },
        tipNotice(msg){
            this.tip = msg
            setTimeout(()=>{this.tip = ''}, 3000)
        },
        // 确定编辑词条
        confirmEditWord(){
            this.wordEditing = null
            if(this.config.autoDeployOnEdit) this.saveToFile(this.dict) // 根据配置，是否在编辑后保存码表文件
        },
        // 生成编辑词条的编码
        generateCodeForWordEdit(){
            if (this.wordEditing){
                this.wordEditing.code = this.dictMap.decodeWord(this.wordEditing.word)
            } else {
                shakeDomFocus(this.$refs.editInputWord)
            }
        },
        // 编辑词条
        editWord(word){
            this.wordEditing = word
        },

        // 选择操作
        select(index, wordId, event){
            if (event.shiftKey){
                if (this.lastChosenWordIndex !== null){
                    let a,b // 判断大小，调整大小顺序
                    if (index > this.lastChosenWordIndex){
                        a = this.lastChosenWordIndex
                        b = index
                    } else {
                        b = this.lastChosenWordIndex
                        a = index
                    }

                    if (this.dict.isGroupMode){
                        // TODO: select batch words cross group
                        if (this.activeGroupId !== -1){
                            for (let i=a; i<=b; i++){
                                this.chosenWordIds.add(this.dict.wordsOrigin[this.activeGroupId].dict[i].id)
                            }
                        } else {
                            this.tipNotice('只能在单组内进行批量选择')
                        }
                    } else {
                        for (let i=a; i<=b; i++){
                            this.chosenWordIds.add(this.words[i].id)
                        }
                    }
                }
                this.lastChosenWordIndex = null // shift 选择后，最后一个id定义为没有

            } else {
                if (this.chosenWordIds.has(wordId)){
                    this.chosenWordIds.delete(wordId)
                    this.lastChosenWordIndex = null
                } else {
                    this.chosenWordIds.add(wordId)
                    this.lastChosenWordIndex = index
                }
            }
            this.chosenWordIdArray = [...this.chosenWordIds.values()]
        },
        // 选择移动到的分组 index
        setDropdownActiveGroupIndex(index){
            this.dropdownActiveGroupIndex = index
        },
        // 选择移动到的文件 index
        setDropdownActiveIndex(fileIndex){
            this.dropdownActiveFileIndex = fileIndex
            this.dropdownActiveGroupIndex = -1 // 切换文件列表时，复位分组 fileIndex
            // this.dictSecond = {} // 立即清空次码表，分组列表也会立即消失，不会等下面的码表加载完成再清空
            ipcRenderer.send('MainWindow:LoadSecondDict', this.dropdownFileList[fileIndex].path) // 载入当前 index 的文件内容
        },
        sort(){
            this.dict.sort(this.activeGroupId)
            this.refreshShowingWords()
        },
        enterKeyPressed(){
            switch (this.config.enterKeyBehavior){
                case "add":this.addNewWord(); break;
                case "search": this.search(); break;
                default: break;
            }
        },
        // 通过 code, word 筛选词条
        search(){
            this.chosenWordIds.clear()
            this.chosenWordIdArray = []
            this.activeGroupId = -1 // 切到【全部】标签页，展示所有搜索结果
            let startPoint = new Date().getTime()
            if (this.code || this.word){
                if (this.dict.isGroupMode){
                    this.words = []
                    this.dict.wordsOrigin.forEach(groupItem => {
                        let tempGroupItem = groupItem.clone() // 不能直接使用原 groupItem，不然会改变 wordsOrigin 的数据
                        tempGroupItem.dict = tempGroupItem.dict.filter(item => {
                            switch (this.config.searchMethod){
                                case "code": return item.code.includes(this.code);
                                case "phrase": return item.word.includes(this.word);
                                case "both": return item.code.includes(this.code) && item.word.includes(this.word)
                                case "any": return item.code.includes(this.code) || item.word.includes(this.word)
                            }
                        })
                        if (tempGroupItem.dict.length > 0){ // 当前分组中有元素，添加到结果中
                            this.words.push(tempGroupItem)
                        }
                    })
                    log('用时: ', new Date().getTime() - startPoint, 'ms')
                } else {
                    this.words = this.dict.wordsOrigin.filter(item => { // 获取包含 code 的记录
                        switch (this.config.searchMethod){
                            case "code": return item.code.includes(this.code);
                            case "phrase": return item.word.includes(this.word);
                            case "both": return item.code.includes(this.code) && item.word.includes(this.word)
                            case "any": return item.code.includes(this.code) || item.word.includes(this.word)
                        }
                    })
                    log(`${this.code} ${this.word}: ` ,'搜索出', this.words.length, '条，', '用时: ', new Date().getTime() - startPoint, 'ms')
                }

            } else { // 如果 code, word 为空，恢复原有数据
                this.refreshShowingWords()
            }
        },

        // 查重
        checkRepetition(includeCharacter){
            this.setGroupId(-1) // 高亮分组定位到 【全部】
            this.words = this.dict.getRepetitionWords(includeCharacter)
        },
        // 词组编码查错
        getErrorWords(){
            let errorWords = []
            if(this.dict.isGroupMode){
                // 分组模式时
                this.dict.wordsOrigin.forEach(wordGroup => {
                    wordGroup.dict.forEach(item => {
                        if (getUnicodeStringLength(item.word) > 1) { // 只判断词条，不判断单字
                            // TODO: 字为 unicode 时，字符长度为 2
                            if (item.code !== this.dictMap.decodeWord(item.word)) {
                                errorWords.push(item)
                            }
                        }
                    })
                })
            } else {
                // 非分组模式时
                this.dict.wordsOrigin.forEach(item => {
                    if (getUnicodeStringLength(item.word) > 1) { // 只判断词条，不判断单字
                        if (item.code !== this.dictMap.decodeWord(item.word)) {
                            errorWords.push(item)
                        }
                    }
                })
            }
            let errorWordOrigin = []
            if (this.dict.isGroupMode){
                // 当是分组模式时，返回一个新的分组，不然无法显示正常
                errorWordOrigin.push(new WordGroup(888, '编码可能错误的词条', errorWords))
            } else {
                errorWordOrigin = errorWords
            }
            this.words = errorWordOrigin
        },

        // 选中词条纠错
        errorWordsCorrection(){
            this.chosenWordIds.forEach(id => {
                if (this.dict.isGroupMode){
                    // 分组模式时
                    this.words.forEach(wordGroup => {
                        wordGroup.dict.forEach(item => {
                            if (item.id === id){
                                let correctCode = this.dictMap.decodeWord(item.word)
                                if (correctCode){ // 只有获取到编码内容时才重新设置编码
                                    item.setCode(correctCode)
                                }
                            }
                        })
                    })
                } else {
                    // 非分组模式时
                    this.words.forEach(item => {
                        if (item.id === id){
                            let correctCode = this.dictMap.decodeWord(item.word)
                            if (correctCode){
                                item.setCode(correctCode)
                            }
                        }
                    })
                }
            })
        },

        // GROUP OPERATION
        // 添加新组
        addGroupBeforeId(groupIndex){
            this.dict.addGroupBeforeId(groupIndex)
            this.refreshShowingWords()
        },
        deleteGroup(groupId){
            this.dict.deleteGroup(groupId)
            this.activeGroupId = - 1 // 不管删除哪个分组，之后都指向全部
            this.refreshShowingWords()
        },
        // 设置当前显示的 分组
        setGroupId(groupId){ // groupId 全部的 id 是 -1
            this.activeGroupId = groupId
            this.refreshShowingWords()
            this.config.chosenGroupIndex = groupId
            ipcRenderer.send('saveConfigFileFromMainWindow', JSON.stringify(this.config))
        },
        // 刷新 this.words
        refreshShowingWords(){
            this.chosenWordIds.clear()
            this.chosenWordIdArray = []
            log('已选中的 groupIndex: ',this.activeGroupId, typeof this.activeGroupId)
            if (this.dict.isGroupMode){
                if (this.activeGroupId === -1){
                    this.words = [...this.dict.wordsOrigin]
                } else {
                    if (this.activeGroupId > this.dict.wordsOrigin.length - 1) {
                        this.activeGroupId = this.dict.wordsOrigin.length - 1
                    }
                    this.words = new Array(this.dict.wordsOrigin[this.activeGroupId])
                }
            } else {
                this.words = [...this.dict.wordsOrigin]
            }
        },
        addNewWord(){
            if (!this.word){
                shakeDomFocus(this.$refs.domInputWord)
            } else if (!this.code){
                shakeDomFocus(this.$refs.domInputCode)
            } else {
                this.dict.addNewWord(
                    new Word(this.dict.lastIndex, this.code, this.word, this.priority, this.note) ,
                    this.activeGroupId
                )
                this.refreshShowingWords()
                log(this.code, this.word, this.priority, this.note, this.activeGroupId)
                if (this.config.autoDeployOnAdd){
                    this.saveToFile(this.dict)
                }
            }
        },

        // 保存内容到文件
        saveToFile(dict){
            log(dict.fileName)
            ipcRenderer.send('saveFile', dict.fileName, dict.toYamlString())
        },
        // 选中全部展示的词条
        selectAll(){
            if(this.wordsCount < 100000){
                if (this.dict.isGroupMode){
                    this.chosenWordIds.clear()
                    this.chosenWordIdArray = []
                    this.words.forEach(group => { // group 是 dictGroup
                        group.dict.forEach( item => {
                            this.chosenWordIds.add(item.id)
                        })
                    })
                } else {
                    this.words.forEach(item => {this.chosenWordIds.add(item.id)})
                }
                this.chosenWordIdArray = [...this.chosenWordIds.values()]
            } else {
                // 提示不能同时选择太多内容
                this.tip = '不能同时选择大于 十万 条的词条内容'
                shakeDom(this.$refs.domBtnSelectAll)
            }
        },
        // 清除内容
        resetInputs(){
            this.chosenWordIds.clear()
            this.chosenWordIdArray = []
            this.code = ''
            this.word = ''
            this.search()
            this.tip = ''
        },
        // 删除词条：单
        deleteWord(wordId){
            this.chosenWordIds.delete(wordId)
            this.chosenWordIdArray = [...this.chosenWordIds.values()]
            this.dict.deleteWords(new Set([wordId]))
            this.refreshShowingWords()
            if(this.config.autoDeployOnDelete){ this.saveToFile(this.dict) }
        },
        // 删除词条：多
        deleteWords(){
            this.dict.deleteWords(this.chosenWordIds)
            this.refreshShowingWords()
            this.chosenWordIds.clear() // 清空选中 wordID
            this.chosenWordIdArray = []
            if(this.config.autoDeployOnDelete){ this.saveToFile(this.dict) }
        },

        // 词条位置移动
        move(wordId, direction){
            if (this.dict.isGroupMode){
                // group 时，移动 调换 word 位置，是直接调动的 wordsOrigin 中的word
                // 因为 group 时数据为： [{word, word},{word,word}]，是 wordGroup 的索引
                for(let i=0; i<this.words.length; i++){
                    let group = this.words[i]
                    for(let j=0; j<group.dict.length; j++){
                        if (wordId === group.dict[j].id){
                            let tempItem = group.dict[j]
                            if (direction === 'up'){
                                if (j !==0){
                                    group.dict[j] = group.dict[j - 1]
                                    group.dict[j - 1] = tempItem
                                    return ''
                                } else {
                                    log('已到顶')
                                    return '已到顶'
                                }
                            } else if (direction === 'down'){
                                if (j+1 !== group.dict.length){
                                    group.dict[j] = group.dict[j + 1]
                                    group.dict[j + 1] = tempItem
                                    return ''
                                } else {
                                    log('已到底')
                                    return '已到底'
                                }
                            }
                        }
                    }
                }
            } else {
                // 非分组模式时，调换位置并不能直接改变 wordsOrigin 因为 与 words 已经断开连接
                // [word, word]
                for(let i=0; i<this.words.length; i++){
                    if (wordId === this.words[i].id){
                        let tempItem = this.words[i]
                        if (direction === 'up'){
                            if (i !==0) {
                                this.dict.exchangePositionInOrigin(tempItem, this.words[i-1]) // 调换 wordsOrigin 中的词条位置
                                this.words[i] = this.words[i - 1]
                                this.words[i - 1] = tempItem
                                return ''
                            } else {
                                log('已到顶')
                                return '已到顶'
                            }
                        } else if (direction === 'down'){
                            if (i+1 !== this.words.length) {
                                this.dict.exchangePositionInOrigin(tempItem, this.words[i+1]) // 调换 wordsOrigin 中的词条位置
                                this.words[i] = this.words[i + 1]
                                this.words[i + 1] = tempItem
                                return ''
                            } else {
                                log('已到底')
                                return '已到底'
                            }
                        }
                    }
                }
            }
        },

        // 上移词条
        moveUp(id){
            this.tip = this.move(id, 'up')
            let temp = this.words.pop()
            this.words.push(temp)
        },
        // 下移词条
        moveDown(id){
            this.tip = this.move(id, 'down')
            let temp = this.words.pop()
            this.words.push(temp)
        },
        // 判断是否为第一个元素
        isFirstItem(id){
            if (this.dict.isGroupMode){ // 分组时的第一个元素
                for (let i=0; i<this.words.length; i++) {
                    for (let j = 0; j < this.words[i].dict.length; j++) {
                        if (this.words[i].dict[j].id === id){
                            return j === 0 // 使用 array.forEach() 无法跳出循环
                        }
                    }
                }
                return false
            } else {
                for (let i = 0; i < this.words.length; i++) {
                    if (this.words[i].id === id){
                        return i === 0 // 使用 array.forEach() 无法跳出循环
                    }
                }
                return false
            }
        },
        // 判断是否为最后一个元素
        isLastItem(id){
            if (this.dict.isGroupMode){ // 分组时的最后一个元素
                for (let i=0; i<this.words.length; i++) {
                    for (let j = 0; j < this.words[i].dict.length; j++) {
                        if (this.words[i].id === id){
                            return j + 1 === this.words.length
                        }
                    }
                }
                return false
            } else {
                for (let i = 0; i < this.words.length; i++) {
                    if (this.words[i].id === id){
                        return i + 1 === this.words.length
                    }
                }
                return false
            }
        },
        // 绑定键盘事件： 键盘上下控制词条上下移动
        addKeyboardListener(){
            window.addEventListener('keydown', event => {
                // log(event)
                switch( event.key) {
                    case 's':
                        if (event.ctrlKey || event.metaKey){ // metaKey 是 macOS 的 Ctrl
                            this.saveToFile(this.dict)
                            event.preventDefault()
                        } else {

                        }
                        break
                    case 'ArrowDown':
                        if(this.chosenWordIds.size === 1) { // 只有一个元素时，键盘才起作用
                            let id = [...this.chosenWordIds.values()][0]
                            this.moveDown(id)
                        }
                        event.preventDefault()
                        break
                    case 'ArrowUp':
                        if(this.chosenWordIds.size === 1) { // 只有一个元素时，键盘才起作用
                            let id = [...this.chosenWordIds.values()][0]
                            this.moveUp(id)
                        }
                        event.preventDefault()
                        break
                }
            })
        },
        // 将选中的词条移动到指定码表
        moveWordsToTargetDict(){
            let wordsTransferring = [] // 被转移的 [Word]
            if (this.dict.isGroupMode){
                this.dict.wordsOrigin.forEach((group, index) => {
                    let matchedWords = group.dict.filter(item => this.chosenWordIds.has(item.id))
                    wordsTransferring = wordsTransferring.concat(matchedWords)
                })
            } else {
                wordsTransferring = this.dict.wordsOrigin.filter(item => this.chosenWordIds.has(item.id))
            }
            log('words transferring：', JSON.stringify(wordsTransferring))

            if (this.dict.fileName === this.targetDict.fileName){ // 如果是同词库移动
                this.targetDict.deleteWords(this.chosenWordIds, true) // 删除移动的词条
                this.targetDict.addWordsInOrder(wordsTransferring, this.dropdownActiveGroupIndex)
                log('after insert:( main:wordOrigin ):\n ', JSON.stringify(this.targetDict.wordsOrigin))
                // 如果在同码表中移动：如，从一个分组移到别一个分组
                // 只保存 dictSecond 内容，重新载入 dict 内容
                this.saveToFile(this.targetDict)
                this.reloadCurrentDict()
            } else {
                this.targetDict.addWordsInOrder(wordsTransferring, this.dropdownActiveGroupIndex)
                this.words = [...this.dict.wordsOrigin]
                log('after insert:( main:wordOrigin ):\n ', JSON.stringify(this.targetDict.wordsOrigin))
                this.deleteWords() // 删除当前词库已移动的词条
                this.saveToFile(this.targetDict)
                this.saveToFile(this.dict)
            }
            this.tip = '移动成功'
            setTimeout(()=>{this.tip = ''}, 3000)
            this.resetDropList()
        },
        // 复制 dropdown
        resetDropList(){
            this.showDropdown = false
            this.dropdownActiveFileIndex = -1
            this.dropdownActiveGroupIndex = -1
            this.targetDict = {} // 清空次码表
        },
        // 打开当前码表源文件
        openCurrentYaml(){
            ipcRenderer.send('openFileOutside', this.dict.fileName)
        },
        // 重新载入当前码表
        reloadCurrentDict(){
            ipcRenderer.send('loadDictFile', this.dict.fileName)
        },

        // 导出选中词条到 plist 文件
        exportSelectionToPlist(){
            let wordsSelected = [] // 被选中的 [Word]
            if (this.dict.isGroupMode){
                this.dict.wordsOrigin.forEach((group, index) => {
                    let matchedWords = group.dict.filter(item => this.chosenWordIds.has(item.id))
                    wordsSelected = wordsSelected.concat(matchedWords)
                })
            } else {
                wordsSelected = this.dict.wordsOrigin.filter(item => this.chosenWordIds.has(item.id))
            }
            ipcRenderer.send('MainWindow:ExportSelectionToPlistFile', wordsSelected)
        },

       /*
        *
        * 同步功能过程：
        * 1. 先获取线上已存在的当前文件名的内容
        * 2-1. 如果有，获取并对比本地码表内容，增量合成一个新的
        * 2-2. 如果没有，直接上传当前的本地内容
        * 3. 上传新的词库内容
        *
        */

        // 同步功能开始
        //
        syncCurrentDict(){
            if (this.config.hasOwnProperty('userInfo')){
                // 获取线上已存在的码表数据
                ipcRenderer.send('MainWindow:SyncDictGetCurrentDictContent',
                    {
                        dictName: this.dict.fileName,
                        userInfo: this.config.userInfo
                    }
                )
            } else {
                this.tip = '未登录，请先前往配置页面登录'
            }

        },

        // 同步词库内容
        syncDictWords(){
            // 原来的词条数量
            let originWordCount = this.dict.countDictOrigin

            if (this.dict.isGroupMode){ // 分组模式时
                // DictMap
                let wordGroupMap = new Map()
                this.dict.wordsOrigin.forEach(group => {
                    wordGroupMap.set(group.groupName, group)
                })

                this.dictSync.wordsOrigin.forEach(syncWordGroup => {
                    if (wordGroupMap.has(syncWordGroup.groupName)){
                        // 1. 获取当前对应的 wordGroup
                        let originWordGroup = wordGroupMap.get(syncWordGroup.groupName)
                        // 2. 新建一个 OriginWordGroup.dict 的 map，用于确定是否存在相同词条
                        let originWordMap = new Map()
                        originWordGroup.dict.forEach(word => {
                            originWordMap.set(word.word, word)
                        })
                        // 3. 对比词条内容
                        syncWordGroup.dict.forEach(syncWord => {
                            if (originWordMap.has(syncWord.word)){ // 存在词条相同
                                let wordOrigin = originWordMap.get(syncWord.word)
                                if (syncWord.isContentEqualTo(wordOrigin)){ // 如果两个词条编码和词条一模一样
                                    // 什么也不做
                                } else {
                                    // 添加到这个组里，用户自行去重 **
                                    this.dict.lastIndex = this.dict.lastIndex + 1
                                    syncWord.id = this.dict.lastIndex
                                    originWordGroup.dict.push(syncWord)
                                }
                            } else {
                                this.dict.lastIndex = this.dict.lastIndex + 1
                                syncWord.id = this.dict.lastIndex
                                originWordGroup.dict.push(syncWord)
                            }
                        })
                    } else {
                        // 如果没有相同名字，直接添加
                        this.dict.lastGroupIndex = this.dict.lastGroupIndex + 1
                        let newWordGroup = new WordGroup(this.dict.lastGroupIndex, syncWordGroup.groupName, syncWordGroup.dict, false)
                        this.dict.wordsOrigin.push(newWordGroup)
                    }
                })
            } else {
                //
                // 非分组模式时
                //
                // 1. 新建一个 wordMap
                let originWordMap = new Map()
                this.dict.wordsOrigin.forEach(word => {
                    originWordMap.set(word.word, word)
                })
                // 2. 对比词条内容
                this.dictSync.wordsOrigin.forEach(syncWord => {
                    if (originWordMap.has(syncWord.word)) { // 存在词条相同
                        let wordOrigin = originWordMap.get(syncWord.word)
                        if (syncWord.isContentEqualTo(wordOrigin)) { // 如果两个词条编码和词条一模一样
                            // 什么也不做
                        } else {
                            // 添加到这个组里，用户自行去重 **
                            this.dict.lastIndex = this.dict.lastIndex + 1 // 更新 id, 不然 id 重复导致列表有不显示的
                            syncWord.id = this.dict.lastIndex
                            this.dict.wordsOrigin.push(syncWord)
                        }
                    } else {
                        this.dict.lastIndex = this.dict.lastIndex + 1
                        syncWord.id = this.dict.lastIndex
                        this.dict.wordsOrigin.push(syncWord)
                    }
                })
            }
            console.log(this.dict.wordsOrigin)
            this.refreshShowingWords() // 刷新显示的词条
            let afterWordCount = this.dict.countDictOrigin
            this.tipNotice(`新增 ${afterWordCount - originWordCount} 条记录`)
            // ipcRenderer.send('MainWindow:SyncDictSaveCurrentDict')
        }
    },
    watch: {
        code(newValue){
            this.code = newValue.replaceAll(/[^A-Za-z ]/g, '') // input.code 只允许输入字母
        },
        word(newValue, oldValue){
            if (newValue.length < oldValue.length){
                // 删除或清空时，不清空编码
            } else {
                if (this.dictMap){
                    this.code = this.dictMap.decodeWord(newValue)
                }
            }
        },
        chosenWordIdArray(newValue){
            if (newValue.length === 0){
                this.showDropdown = false
            }
            log('已选词条id: ', JSON.stringify(newValue))
        },
        showDropdown(newValue){
            if (!newValue){ // 窗口关闭时，重置 index
                this.resetDropList()
            }
        },
        config: (newValue) => {
            switch (newValue.theme){
                case "auto":
                    document.documentElement.classList.add('theme-auto');
                    document.documentElement.classList.remove('theme-dark');
                    document.documentElement.classList.remove('theme-white');
                    break;
                case "black":
                    document.documentElement.classList.remove('theme-auto');
                    document.documentElement.classList.add('theme-dark');
                    document.documentElement.classList.remove('theme-white');
                    break;
                case "white":
                    document.documentElement.classList.remove('theme-auto');
                    document.documentElement.classList.remove('theme-dark');
                    document.documentElement.classList.add('theme-white');
                    break;
            }
        }
    }
}

new Vue(app)
