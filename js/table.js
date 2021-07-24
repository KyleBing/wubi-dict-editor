let tbody = $('.table tbody')

let tr = tbody.querySelector('tr').cloneNode(true)
tr.querySelector('td.id').innerText = '1'
tr.querySelector('td.code').innerText = '2'
tr.querySelector('td.word').innerText = '3'
tbody.appendChild(tr)

function $(selecter){
    return document.querySelector(selecter)
}

const {ipcRenderer} = require('electron')

ipcRenderer.on('fileHasRead', (event, res) => {
    $('.display').innerText = res
})

ipcRenderer.send('setNewData', data)