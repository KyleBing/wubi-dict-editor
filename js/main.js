import Dict from "./Dict.js"
import {$} from "./Utility.js"

const Vue = require('vue')

const {ipcRenderer} = require('electron')




// Vue 3
const app = {
    data() {
        return {
            name: '名字嘛',
            dict: null
        }
    },
    mounted() {
        ipcRenderer.on('fileHasRead', (event, res) => {
            this.dict = new Dict(res)
        })
    }
}

Vue.createApp(app).mount('#app')
