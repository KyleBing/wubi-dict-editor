import Dict from "./Dict.js"
import {$} from "./Utility.js"

const Vue = require('vue')

const {ipcRenderer} = require('electron')




// Vue 3
const app = {
    data() {
        return {
            name: '名字嘛',
            dict: null,
            keyword: '',
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
        }
    },
}

Vue.createApp(app).mount('#app')
