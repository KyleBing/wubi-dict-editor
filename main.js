const {app, BrowserWindow, Menu, ipcMain, nativeTheme, ipcRenderer, shell} = require('electron')
const { exec } = require('child_process')
const fs = require('fs')
const os = require('os')
const url = require("url")
const path = require("path")

let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400, height: 600,
        // width: 600, height: 600,
        icon: __dirname + '/assets/appIcon/appicon.ico',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    mainWindow.webContents.openDevTools() // 打开调试窗口


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


    // 保存词库到文件
    ipcMain.on('saveFile', (event, filePath, yamlString) => {
        fs.writeFile(filePath, yamlString, {encoding: "utf8"}, err => {
            if (!err){
                console.log('saveFileSuccess')
                applyRime() // 布署
                mainWindow.webContents.send('saveFileSuccess')
            }
        })
    })

    // 监听 window 的文件载入请求
    ipcMain.on('loadTestFile', event => {
        readFile(path.join(getRimeConfigDir(), 'test.dict.yaml'))
    })

    // 监听载入主文件内容的请求
    ipcMain.on('loadMainDict', event => {
        fs.readFile(path.join(getRimeConfigDir(), 'main.dict.yaml'), {encoding: 'utf-8'}, (err, res) => {
            if(err){
                console.log(err)
            } else {
                mainWindow.webContents.send('setMainDict', path.join(getRimeConfigDir(), 'main.dict.yaml') ,res)
            }
        })
    })

    // 外部打开当前码表文件
    ipcMain.on('openFileOutside', (event, filePath) => {
        console.log(filePath)
        shell.openPath(filePath)
    })

    ipcMain.handle('dark-mode:system', () => {
        nativeTheme.themeSource = 'system'
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
            mainWindow.webContents.send('showFileContent', filePath ,res)
        }
    })
}


// 匹配文件名，返回对应文件的名字
function getLabelNameFromFileName(fileName){
    const map = [
        {name: '拼音词库', path: 'pinyin_simp.dict.yaml'},
        {name: '测试词库 ⛳', path: 'test.dict.yaml'},
        {name: '测试词库 - 分组️ ⛳️', path: 'test_group.dict.yaml'},
        {name: '五笔极点 - 主词库', path: 'wubi86_jidian.dict.yaml'},
        {name: '五笔极点 - 分词库', path: 'wubi86_jidian_addition.dict.yaml'},
        {name: '五笔极点 - 附加词库', path: 'wubi86_jidian_extra.dict.yaml'},
        {name: '五笔极点 - 用户词库', path: 'wubi86_jidian_user.dict.yaml'},
    ]
    let matchedPath = map.filter(item => item.path === fileName)
    // 返回匹配的名字，或者返回原文件名
    return matchedPath.length > 0 ? matchedPath[0].name: fileName
}



// 创建 menu
function createMenu(filesMenu) {
    let menuStructure = [
        {
            label: '词库工具',
        },
        {
            label: '编辑',
            role: 'editMenu'
        },
        {
            label: '词库列表',
            submenu: filesMenu
        },
        {
            label: '其它操作',
            submenu: [
                {
                    label: '打开配置文件夹',
                    click() {
                        shell.openPath(getRimeConfigDir())
                    }
                },
                {
                    label: '打开程序文件夹',
                    click() {
                        shell.openPath(getRimeExecDir())
                    }
                },
                {
                    label: '重新布署',
                    click() {
                        applyRime()
                    }
                },
            ]
        },
        {
            label: '关于',
            submenu: [
                {label: '最小化', role: 'minimize'},
                {label: '关于', role: 'about'},
                {type: 'separator'},
                {label: '退出', role: 'quit'},
            ]
        },
    ]
    let menu = Menu.buildFromTemplate(menuStructure)
    Menu.setApplicationMenu(menu)
}

// 设置菜单 - Rime 所有文件
function setRimeFolderMenu(){
    let rimeFolderPath = getRimeConfigDir()
    fs.readdir(rimeFolderPath,(err, filePaths) => {
        if (err) {
            console.log(err)
        } else {
            let filesMenu = []
            filePaths.forEach(item => {
                if (item.indexOf('.dict.yaml') > 0){
                    filesMenu.push({
                        label: getLabelNameFromFileName(item),
                        click(sender, window, content) {
                            window.title = sender.label // 点击对应菜单时，显示当前编辑词库的名字
                            currentFilePath = item
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

// 布署 Rime
function applyRime(){
    let rimeBinDir = getRimeExecDir()
    console.log(path.join(rimeBinDir,'WeaselDeployer.exe'))
    switch (os.platform()){
        case 'darwin':
            // macOS
            exec(`"${rimeBinDir}/Squirrel" --reload`, error => {
                console.log(error)
            })
            break
        case 'win32':
            // windows
            let execFilePath = path.join(rimeBinDir,'WeaselDeployer.exe')
            exec(`"${execFilePath}" /deploy`, err => {
                if (err){
                    console.log(err)
                }
            })
    }
}

// 根据系统返回 rime 配置路径
function getRimeConfigDir(){
    let userHome = os.homedir()
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

// 返回  Rime 可执行文件夹
function getRimeExecDir(){
    switch (os.platform()){
        case 'aix': break
        case 'darwin':  // macOS
            return path.join('/Library/Input Methods/Squirrel.app', 'Contents/MacOS')
        case 'freebsd': break
        case 'linux': break
        case 'openbsd': break
        case 'sunos': break
        case 'win32': // windows
            const PATH_RIME_BIN_WIN = 'C:/Program Files (x86)/Rime'
            let execDirEntes = fs.readdirSync(PATH_RIME_BIN_WIN, {withFileTypes: true})
            // 获取路径中 weasel 版本文件夹
            // TODO：后续可能需要处理多版本的时候获取最新版本
            let rimeDirEntes = execDirEntes.filter(item => item.name.includes('weasel'))
            return path.join(PATH_RIME_BIN_WIN, rimeDirEntes[0].name)
    }

}
