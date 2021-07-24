import Dict from "./Dict.js"
import Table from "./Table.js"
import { $ } from "./Utility.js"

const {ipcRenderer} = require('electron')

ipcRenderer.on('fileHasRead', (event, res) => {
    let dictUser = new Dict(res)
    let table = new Table(dictUser.getDictWords(), $('tbody'))
    table.showDict()
})
