import Dict from "./Dict.js"
import {shakeDomFocus, IPC_TYPES} from "./Utility.js"
import Word from "./Word.js";

const Vue = require('vue')
const {ipcRenderer} = require('electron')


// Vue 3
const app = {
    data() {
        return {
            dict: null, // 当前词库对象 Dict
            keyword: '', // 搜索关键字
            code: '',
            word: '',
            activeGroupId: '', // 组 index
            keywordUnwatch: null, // keyword watch 方法的撤消方法
            currentFilePath: '', // 当前打开的文件路径
            selectedWordIds: [], // 已选择的词条

            labelOfSaveBtn: '保存', // 保存按钮的文本
        }
    },
    mounted() {
        ipcRenderer.on('showFileContent', (event, filePath, res) => {
            this.currentFilePath = filePath
            this.clearInputs()
            this.dict = new Dict(res)
            if (this.dict.dict.length > 1000){ // 如果词条数量大于 1000 条，不进行实时筛选
                if (this.keywordUnwatch){
                    this.keywordUnwatch()
                }
            } else {
                this.keywordUnwatch = this.$watch('keyword', newValue => {
                    this.dict.setKeyword(newValue)
                })
            }
        })
        ipcRenderer.on('saveFileSuccess', () => {
            this.labelOfSaveBtn = '保存成功'
            this.$refs.domBtnSave.classList.add('btn-green')
            setTimeout(()=>{
                this.$refs.domBtnSave.classList.remove('btn-green')
                this.labelOfSaveBtn = '保存'
            }, 2000)
        })

        ipcRenderer.send('loadTestFile')

        this.addKeyboardListener()
    },
    methods: {
        search(){
            this.dict.setKeyword(this.keyword)
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
        saveDictToFile(){
            ipcRenderer.send('saveFile', this.currentFilePath, this.dict.toYamlString())
        },
        // 清除内容
        clearInputs(){
            this.code = ''
            this.word = ''
            this.selectedWordIds = []
        },
        // 删除词条
        deleteWords(){
            this.dict.deleteWords(this.selectedWordIds)
            this.selectedWordIds = [] // 清空选中 wordID
        },
        moveUp(id){
            this.dict.move(id, 'up')
        },
        moveDown(id){
            this.dict.move(id, 'down')
        },
        // 绑定键盘事件： 键盘上下控制词条上下移动
        addKeyboardListener(){
            window.addEventListener('keydown', event => {
                // console.log(event)
                switch( event.key) {
                    case 's':
                        if (event.ctrlKey || event.metaKey){ // metaKey 是 macOS 的 Ctrl
                            this.saveDictToFile()
                        }
                        event.preventDefault()
                        break
                    case 'ArrowDown':
                        if(this.selectedWordIds.length === 1) { // 只有一个元素时，键盘才起作用
                            let id = this.selectedWordIds[0]
                            if (!this.dict.isLastItemInGroup(id)){
                                this.dict.move(id, 'down')
                            }
                        }
                        event.preventDefault()
                        break
                    case 'ArrowUp':
                        if(this.selectedWordIds.length === 1) { // 只有一个元素时，键盘才起作用
                            let id = this.selectedWordIds[0]
                            if (!this.dict.isFirstItemInGroup(id)) {
                                this.dict.move(id, 'up')
                            }
                        }
                        event.preventDefault()
                        break
                }
            })
        },
        openCurrentYaml(){
            ipcRenderer.send('openFileOutside', this.currentFilePath)
        },
    },
    watch: {
        code(newValue){
            this.code = newValue.replaceAll(/[^A-Za-z]/g, '') // 只允许输入字母
        },
        selectedWordIds(newValue){
            console.log(newValue.toString())
        }
    }
}

Vue.createApp(app).mount('#app')
