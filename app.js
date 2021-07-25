const {app, BrowserWindow, Menu, ipcMain, ipcRenderer} = require('electron');
const fs = require('fs')

const url = require("url");
const path = require("path");


let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 600,
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



app.on('ready', ()=>{
    createWindow()
    setRimeFolderMenu()
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
function readFile(filePath){
    fs.readFile(filePath, {encoding: 'utf-8'}, (err, res) => {
        if(err){
            console.log(err)
        } else {
            mainWindow.webContents.send('showFileContent', res)
        }
    })
}

function setRimeFolderMenu(){
    let folderPath = '/Users/Kyle/Library/Rime'
    fs.readdir(folderPath,(err, filePaths) => {
        if (err) {
            console.log(err)
        } else {
            let filesMenu = []
            filePaths.forEach(item => {
                if (item.indexOf('.dict.yaml') > 0){
                    filesMenu.push({
                        label: item,
                        click() {
                            let filePath = path.join(folderPath, item)
                            readFile(filePath)
                        }
                    },)
                }
            })
            createMenu(filesMenu)
        }
    })
}

function createMenu(filesMenu) {
    let menuStructure = [
        {
            label: '文件',
            submenu: [
                {label: '最小化', role: 'minimize'},
                {label: '退出', role: 'quit'},
            ]
        },
        {
            label: '文件',
            submenu: filesMenu
        }
    ]
    let menu = Menu.buildFromTemplate(menuStructure)
    Menu.setApplicationMenu(menu)
}