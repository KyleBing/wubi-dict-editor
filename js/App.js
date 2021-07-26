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
            keyword: ''
        }
    },
    mounted() {
        ipcRenderer.on('showFileContent', (event, res) => {
            this.dict = new Dict(res)
        })
    },
    methods: {
        search(){
            this.dict.setKeyword(this.keyword)
        }
    },
    watch: {
        keyword(newValue, oldValue){
            this.dict.setKeyword(newValue)
        }
    }
}

Vue.createApp(app).mount('#app')
