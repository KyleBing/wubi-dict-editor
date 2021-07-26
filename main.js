const IPC_TYPES = {
    saveFile: 'saveFile',
    readFile: 'readFile',
    showFileContent: 'showFileContent'
}
const {app, BrowserWindow, Menu, ipcMain, ipcRenderer} = require('electron');
const fs = require('fs')
const os = require('os')
const url = require("url");
const path = require("path");


let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
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
            mainWindow.webContents.send(IPC_TYPES.showFileContent, filePath ,res)
        }
    })
}


// 设置菜单 - Rime 所有文件
function setRimeFolderMenu(){
    let homeDir = os.homedir()
    let rimeFolderPath = getRimeDirectoryPath(homeDir)
    fs.readdir(rimeFolderPath,(err, filePaths) => {
        if (err) {
            console.log(err)
        } else {
            let filesMenu = []
            filePaths.forEach(item => {
                if (item.indexOf('.dict.yaml') > 0){
                    filesMenu.push({
                        label: item,
                        click() {
                            let filePath = path.join(rimeFolderPath, item)
                            readFile(filePath)
                        }
                    },)
                }
            })
            createMenu(filesMenu)
        }
    })
}

// 根据系统返回 rime 路径
function getRimeDirectoryPath(userHome){
    switch (os.platform()){
        case 'aix': break
        case 'darwin': return path.join(userHome + '/Library/Rime') // macOS
        case 'freebsd': break
        case 'linux': break
        case 'openbsd': break
        case 'sunos': break
        case 'win32': return path.join(userHome + '/AppData/Roaming/Rime') // windows
    }
}

// 创建 menu
function createMenu(filesMenu) {
    let menuStructure = [
        {
            label: 'About',
            submenu: [
                {label: '最小化', role: 'minimize'},
                {label: '退出', role: 'quit'},
            ]
        },
        {
            label: 'Files',
            submenu: filesMenu
        }
    ]
    let menu = Menu.buildFromTemplate(menuStructure)
    Menu.setApplicationMenu(menu)
}

ipcMain.on('saveFile', (event, filePath, yamlString) => {
    fs.writeFileSync(filePath, yamlString)
})