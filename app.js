const {app, BrowserWindow, Menu, ipcMain, ipcRenderer} = require('electron');

const url = require("url");
const path = require("path");


let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'index.html'),
            protocol: "file:",
            slashes: true
        })
    )
    mainWindow.on('closed', function () {
        mainWindow = null
    })

    mainWindow.webContents.openDevTools()
}

function createMenu() {
    let menu = Menu.buildFromTemplate([
        {
            label: '文件',
            submenu: [
                {
                    label: '主文件',
                    click() {
                    }
                },
                {
                    label: '用户词库',
                    click() {
                        readFile()
                    }
                },
            ]
        }
    ])
    Menu.setApplicationMenu(menu)
}

app.on('ready', ()=>{
    createWindow()
    createMenu()
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow()
    }
})

// 读取文件
const fs = require('fs')
function readFile(){
    let file = 'source_file/wubi86_jidian_extra.dict.yaml'
    let fileFolder = path.join(__dirname, file)
    fs.readFile(fileFolder, {encoding: 'utf-8'}, (err, res) => {
        if(err){
            console.log(err)
        } else {
            mainWindow.webContents.send('fileHasRead', res)
        }
    })
}
