import Dict from "./Dict.mjs"
import {shakeDom, shakeDomFocus} from "./Utility.mjs"
import Word from "./Word.mjs";
import Vue from '../node_modules/vue/dist/vue.esm.browser.min.js'

const {ipcRenderer} = require('electron')
const {IS_IN_DEVELOP} =  require('./js/Global')
const VirtualScroller = require('vue-virtual-scroller')


// Vue 2
const app = {
    el: '#app',
    components: {RecycleScroller: VirtualScroller.RecycleScroller},
    data() {
        return {
            IS_IN_DEVELOP: IS_IN_DEVELOP, // 是否为开发模式
            display: '', // 提示信息
            dict: {
                deep: true
            }, // 当前词库对象 Dict
            dictMain: {}, // 主码表 Dict
            keyword: '', // 搜索关键字
            code: '',
            word: '',
            activeGroupId: '', // 组 index
            keywordUnwatch: null, // keyword watch 方法的撤消方法
            selectedWordIds: [], // 已选择的词条
            labelOfSaveBtn: '保存', // 保存按钮的文本
            heightContent: 0, // content 高度
            currentGroupId: 0, // 当前显示的分组 ID
        }
    },
    mounted() {
        this.heightContent = innerHeight - 47 - 20 - 10
        ipcRenderer.on('showFileContent', (event, filePath, res) => {
            this.dict = new Dict(res, filePath)
            // document.title = filePath // 窗口 title
            this.resetInputs()
        })
        ipcRenderer.on('saveFileSuccess', () => {
            this.labelOfSaveBtn = '保存成功'
            this.$refs.domBtnSave.classList.add('btn-green')
            setTimeout(()=>{
                this.$refs.domBtnSave.classList.remove('btn-green')
                this.labelOfSaveBtn = '保存'
            }, 2000)
        })

        if (IS_IN_DEVELOP){
            ipcRenderer.send('loadTestFile')
        } else {
            ipcRenderer.send('loadUserDictFile')
        }
        ipcRenderer.send('loadMainDict')
        ipcRenderer.on('setMainDict', (event, filePath, res) => {
            this.dictMain = new Dict(res, filePath)
        })

        this.addKeyboardListener()

        onresize = ()=>{
            this.heightContent = innerHeight - 47 - 20 - 10
        }
    },
    methods: {
        setGroupId(groupId){ // groupId 是在原 index 基础上 +1 的值，使用需要 —1
            this.currentGroupId = groupId
            if (groupId === 0){
                this.dict.words = [...this.dict.wordsOrigin]
            } else {
                this.dict.words = [...[this.dict.wordsOrigin[groupId - 1]]]
            }
        },
        search(){
            this.selectedWordIds = []
            this.dict.search(this.code, this.word)
        },
        addNewPhrase(){
            if (!this.word){
                shakeDomFocus(this.$refs.domInputWord)
            } else if (!this.code){
                shakeDomFocus(this.$refs.domInputCode)
            } else {
                this.dict.addNewWord(new Word(this.dict.lastIndex, this.code, this.word) ,this.activeGroupId)
                console.log(this.code, this.word, this.activeGroupId)
            }
        },
        // 保存内容到文件
        saveToFile(dict){
            ipcRenderer.send('saveFile', dict.filePath, dict.toYamlString())
        },
        // 选中全部展示的词条
        selectAll(){
            if(this.dict.countDict < 1000){
                if (this.dict.isGroupMode){
                    this.selectedWordIds = []
                    this.dict.words.forEach(group => {
                        this.selectedWordIds = this.selectedWordIds.concat(group.dict.map(item => item.id))
                    })
                } else {
                    this.selectedWordIds = this.dict.words.map(item => item.id)
                }
            } else {
                // 提示不能同时选择太多内容
                this.display = '不能同时选择大于 1000条 的词条内容'
                shakeDom(this.$refs.domBtnSelectAll)
            }
        },
        // 清除内容
        resetInputs(){
            this.code = ''
            this.word = ''
            this.selectedWordIds = []
            this.search()
            this.display = ''
        },
        // 删除词条：单
        deleteWord(wordId){
            this.selectedWordIds = this.selectedWordIds.filter(item => item !== wordId)
            this.dict.deleteWords([wordId])
        },
        // 删除词条：多
        deleteWords(){
            this.dict.deleteWords(this.selectedWordIds)
            this.selectedWordIds = [] // 清空选中 wordID
        },
        // 上移词条
        moveUp(id){
            this.display = this.dict.move(id, 'up')
            let temp = this.dict.words.pop()
            this.dict.words.push(temp)
        },
        // 下移词条
        moveDown(id){
            this.display = this.dict.move(id, 'down')
            let temp = this.dict.words.pop()
            this.dict.words.push(temp)
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
                        if(this.selectedWordIds.length === 1) { // 只有一个元素时，键盘才起作用
                            let id = this.selectedWordIds[0]
                            this.moveDown(id)
                        }
                        event.preventDefault()
                        break
                    case 'ArrowUp':
                        if(this.selectedWordIds.length === 1) { // 只有一个元素时，键盘才起作用
                            let id = this.selectedWordIds[0]
                            this.moveUp(id)
                        }
                        event.preventDefault()
                        break
                }
            })
        },
        // 将选中的词条添加到主码表
        addToMain(){
            // get words
            let wordsTransferring = [] // 被转移的 [Word]
            if (this.dict.isGroupMode){
                this.dict.wordsOrigin.forEach((group, index) => {
                    let matchedWords = group.dict.filter(item => this.selectedWordIds.includes(item.id))
                    wordsTransferring = wordsTransferring.concat(matchedWords)
                })
            } else {
                wordsTransferring = this.dict.wordsOrigin.filter(item => this.selectedWordIds.includes(item.id))
            }
            console.log('words transferring：', JSON.stringify(wordsTransferring))
            this.dictMain.addWordsInOrder(wordsTransferring)
            console.log('after insert:( main:wordOrigin ):\n ', JSON.stringify(this.dictMain.wordsOrigin))
            this.deleteWords()
            this.saveToFile(this.dictMain)
            this.saveToFile(this.dict)
        },
        // 打开当前码表源文件
        openCurrentYaml(){
            ipcRenderer.send('openFileOutside', this.dict.filePath)
        },

    },
    watch: {
        code(newValue){
            this.code = newValue.replaceAll(/[^A-Za-z ]/g, '') // 只允许输入字母
        },
        selectedWordIds(newValue){
            console.log('已选词条id: ', JSON.stringify(newValue))
        },
    }
}

new Vue(app)
