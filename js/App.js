import Dict from "./Dict.js"
import {shakeDomFocus} from "./Utility.js"
import Word from "./Word.js";

const Vue = require('vue')
const {ipcRenderer} = require('electron')

const VirtualScroller = require('vue-virtual-scroller')

// Vue 3
const app = {
    components: {RecycleScroller: VirtualScroller.RecycleScroller},
    data() {
        return {
            dict: {}, // 当前词库对象 Dict
            keyword: '', // 搜索关键字
            code: '',
            word: '',
            activeGroupId: '', // 组 index
            keywordUnwatch: null, // keyword watch 方法的撤消方法
            selectedWordIds: [], // 已选择的词条
            labelOfSaveBtn: '保存', // 保存按钮的文本
            heightContent: 0, // content 高度
        }
    },
    mounted() {
        this.heightContent = innerHeight - 47
        ipcRenderer.on('showFileContent', (event, filePath, res) => {
            this.dict = new Dict(res, filePath)
            // document.title = filePath // 窗口 title
            this.clearInputs()
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
            this.dict.search(this.code, this.word)
            console.log(this.dict.length)
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
            ipcRenderer.send('saveFile', this.dict.filePath, this.dict.toYamlString())
        },
        // 清除内容
        clearInputs(){
            this.code = ''
            this.word = ''
            this.selectedWordIds = []
            this.search()
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
                            if (!this.dict.isLastItem(id)){
                                this.dict.move(id, 'down')
                            }
                        }
                        event.preventDefault()
                        break
                    case 'ArrowUp':
                        if(this.selectedWordIds.length === 1) { // 只有一个元素时，键盘才起作用
                            let id = this.selectedWordIds[0]
                            if (!this.dict.isFirstItem(id)) {
                                this.dict.move(id, 'up')
                            }
                        }
                        event.preventDefault()
                        break
                }
            })
        },
        openCurrentYaml(){
            ipcRenderer.send('openFileOutside', this.dict.filePath)
        },
    },
    watch: {
        code(newValue){
            this.code = newValue.replaceAll(/[^A-Za-z]/g, '') // 只允许输入字母
        },
        selectedWordIds(newValue){
            console.log('已选词条id: ', JSON.stringify(newValue))
        }
    }
}

Vue.createApp(app).mount('#app')
