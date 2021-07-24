import Dict from "./Dict.js"
import Table from "./Table.js"
import {$} from "./Utility.js"

const Vue = require('vue')

const {ipcRenderer} = require('electron')

ipcRenderer.on('fileHasRead', (event, res) => {
    let dictUser = new Dict(res)
    let table = new Table(dictUser, $('.display'))
    table.showDictGroup()
})


// Vue 3
const app = {
    data() {
        return {
            name: '名字嘛'
        }
    }
}

Vue.createApp(app).mount('#app')
