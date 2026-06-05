const {shakeDom, shakeDomFocus, log, dateFormatter, getUnicodeStringLength} = require('../../js/Utility')
const {IS_IN_DEVELOP, BASE_URL} = require('../../js/Global')

const Dict = require('../../js/Dict')
const DictMap = require('../../js/DictMap')
const Word = require('../../js/Word')
const {parseDictAsync, serializeDictAsync} = require('../../js/dictWorkerClient')
const {prepareWordsForPinyinDictAsync, addWordsToPinyinDictInOrderAsync} = require('../../js/PinyinDictHelper')
const Vue  = require('../../node_modules/vue/dist/vue.common.prod')

const {ipcRenderer, net} = require('electron')
const VirtualScroller = require('vue-virtual-scroller')
const WordGroup = require("../../js/WordGroup");

const wubiApi = require("../../js/wubiApi")
const { TipMixin } = require('../../js/TipMixin')

// Vue 2
const app = {
    el: '#app',
    mixins: [TipMixin],
    components: {
        RecycleScroller: VirtualScroller.RecycleScroller,
        DynamicScroller: VirtualScroller.DynamicScroller,
        DynamicScrollerItem: VirtualScroller.DynamicScrollerItem,
    },
    data() {
        return {
            IS_IN_DEVELOP, // 是否为开发模式，html 使用

            dict: {},  // 当前词库对象 Dict
            dictMain: {}, // 主码表 Dict
            keyword: '', // 搜索关键字

            code: '', // 编码
            word: '', // 词条
            priority: '', // 优先级
            note: '', // 备注

            // 编码重复的词条
            wordsRedundancy: [],
            isSearchbarFocused: false, // 光标是否在 searchbar input

            activeGroupId: -1, // 组 index
            keywordUnwatch: null, // keyword watch 方法的撤消方法
            labelOfSaveBtn: '保存', // 保存按钮的文本
            heightContent: 0, // content 高度
            words: [], // 显示的 words

            chosenWordIds: new Set(),
            chosenWordIdArray: [], // 对应上面的 set 内容
            lastChosenWordIndex: null, // 最后一次选中的 index
            lastChosenGroupIndex: null, // 分组模式下最后一次选中的 groupIndex


            targetDict: {}, // 要移动到的码表
            pinyinDict: null, // 拼音词库缓存
            pendingAddToPinyin: false,
            isPinyinAddBusy: false,
            pinyinAddPhase: '', // loading | preparing | inserting | saving
            isShowDropdown: false, // 显示移动词条窗口
            dropdownFileList: [
                // {name: '拼音词库', path: 'pinyin_simp.dict.yaml'}
            ],
            dropdownActiveFileIndex: -1, // 选中的
            dropdownActiveGroupIndex: -1, // 选中的分组 ID

            config: {}, // 全局配置

            dictMap: null, // main 返回的 dictMap，用于解码词条

            wordEditing: null, // 正在编辑的词条

            // 同步词库
            dictSync: null,

            // 网络相关
            categories: [],
            selectedCategoryId: 10, // 线上的 [ 通用词库 ]
            dictBackupInfo: null,  // 当前词库在线上的备份信息
            isDeleteAfterUpload: false, // 上传词条后是否在本地删除对应的词条

            isDictLoading: false,
            codeDebounceTimer: null,

        }
    },
    mounted() {
        // 为了消除奇怪的界面高度显示问题
        setTimeout(()=> {
            this.heightContent = innerHeight - 47 - 20 - 10 + 3
        }, 300)

        // 窗口显示时 WINDOWS SHOWED
        ipcRenderer.on('MainWindow:onWindowShowed', (event) => {
            this.$refs.domInputWord.focus()
        })
        // 载入主要操作码表文件
        ipcRenderer.on('showFileContent', (event, fileName, filePath, res) => {
            this.loadDictFromContent(res, fileName, filePath)
        })
        ipcRenderer.on('saveFileSuccess', () => {
            this.labelOfSaveBtn = '保存成功'
            this.$refs.domBtnSave.classList.add('btn-green')
            setTimeout(()=>{
                this.$refs.domBtnSave.classList.remove('btn-green')
                this.labelOfSaveBtn = '保存'
            }, 2000)
        })

        // 配置相关
        ipcRenderer.on('MainWindow:ResponseConfigFile', (event, config) => {
            this.config = config
            if (!config.hasOwnProperty('pinyinDictFileName')) {
                this.$set(this.config, 'pinyinDictFileName', 'pinyin_simp.dict.yaml')
            }
            this.activeGroupId = Number(config.chosenGroupIndex) // 首次载入时，定位到上次选中的分组
            console.log('窗口载入时获取到的 config 文件：', config)

            // request for file list
            ipcRenderer.send('GetFileList')

            // 载入配置文件之后，请求网络数据
            // network
            if (this.config.userInfo){
                this.getOnlineCategories()
            }
            this.checkFileBackupExistence()
        })
        ipcRenderer.send('MainWindow:RequestConfigFile')


        // 由 window 触发获取文件目录的请求，不然无法实现适时的获取到 主进程返回的数据
        ipcRenderer.on('FileList', (event, fileList) => {
            // 此时已经存在  config 了
            if (this.config.fileNameList && this.config.fileNameList.length > 0){
                let fileNameMap = new Map()
                this.config.fileNameList.forEach(fileNamePair => {
                    fileNameMap.set(fileNamePair.path, fileNamePair.name)
                })
                this.dropdownFileList = fileList.map(fileNameListItem => {
                    return {
                        name: fileNameMap.get(fileNameListItem.path) || fileNameListItem.name,
                        path: fileNameListItem.path
                    }
                }).sort((a,b) => a.name > b.name ? 1:-1)
            } else {
                this.dropdownFileList = fileList
            }
        })

        ipcRenderer.send('loadInitDictFile')

        // 载入目标码表
        ipcRenderer.on('setTargetDict', (event, fileName, filePath, res) => {
            this.loadDictFromContent(res, fileName, filePath, false, 'targetDict')
        })

        ipcRenderer.on('MainWindow:PinyinDictLoaded', (event, fileName, filePath, res) => {
            this.loadDictFromContent(res, fileName, filePath, false, 'pinyinDict')
        })
        ipcRenderer.on('MainWindow:PinyinDictLoadError', (event, message) => {
            this.finishPinyinAdd()
            this.showTip(`载入拼音词库失败：${message}`)
        })

        // 载入主码表
        ipcRenderer.on('setMainDict', (event, filename, res) => {
            this.loadDictFromContent(res, filename, '', true, 'dictMain')
        })

        // 配置文件保存后，向主窗口更新配置文件内容
        ipcRenderer.on('updateConfigFile', (event, config) => {
            if (this.config.pinyinDictFileName !== config.pinyinDictFileName) {
                this.pinyinDict = null
            }
            this.config = config
        })

        // 获取网络请求返回的数据
        ipcRenderer.on('responseNetData', (event, data) => {
            console.log(data)
        })

        // 获取并设置字典文件
        ipcRenderer.on('setDictMap', (event, fileContent, fileName, filePath) => {
            this.dictMap = new DictMap(null, fileContent)
        })

        // 同步: 获取内容 增量
        ipcRenderer.on('MainWindow:sync.get:INCREASE:SUCCESS', (event, res) => {
            console.log(res)
            if (res.data === ''){
                this.showTip('该词库以前未同步过')
                this.sendDictYamlForSync()
                console.log('MainWindow:sync.save')
            } else {
                this.showTip('下载成功')
                this.dictSync = new Dict(res.data.content, res.data.title)
                this.syncDictWords()
                console.log(this.dictSync)
            }
        })

        // 同步: 获取内容 覆盖
        ipcRenderer.on('MainWindow:sync.get:OVERWRITE:SUCCESS', (event, res) => {
            console.log('MainWindow:sync.get:OVERWRITE:SUCCESS')
            console.log(res)
            if (res.data === ''){
                this.showTip('该词库未同步过')
            } else {
                this.showTip('下载成功')
                let filePath = this.dict.filePath
                this.dict = new Dict(res.data.content, res.data.title, this.dict.filePath)
                this.refreshShowingWords()
                console.log(this.dict)
            }
        })

        // 同步： 保存成功
        ipcRenderer.on('MainWindow:sync.save:SUCCESS', (event, res) => {
            // 更新备份状态信息
            this.checkFileBackupExistence()
            this.showTip('上传成功')
            console.log('MainWindow:sync.save:SUCCESS')
            console.log(res)
        })

        // 同步： 保存失败
        ipcRenderer.on('MainWindow:sync.save:FAIL', (event, message) => {
            this.showTip(message)
        })

        ipcRenderer.on('MainWindow:ApplyRime:Result', (event, result) => {
            if (result && result.message) {
                this.showTip(result.message, result.success ? 2000 : 4000)
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
        },
        // 文件名字列表
        fileNameListMap(){
            // [{ "name": "luna_pinyin.sogou", "path": "luna_pinyin.sogou.dict.yaml" }]
            return new Map(this.config.fileNameList.map(item => [item.path, item.name]))
        },
        groupFlatItems(){
            if (!this.dict || !this.dict.isGroupMode || !this.words || this.words.length === 0) {
                return []
            }
            const items = []
            this.words.forEach((group, groupIndex) => {
                if (!group || !group.dict) {
                    return
                }
                items.push({
                    uid: `header-${group.id}-${groupIndex}`,
                    type: 'header',
                    group,
                    groupIndex,
                })
                group.dict.forEach((item, index) => {
                    items.push({
                        uid: `word-${item.id}`,
                        type: 'word',
                        item,
                        index,
                        groupIndex,
                    })
                })
            })
            return items
        },
        pinyinAddButtonLabel(){
            if (!this.isPinyinAddBusy) {
                return '添加到拼音词库'
            }
            const labels = {
                loading: '载入拼音词库...',
                preparing: '正在转换拼音...',
                inserting: '正在插入词条...',
                saving: '正在保存...',
            }
            return labels[this.pinyinAddPhase] || '处理中...'
        },
    },
    methods: {
        loadDictFromContent(fileContent, fileName, filePath, isForceProcessInUngroupMode = false, targetKey = 'dict'){
            if (targetKey === 'dict') {
                this.isDictLoading = true
            }
            return parseDictAsync(fileContent, isForceProcessInUngroupMode)
                .then(parsed => {
                    const dict = Dict.fromParsed(parsed, fileName, filePath)
                    if (targetKey === 'dictMain') {
                        this.dictMain = dict
                        console.log('主码表词条数量：', this.dictMain.wordsOrigin.length)
                    } else if (targetKey === 'targetDict') {
                        this.targetDict = dict
                    } else if (targetKey === 'pinyinDict') {
                        this.pinyinDict = dict
                        if (this.pendingAddToPinyin) {
                            this.pendingAddToPinyin = false
                            const wordsSelected = this.getSelectedWords()
                            this.updatePinyinAddProgress('preparing', `正在转换拼音（0/${wordsSelected.length}）...`)
                            this.applyAddToPinyinDict(wordsSelected)
                        }
                    } else {
                        this.dict = dict
                        this.word = ''
                        this.refreshShowingWords()
                        ipcRenderer.send('loadMainDict')
                        this.checkFileBackupExistence()
                    }
                })
                .catch(err => {
                    console.error(err)
                    if (targetKey === 'pinyinDict') {
                        this.finishPinyinAdd()
                        this.showTip(`载入拼音词库失败：${err.message}`)
                    } else {
                        this.showTip(`载入失败：${err.message}`)
                    }
                })
                .finally(() => {
                    if (targetKey === 'dict') {
                        this.isDictLoading = false
                    }
                })
        },
        matchesSearch(item, code, word){
            switch (this.config.searchMethod){
                case "code": return item.code.includes(code)
                case "phrase": return item.word.includes(word)
                case "both": return item.code.includes(code) && item.word.includes(word)
                case "any": return item.code.includes(code) || item.word.includes(word)
                default: return item.code.includes(code) || item.word.includes(word)
            }
        },
        buildSearchGroupView(groupItem, code, word){
            const dict = groupItem.dict.filter(item => this.matchesSearch(item, code, word))
            if (dict.length === 0) {
                return null
            }
            return {
                id: groupItem.id,
                groupName: groupItem.groupName,
                dict,
                isEditingTitle: false,
            }
        },
        updateWordsRedundancy(code){
            const normalizedCode = code.replaceAll(/[^A-Za-z ]/g, '')
            if (!normalizedCode) {
                this.wordsRedundancy = []
                return
            }
            const wordsMainDictRedundancy = (this.dictMain?.getWordsByCode(normalizedCode) || []).map(item => {
                item.origin = this.fileNameListMap.get(this.config.mainDictFileName)
                return item
            })
            const wordsCurrentDictRedundancy = (this.dict?.getWordsByCode(normalizedCode) || []).map(item => {
                item.origin = '当前码表'
                return item
            })
            this.wordsRedundancy = wordsMainDictRedundancy.concat(wordsCurrentDictRedundancy)
        },
        // 显示 | 隐藏 移动到文件的列表
        toggleFileListDropDown(){
            if (this.isShowDropdown){
                this.isShowDropdown = false
            } else {
                // 匹配跟当前码表一致的 file Index，只在分组模式时自动选择
                if (this.dict.isGroupMode){
                    this.dropdownFileList.forEach((item, index) => {
                        if (item.path === this.dict.fileName){
                            this.dropdownActiveFileIndex = index
                            this.setDropdownActiveIndex(index)
                        }
                    })
                }
                this.isShowDropdown = true
            }
        },
        // 获取词库备份信息
        checkFileBackupExistence(){
            if (this.config.userInfo && this.config.userInfo.password && this.dict.fileName){ // config 和 当前词库内容都已经载入时才请求备份信息
                wubiApi
                    .checkDictFileBackupExistence(this.config.userInfo, {
                        fileName: this.dict.fileName
                    }, this.config.baseURL)
                    .then(res => {
                        this.dictBackupInfo = res.data
                        /* {
                            "id": 28,
                            "title": "wubi86_jidian_user.dict.yaml",
                            "content_size": 2717,
                            "word_count": 196,
                            "date_init": "2022-04-23T02:17:57.000Z",
                            "date_update": "2022-12-14T02:34:51.000Z",
                            "comment": "",
                            "uid": 3,
                            "sync_count": 2
                        }*/
                        if (this.dictBackupInfo){
                            // console.log(this.dictBackupInfo)
                            this.$set(this.dictBackupInfo,'date_init_string', dateFormatter(new Date(this.dictBackupInfo.date_init)))
                            this.$set(this.dictBackupInfo,'date_update_string', dateFormatter(new Date(this.dictBackupInfo.date_update)))
                        }

                    })
            }
        },
        // 获取线上的扩展词库分类列表
        getOnlineCategories(){
            wubiApi
                .getCategories(this.config.userInfo, this.config.baseURL)
                .then(res => {
                    this.categories = res.data
                })
        },

        // 改变上传到的类别 id
        changeSelectedCategoryId(categoryId){
            this.selectedCategoryId = categoryId
        },

        // 上传选中的词条到服务器
        uploadChosenWordsToServer(){
            let wordsSelected = [] // 被选中的 [Word]
            if (this.dict.isGroupMode){
                this.dict.wordsOrigin.forEach((group, index) => {
                    let matchedWords = group.dict.filter(item => this.chosenWordIds.has(item.id))
                    wordsSelected = wordsSelected.concat(matchedWords)
                })
            } else {
                wordsSelected = this.dict.wordsOrigin.filter(item => this.chosenWordIds.has(item.id))
            }

            wubiApi
                .uploadWordsBatch(
                    this.config.userInfo,
                    {
                        category_id: this.selectedCategoryId,
                        words: wordsSelected
                    }, this.config.baseURL)
                .then(res => {
                    let message = `添加 ${res.data.addedCount} 条`
                    if (res.data.existCount > 0){
                        message = message + `，已存在词条 ${res.data.existCount} 条`
                    }
                    // 上传成功
                    this.showTip([res.message, message])
                    if (this.isDeleteAfterUpload){
                        // 删除已经上传的词条
                        this.deleteWords()
                    }
                })
                .catch(err => {
                    this.showTip(err.message)
                })
        },

        // 下载线上扩展词库到本地
        updateExtraDict(){
            if (this.config.userInfo.password){
                console.log('config: ', this.config)
                wubiApi
                    .pullExtraDict(this.config.userInfo, this.config.baseURL)
                    .then(res => {
                        this.showTip('获取线上分类扩展词库内容成功')

                        // 使用线上的更新数据更新到当前分类扩展词库中
                        let wordGroups = []
                        let lastCategoryName = ''
                        console.log(res.data.length)
                        res.data
                            .sort((a,b) => a.category_id - b.category_id)
                            .forEach(item => {
                                if (lastCategoryName !== item.category_name) {
                                    wordGroups.push(new WordGroup(
                                        item.category_id,
                                        item.category_name,
                                        [new Word(item.id, item.code, item.word, item.priority, item.comment)]
                                    ))
                                } else {
                                    wordGroups[wordGroups.length - 1].dict.push(new Word(item.id, item.code, item.word, item.priority, item.comment))
                                }
                                lastCategoryName = item.category_name
                            })
                        this.dict.wordsOrigin = wordGroups
                        this.refreshShowingWords()
                    })
                    .catch(err => {
                        this.showTip(err.message)
                    })
            } else {
                this.showTip('未登录用户，请先前往配置页面登录')
            }
        },

        // 部署码表内容
        applyRime(){
            ipcRenderer.send('MainWindow:ApplyRime')
        },
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

        // 当前列表中用于 Shift 连选的词条数组
        getWordListForSelect(groupIndex){
            if (!this.dict.isGroupMode) {
                return this.words
            }
            if (this.activeGroupId !== -1) {
                return this.words[0]?.dict || []
            }
            if (groupIndex >= 0 && this.words[groupIndex]) {
                return this.words[groupIndex].dict
            }
            return []
        },
        // 选择操作
        onWordMouseDown(event){
            if (event.shiftKey) {
                event.preventDefault()
            }
        },
        select(groupIndex, index, wordId, event){
            const wordList = this.getWordListForSelect(groupIndex)
            if (event.shiftKey){
                if (this.lastChosenWordIndex !== null && this.lastChosenGroupIndex === groupIndex){
                    let a, b
                    if (index > this.lastChosenWordIndex){
                        a = this.lastChosenWordIndex
                        b = index
                    } else {
                        b = this.lastChosenWordIndex
                        a = index
                    }
                    for (let i = a; i <= b; i++){
                        if (wordList[i]) {
                            this.chosenWordIds.add(wordList[i].id)
                        }
                    }
                } else {
                    this.showTip('请先在当前分组内点击一条词条，再按住 Shift 连选')
                }
                this.lastChosenWordIndex = null
                this.lastChosenGroupIndex = null

            } else {
                if (this.chosenWordIds.has(wordId)){
                    this.chosenWordIds.delete(wordId)
                    this.lastChosenWordIndex = null
                    this.lastChosenGroupIndex = null
                } else {
                    this.chosenWordIds.add(wordId)
                    this.lastChosenWordIndex = index
                    this.lastChosenGroupIndex = groupIndex
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
        addPriority(){
            this.dict.addCommonPriority()
        },
        generateSqlFile(){
            let sqlArray = this.dict.wordsOrigin.map(word => {
                let timeNow = dateFormatter(new Date())
                return `INSERT into wubi_words(word, code, priority, date_create, comment, user_init, user_modify, category_id)
                    VALUES(
                        '${word.word}','${word.code}',${word.priority || 0},'${timeNow}','${word.note}', 3, 3, 1);`
            })
            ipcRenderer.send('saveFile', 'sql.sql', sqlArray.join('\n'))
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
                    this.words = this.dict.wordsOrigin
                        .map(groupItem => this.buildSearchGroupView(groupItem, this.code, this.word))
                        .filter(Boolean)
                    console.log('用时: ', new Date().getTime() - startPoint, 'ms')
                } else {
                    this.words = this.dict.wordsOrigin.filter(item => this.matchesSearch(item, this.code, this.word))
                    console.log(`${this.code} ${this.word}: ` ,'搜索出', this.words.length, '条，', '用时: ', new Date().getTime() - startPoint, 'ms')
                }

            } else { // 如果 code, word 为空，恢复原有数据
                this.refreshShowingWords()
            }
        },

        // 查重
        checkRepetition(includeCharacter, isWithAllRepeatWord, isWithAllType){
            this.setGroupId(-1) // 高亮分组定位到 【全部】
            this.words = this.dict.getRepetitionWords(includeCharacter, isWithAllRepeatWord, isWithAllType)
        },

        // 查询所有与单字重复的词条
        checkRepeatedWordWithSameCode(){
            this.words = this.dict.getRepeatedWordsWithSameCode()
        },

        // 词组编码查错
        getErrorWords(){
            let errorWords = []
            if(this.dict.isGroupMode){
                // 分组模式时
                this.dict.wordsOrigin.forEach(wordGroup => {
                    wordGroup.dict.forEach(item => {
                        item.indicator = wordGroup.groupName
                        if (getUnicodeStringLength(item.word) > 1 && !/[a-zA-Z0-9]+/.test(item.word)) { // 只判断词条，不判断单字
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
                    if (getUnicodeStringLength(item.word) > 1 && !/[a-zA-Z0-9]+/.test(item.word)) { // 只判断词条，不判断单字
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


        // 单字编码查错
        getErrorWordsSingle(){
            let errorWords = []
            if(this.dict.isGroupMode){
                // 分组模式时
                this.dict.wordsOrigin.forEach(wordGroup => {
                    wordGroup.dict.forEach(item => {
                        item.indicator = wordGroup.groupName
                        if (getUnicodeStringLength(item.word) === 1) {
                            if (item.code !== this.dictMap.decodeWordSingle(`${item.word}-${item.code.length}`)) {
                                errorWords.push(item)
                            }
                        }
                    })
                })
            } else {
                // 非分组模式时
                this.dict.wordsOrigin.forEach(item => {
                    if (getUnicodeStringLength(item.word) === 1) {
                        if (item.code !== this.dictMap.decodeWordSingle(`${item.word}-${item.code.length}`)) {
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
        correctErrorWords(){
            let timeStart = new Date().getTime()
            let correctionCount = 0
            let errorCount = 0
            this.chosenWordIds.forEach(id => {
                if (this.dict.isGroupMode){
                    // 分组模式时
                    this.words.forEach(wordGroup => {
                        wordGroup.dict.forEach(item => {
                            if (item.id === id){
                                if (getUnicodeStringLength(item.word) === 1){ // 单字时
                                    let correctCode = this.dictMap.decodeWordSingle(`${item.word}-${item.code.length}`)
                                    if (correctCode){
                                        item.setCode(correctCode)
                                        correctionCount = correctionCount + 1
                                    } else {
                                        item.setCode('orz')
                                        errorCount = errorCount + 1
                                    }
                                } else {
                                    let correctCode = this.dictMap.decodeWord(item.word)
                                    if (correctCode){
                                        item.setCode(correctCode)
                                        correctionCount = correctionCount + 1
                                    }
                                }
                            }
                        })
                    })
                } else {
                    // 非分组模式时
                    this.words.forEach(item => {
                        if (item.id === id){
                            if (getUnicodeStringLength(item.word) === 1){ // 单字时
                                let correctCode = this.dictMap.decodeWordSingle(`${item.word}-${item.code.length}`)
                                if (correctCode){
                                    item.setCode(correctCode)
                                    correctionCount = correctionCount + 1
                                } else {
                                    item.setCode('orz')
                                    errorCount = errorCount + 1
                                }
                            } else {
                                let correctCode = this.dictMap.decodeWord(item.word)
                                if (correctCode){
                                    item.setCode(correctCode)
                                    correctionCount = correctionCount + 1
                                }
                            }
                        }
                    })
                }
            })

            console.log(`用时：${new Date().getTime() - timeStart} ms`)
            console.log(`显示词条数为： ${this.chosenWordIds.size}，纠正：${correctionCount} 个，需要删除：${errorCount} 个`)
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
            this.activeGroupId = Number(groupId)
            this.refreshShowingWords()
            this.config.chosenGroupIndex = groupId
            ipcRenderer.send('saveConfigFileFromMainWindow', JSON.stringify(this.config))
        },
        // 刷新 this.words
        refreshShowingWords(){
            this.chosenWordIds.clear()
            this.chosenWordIdArray = []
            this.lastChosenWordIndex = null
            this.lastChosenGroupIndex = null
            console.log('已选中的 groupIndex: ',this.activeGroupId, typeof this.activeGroupId)
            if (this.dict.isGroupMode){
                if (Number(this.activeGroupId) === -1){
                    this.words = [...this.dict.wordsOrigin]
                } else {
                    if (this.activeGroupId > this.dict.wordsOrigin.length - 1) {
                        this.activeGroupId = this.dict.wordsOrigin.length - 1
                    }
                    this.words = [this.dict.wordsOrigin[this.activeGroupId]]
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
                console.log(this.code, this.word, this.priority, this.note, this.activeGroupId)
                if (this.config.autoDeployOnAdd){
                    this.saveToFile(this.dict)
                }
            }
        },

        // 保存内容到文件
        saveToFile(dict, options = {}){
            const { updateSaveButton = true } = options
            console.log('save to: ', dict.fileName)
            const previousLabel = this.labelOfSaveBtn
            if (updateSaveButton) {
                this.labelOfSaveBtn = '保存中...'
            }
            return serializeDictAsync(dict)
                .then(yamlString => {
                    ipcRenderer.send('saveFile', dict.fileName, yamlString)
                })
                .catch(err => {
                    console.error(err)
                    this.showTip(`保存失败：${err.message}`)
                    if (updateSaveButton) {
                        this.labelOfSaveBtn = previousLabel
                    }
                    throw err
                })
        },
        sendDictYamlForSync(){
            return serializeDictAsync(this.dict).then(yamlString => {
                ipcRenderer.send('MainWindow:sync.save', {
                    fileName: this.dict.fileName,
                    fileContentYaml: yamlString,
                    wordCount: this.dict.countDictOrigin,
                    userInfo: this.config.userInfo
                })
            })
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
                this.showTip('不能同时选择大于 十万 条的词条内容')
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
            this.tips = []
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

        /**
         * 词条位置移动
         * @param wordId 词条 id
         * @param direction 方向
         * @param isSwitchPriority  是否调换两个词条的 Priority
         * @returns {string}
         */
        move(wordId, direction, isSwitchPriority){
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
                                    if (isSwitchPriority){
                                        // 调换两个词的权重值
                                        let tempPriority = group.dict[j].priority
                                        group.dict[j].priority = group.dict[j - 1].priority
                                        group.dict[j - 1].priority = tempPriority
                                    }
                                    return ''
                                } else {
                                    console.log('已到顶')
                                    return '已到顶'
                                }
                            } else if (direction === 'down'){
                                if (j+1 !== group.dict.length){
                                    group.dict[j] = group.dict[j + 1]
                                    group.dict[j + 1] = tempItem
                                    if (isSwitchPriority) {
                                        // 调换两个词的权重值
                                        let tempPriority = group.dict[j].priority
                                        group.dict[j].priority = group.dict[j + 1].priority
                                        group.dict[j + 1].priority = tempPriority
                                    }
                                    return ''
                                } else {
                                    console.log('已到底')
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
                                if (isSwitchPriority) {
                                    // 调换两个词的权重值
                                    let tempPriority = this.words[i].priority
                                    this.words[i].priority = this.words[i - 1].priority
                                    this.words[i - 1].priority = tempPriority
                                }
                                return ''
                            } else {
                                console.log('已到顶')
                                return '已到顶'
                            }
                        } else if (direction === 'down'){
                            if (i+1 !== this.words.length) {
                                this.dict.exchangePositionInOrigin(tempItem, this.words[i+1]) // 调换 wordsOrigin 中的词条位置
                                this.words[i] = this.words[i + 1]
                                this.words[i + 1] = tempItem
                                if (isSwitchPriority) {
                                    // 调换两个词的权重值
                                    let tempPriority = this.words[i].priority
                                    this.words[i].priority = this.words[i + 1].priority
                                    this.words[i + 1].priority = tempPriority
                                }
                                return ''
                            } else {
                                console.log('已到底')
                                return '已到底'
                            }
                        }
                    }
                }
            }
        },

        // 上移词条
        moveUp(id, isSwitchPriority){
            this.showTip(this.move(id, 'up', isSwitchPriority))
            let temp = this.words.pop()
            this.words.push(temp)
        },
        // 下移词条
        moveDown(id, isSwitchPriority){
            this.showTip(this.move(id, 'down', isSwitchPriority))
            let temp = this.words.pop()
            this.words.push(temp)
        },

        catalogMove(groupId, direction){
            console.log(groupId, direction)
            for (let i=0; i<this.dict.wordsOrigin.length; i++){
                if (groupId === this.dict.wordsOrigin[i].id){
                    let currentGroup = this.dict.wordsOrigin[i]
                    let tempGroup = {}
                    Object.assign(tempGroup, currentGroup)
                    switch (direction){
                        case 'up':
                            if (i === 0){
                                console.log('已到顶')
                            } else {
                                this.dict.wordsOrigin[i] = this.dict.wordsOrigin[i-1]
                                this.dict.wordsOrigin[i-1] = tempGroup
                                this.dict.wordsOrigin.push({})
                                this.dict.wordsOrigin.pop()
                            }
                            break;
                        case 'down':
                            if (i === this.dict.wordsOrigin.length - 1){
                                console.log('已到底')
                            } else {
                                this.dict.wordsOrigin[i] = this.dict.wordsOrigin[i+1]
                                this.dict.wordsOrigin[i+1] = tempGroup
                                this.dict.wordsOrigin.push({})
                                this.dict.wordsOrigin.pop()
                            }
                            break;
                    }
                    break
                }
            }
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
                // console.log(event)
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
        getSelectedWords(){
            let wordsSelected = []
            if (this.dict.isGroupMode){
                this.dict.wordsOrigin.forEach(group => {
                    wordsSelected = wordsSelected.concat(group.dict.filter(item => this.chosenWordIds.has(item.id)))
                })
            } else {
                wordsSelected = this.dict.wordsOrigin.filter(item => this.chosenWordIds.has(item.id))
            }
            return wordsSelected
        },
        beginPinyinAdd(phase, progressTip){
            this.isPinyinAddBusy = true
            this.pinyinAddPhase = phase
            this.setProgressTip(progressTip)
        },
        updatePinyinAddProgress(phase, progressTip){
            this.pinyinAddPhase = phase
            this.setProgressTip(progressTip)
        },
        finishPinyinAdd(){
            this.isPinyinAddBusy = false
            this.pinyinAddPhase = ''
            this.pendingAddToPinyin = false
            this.clearProgressTip()
        },
        addSelectionToPinyinDict(){
            if (this.isPinyinAddBusy) {
                return
            }
            if (!this.config.pinyinDictFileName) {
                this.showTip('请先在设置中指定拼音词库')
                return
            }
            if (this.dict.fileName === this.config.pinyinDictFileName) {
                this.showTip('拼音词库不能与当前码表相同')
                return
            }
            const wordsSelected = this.getSelectedWords()
            if (wordsSelected.length === 0) {
                return
            }
            if (this.pinyinDict && this.pinyinDict.fileName === this.config.pinyinDictFileName) {
                this.beginPinyinAdd('preparing', `正在转换拼音（0/${wordsSelected.length}）...`)
                this.applyAddToPinyinDict(wordsSelected)
                return
            }
            this.pendingAddToPinyin = true
            this.beginPinyinAdd('loading', '正在载入拼音词库...')
            ipcRenderer.send('MainWindow:LoadPinyinDict', this.config.pinyinDictFileName)
        },
        async applyAddToPinyinDict(wordsSelected){
            try {
                const { toAdd, skipped, failed } = await prepareWordsForPinyinDictAsync(
                    wordsSelected,
                    this.pinyinDict,
                    this.pinyinDict.lastIndex,
                    (current, total, message) => this.updatePinyinAddProgress('preparing', message)
                )
                if (toAdd.length === 0) {
                    this.finishPinyinAdd()
                    if (failed.length) {
                        this.showTip(`无法生成拼音：${failed.join('、')}`)
                    } else if (skipped.length) {
                        this.showTip(`词条已存在于拼音词库：${skipped.join('、')}`)
                    }
                    return
                }
                const groupIndex = this.pinyinDict.isGroupMode ? 0 : -1
                await addWordsToPinyinDictInOrderAsync(
                    this.pinyinDict,
                    toAdd,
                    groupIndex,
                    (current, total, message) => this.updatePinyinAddProgress('inserting', message)
                )
                this.updatePinyinAddProgress('saving', '正在保存拼音词库...')
                await this.saveToFile(this.pinyinDict, { updateSaveButton: false })
                this.finishPinyinAdd()
                let msg = `已添加 ${toAdd.length} 条到拼音词库`
                if (skipped.length) {
                    msg += `，跳过 ${skipped.length} 条已存在`
                }
                if (failed.length) {
                    msg += `，${failed.length} 条无法生成拼音`
                }
                this.showTip(msg)
            } catch (err) {
                console.error(err)
                this.finishPinyinAdd()
                this.showTip(`添加到拼音词库失败：${err.message}`)
            }
        },
        moveWordsToTargetDict(){
            let wordsTransferring = this.getSelectedWords()
            console.log('words transferring：', JSON.stringify(wordsTransferring))

            if (this.dict.fileName === this.targetDict.fileName){ // 如果是同词库移动
                // 同文件内移动时，必须直接操作当前 dict，避免 targetDict 与当前内存状态不一致导致“删不掉又新增”。
                this.dict.deleteWords(this.chosenWordIds, true) // 删除移动的词条
                this.dict.addWordsInOrder(wordsTransferring, this.dropdownActiveGroupIndex)
                console.log('after insert:( main:wordOrigin ):\n ', JSON.stringify(this.dict.wordsOrigin))
                this.saveToFile(this.dict)
                this.reloadCurrentDict()
            } else {
                this.targetDict.addWordsInOrder(wordsTransferring, this.dropdownActiveGroupIndex)
                this.words = [...this.dict.wordsOrigin]
                console.log('after insert:( main:wordOrigin ):\n ', JSON.stringify(this.targetDict.wordsOrigin))
                this.deleteWords() // 删除当前词库已移动的词条
                this.saveToFile(this.targetDict)
                this.saveToFile(this.dict)
            }
            this.showTip('移动成功')
            this.resetDropList()
        },
        // 复制 dropdown
        resetDropList(){
            this.isShowDropdown = false
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
            ipcRenderer.send('MainWindow:ExportSelectionToPlistFile', this.getSelectedWords())
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
                ipcRenderer.send(
                    'MainWindow:sync.get:INCREASE',
                    {
                        fileName: this.dict.fileName,
                        userInfo: this.config.userInfo
                    }
                )
                console.log('MainWindow:sync.get:INCREASE')
            } else {
                this.showTip('未登录，请先前往配置页面登录')
            }
        },

        // 上传当前词库内容
        syncUploadCurrentDict(){
            if (this.config.hasOwnProperty('userInfo')){
                this.sendDictYamlForSync()
                console.log('MainWindow:sync.save')
            } else {
                this.showTip('未登录，请先前往配置页面登录')
            }
        },

        // 下载当前词库名的内容，【 覆盖 】 本地词库
        syncDownloadCurrentDict(){
            if (this.config.hasOwnProperty('userInfo')){
                ipcRenderer.send(
                    'MainWindow:sync.get:OVERWRITE',
                    {
                        fileName: this.dict.fileName,
                        userInfo: this.config.userInfo
                    }
                )
                console.log('MainWindow:sync.get:OVERWRITE')
            } else {
                this.showTip('未登录，请先前往配置页面登录')
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
                            originWordMap.set(word.word + word.code, word) // 将 word+code 作为 map 的 key，不然会有遗漏的
                        })
                        // 3. 对比词条内容
                        syncWordGroup.dict.forEach(syncWord => {
                            if (originWordMap.has(syncWord.word + syncWord.code)){ // 存在词条相同
                                let wordOrigin = originWordMap.get(syncWord.word + syncWord.code)
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
                    originWordMap.set(word.word + word.code, word)
                })
                // 2. 对比词条内容
                this.dictSync.wordsOrigin.forEach(syncWord => {
                    if (originWordMap.has(syncWord.word + syncWord.code)) { // 存在词条相同
                        let wordOrigin = originWordMap.get(syncWord.word + syncWord.code)
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
            this.refreshShowingWords() // 刷新显示的词条
            let afterWordCount = this.dict.countDictOrigin
            console.log(`本地新增 ${afterWordCount - originWordCount} 条记录`)
            this.showTip(`本地新增 ${afterWordCount - originWordCount} 条记录`)
            this.sendDictYamlForSync()
            console.log('MainWindow:sync.save')
        }
    },
    watch: {
        code(newValue){
            this.code = newValue.replaceAll(/[^A-Za-z ]/g, '')
            if (this.codeDebounceTimer) {
                clearTimeout(this.codeDebounceTimer)
            }
            this.codeDebounceTimer = setTimeout(() => {
                this.updateWordsRedundancy(this.code)
            }, 250)
        },
        word(newValue, oldValue){
            if (/[a-z]/i.test(newValue)){
                // 当新词包含英文时， 删除 word 不改变 code
            } else {
                if (this.dictMap){
                    this.code = this.dictMap.decodeWord(newValue)
                }
            }
        },
        chosenWordIdArray(newValue){
            if (newValue.length === 0){
                this.isShowDropdown = false
            }
            console.log('已选词条id: ', JSON.stringify(newValue))
        },
        isShowDropdown(newValue){
            if (!newValue){ // 窗口关闭时，重置 index
                this.resetDropList()
            }
        },
        'config.pinyinDictFileName'(){
            this.pinyinDict = null
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
