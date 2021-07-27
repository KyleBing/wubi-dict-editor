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
        width: 1400, height: 600,
        // width: 600, height: 600,
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

    mainWindow.webContents.openDevTools() // 打开调试窗口

    // 保存词库到文件
    ipcMain.on('saveFile', (event, filePath, yamlString) => {
        fs.writeFile(filePath, yamlString, {encoding: "utf8"}, err => {
            if (!err){
                console.log('saveFileSuccess')
                mainWindow.webContents.send('saveFileSuccess')
            }
        })
    })
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
                        label: getLabelNameFromFileName(item),
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

// 匹配文件名，返回对应文件的名字
function getLabelNameFromFileName(fileName){
    const map = [
        {name: '拼音词库', path: 'pinyin_simp.dict.yaml'},
        {name: '测试词库', path: 'test.dict.yaml'},
        {name: '五笔极点 - 主词库 ⭐', path: 'wubi86_jidian.dict.yaml'},
        {name: '五笔极点 - 分词库', path: 'wubi86_jidian_addition.dict.yaml'},
        {name: '五笔极点 - 附加词库', path: 'wubi86_jidian_extra.dict.yaml'},
        {name: '五笔极点 - 用户词库', path: 'wubi86_jidian_user.dict.yaml'},
    ]
    let matchedPath = map.filter(item => item.path === fileName)
    // 返回匹配的名字，或者返回原文件名
    return matchedPath.length > 0 ? matchedPath[0].name: fileName
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
            label: '词库列表',
            submenu: filesMenu
        },
        {
            label: '关于',
            submenu: [
                {label: '最小化', role: 'minimize'},
                {label: '关于', role: 'about'},
                {label: '退出', role: 'quit'},
            ]
        },
    ]
    let menu = Menu.buildFromTemplate(menuStructure)
    Menu.setApplicationMenu(menu)
}

