import Dict from "./Dict.js"
import {$, shakeDomFocus} from "./Utility.js"
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
            groupId: '', // 组 index
            keywordUnwatch: null // keyword watch 方法的撤消方法
        }
    },
    mounted() {
        ipcRenderer.on('showFileContent', (event, res) => {
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
    },
    methods: {
        search(){
            this.dict.setKeyword(this.keyword)
        },
        addNewPhrase(){
            if (!this.word){
                console.log('addNewPhrase: no-word')
                shakeDomFocus(this.$refs.domInputWord)
            } else if (!this.code){
                console.log('addNewPhrase: no-code')
                shakeDomFocus(this.$refs.domInputCode)
            } else {
                this.dict.addNewWord(new Word(this.code, this.word) ,this.groupId)
                console.log(this.code, this.word, this.groupId)
            }
        }
    },
    watch: {
        code(newValue){
            this.code = newValue.replaceAll(/[^A-Za-z]/g, '') // 只允许输入字母
        }
    }
}

Vue.createApp(app).mount('#app')
