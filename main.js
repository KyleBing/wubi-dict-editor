const {app, BrowserWindow, Menu, ipcMain, shell, dialog} = require('electron')
const { exec } = require('child_process')
const fs = require('fs')
const os = require('os')
const url = require("url")
const path = require("path")
const { IS_IN_DEVELOP, CONFIG_FILE_PATH, CONFIG_FILE_NAME, DEFAULT_CONFIG } =  require('./js/Global.js')
let mainWindow // 主窗口
let fileList = [] // 文件目录列表，用于移动词条

function createWindow() {
    let width = IS_IN_DEVELOP ? 1400: 800
    let height = IS_IN_DEVELOP ? 600: 600
    mainWindow = new BrowserWindow({
        width,
        height,
        icon: __dirname + '/assets/appIcon/appicon.ico', // windows icon
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    if (IS_IN_DEVELOP){
        mainWindow.webContents.openDevTools() // 打开调试窗口
    }


    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'index.html'),
            protocol: "file:",
            slashes: true
        })
    )
    mainWindow.on('closed', function () {
        mainWindow = null
        if (configWindow) configWindow.close()
    })


    // 保存词库到文件
    ipcMain.on('saveFile', (event, filename, yamlString) => {
        fs.writeFile(path.join(getRimeConfigDir(), filename), yamlString, {encoding: "utf8"}, err => {
            if (!err){
                console.log('saveFileSuccess')
                applyRime() // 布署
                mainWindow.webContents.send('saveFileSuccess')
            }
        })
    })

    // 监听 window 的文件载入请求
    ipcMain.on('loadInitDictFile', event => {
        let config = readConfigFile()
        readFile(config.initFileName)
    })

    // 监听载入主文件内容的请求
    ipcMain.on('loadDictFile', (event,filename) => {
        readFile(filename)
    })

    // 监听载入次文件内容的请求
    ipcMain.on('loadSecondDict', (event, filename) => {
        fs.readFile(path.join(getRimeConfigDir(), filename), {encoding: 'utf-8'}, (err, res) => {
            if(err){
                console.log(err)
            } else {
                mainWindow.webContents.send('setSecondDict',filename ,res)
            }
        })
    })

    // 监听载入主文件内容的请求
    ipcMain.on('loadMainDict', event => {
        let mainDictFileName = 'wubi86_jidian.dict.yaml'
        fs.readFile(path.join(getRimeConfigDir(), mainDictFileName), {encoding: 'utf-8'}, (err, res) => {
            if(err){
                console.log(err)
            } else {
                mainWindow.webContents.send('setMainDict', path.join(getRimeConfigDir(), mainDictFileName) ,res)
            }
        })
    })

    // 外部打开当前码表文件
    ipcMain.on('openFileOutside', (event, filename) => {
        shell.openPath(path.join(getRimeConfigDir(), filename)).then(res => {
            console.log(res)
        }).catch(err => {
            console.log(err)
        })
    })
    ipcMain.on('GetFileList', event => {
        mainWindow.send('FileList', fileList)
    })

    // config 相关
    // 载入配置文件内容
    ipcMain.on('requestConfigFile', event => {
        let config = readConfigFile() // 没有配置文件时，返回 false
        if (config){ // 如果有配置文件
            mainWindow.send('responseConfigFile', config) // 向窗口发送 config 内容
        }
    })
    // 保存配置文件内容
    ipcMain.on('saveConfigFileFromMainWindow', (event, configString) => {
        writeConfigFile(configString, mainWindow)
    })
}

let toolWindow
function showToolWindow (){
    let width = IS_IN_DEVELOP ? 1400: 800
    let height = IS_IN_DEVELOP ? 600: 600
    toolWindow = new BrowserWindow({
        width,
        height,
        icon: __dirname + '/assets/appIcon/appicon.ico', // windows icon
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    if (IS_IN_DEVELOP){
        toolWindow.webContents.openDevTools() // 打开调试窗口
    }


    toolWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'tool/tool.html'),
            protocol: "file:",
            slashes: true
        })
    )
    toolWindow.on('closed', function () {
        toolWindow = null
    })


    // 保存词库到文件
    ipcMain.on('ToolWindow:saveFile', (event, filename, yamlString) => {
        fs.writeFile(path.join(getRimeConfigDir(), filename), yamlString, {encoding: "utf8"}, err => {
            if (!err){
                console.log('saveFileSuccess')
                applyRime() // 布署
                toolWindow.webContents.send('saveFileSuccess')
            }
        })
    })

    // 监听 window 的文件载入请求
    ipcMain.on('ToolWindow:loadOriginFile', event => {
        readFile('origin.txt', toolWindow)
    })

    // 外部打开当前码表文件
    ipcMain.on('ToolWindow:openFileOutside', (event, filename) => {
        shell.openPath(path.join(getRimeConfigDir(), filename)).then(res => {
            console.log(res)
        }).catch(err => {
            console.log(err)
        })
    })
}


let configWindow
function createConfigWindow() {
    let width = IS_IN_DEVELOP ? 1400 : 600
    let height = IS_IN_DEVELOP ? 600 : 600
    configWindow = new BrowserWindow({
        width,
        height,
        icon: __dirname + '/assets/appIcon/appicon.ico', // windows icon
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    if (IS_IN_DEVELOP) {
        configWindow.webContents.openDevTools() // 打开调试窗口
    }


    configWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'config.html'),
            protocol: "file:",
            slashes: true
        })
    )
    configWindow.on('closed', function () {
        configWindow = null
    })

    // 载入文件列表
    ipcMain.on('requestFileList', event => {
        configWindow.send('responseFileList', fileList)
    })

    // config 相关
    // 载入配置文件内容
    ipcMain.on('requestConfigFile', event => {
        let config = readConfigFile() // 没有配置文件时，返回 false
        if (config){ // 如果有配置文件
            configWindow.send('responseConfigFile', config) // 向窗口发送 config 内容
        }
    })

    // 保存配置文件内容
    ipcMain.on('requestSaveConfig', (event, config) => {
        writeConfigFile(config, configWindow)
    })

    // 选取配置文件目录
    ipcMain.on('chooseRimeHomeDir', event => {
        let rimeHomeDir = dialog.showOpenDialogSync(configWindow,{
            properties: ['openDirectory'] // 选择文件夹
        })
        if (rimeHomeDir){
            configWindow.send('choosenRimeHomeDir', rimeHomeDir)
        }
    })
}


// config 文件保存在 用户文件夹下 / CONFIG_FILE_PATH/CONFIG_FILE_NAME 文件中
function writeConfigFile(contentString, responseWindow){
    let configPath = path.join(os.homedir(), CONFIG_FILE_PATH)
    fs.writeFile(path.join(configPath, CONFIG_FILE_NAME), contentString, {encoding: 'utf-8'}, err => {
        if(err){
            console.log('writeFileError: ',err)
            console.log(configPath)
            if (err.errno === -4058 || err.errno === -2){
                console.log('config dir does not exist')
                // 新建目录
                fs.mkdir(configPath, err => { // 先建立文件夹
                    if (err) {
                        console.log(err)
                    } else {
                        fs.writeFile(
                            path.join(configPath, CONFIG_FILE_NAME),
                            contentString, {encoding: 'utf-8'},
                            err => {
                                if (err){
                                    console.log(err)
                                } else {
                                    // 配置保存成功后，向主窗口发送配置文件内容
                                    mainWindow.send('updateConfigFile', JSON.parse(contentString))
                                }
                            })
                    }
                })
            }
        } else {
            responseWindow.send('saveConfigFileSuccess')
            // 配置保存成功后，向主窗口发送配置文件内容
            mainWindow.send('updateConfigFile', JSON.parse(contentString))
        }
    })

}

function readConfigFile(){
    let configPath = path.join(os.homedir(), CONFIG_FILE_PATH)
    try{ // 捕获读取文件时的错误，如果有配置文件 返回其内容，如果没有，返回  false
        let result = fs.readFileSync(path.join(configPath, CONFIG_FILE_NAME), {encoding: 'utf-8'})
        return JSON.parse(result)
    } catch (err){
        return DEFAULT_CONFIG
    }
}

app.on('ready', ()=>{
    createWindow()
    setRimeFolderMenu()
})

app.on('window-all-closed', function () {
    // if (process.platform !== 'darwin') app.quit()
    app.quit()
})

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow()
    }
})

// 读取文件
function readFile(fileName, responseWindow){
    let rimeHomeDir = getRimeConfigDir()
    fs.readFile(path.join(rimeHomeDir, fileName), {encoding: 'utf-8'}, (err, res) => {
        if(err){
            console.log(err)
        } else {
            if(responseWindow){
                responseWindow.send('showFileContent', fileName ,res)
            } else {
                mainWindow.webContents.send('showFileContent', fileName ,res)
            }
        }
    })
}

// 匹配文件名，返回对应文件的名字
function getLabelNameFromFileName(fileName){
    let map = [
        {name: '拼音词库', path: 'pinyin_simp.dict.yaml'},
        {name: '五笔极点 - 主', path: 'wubi86_jidian.dict.yaml'},
        {name: '五笔极点 - 临时', path: 'wubi86_jidian_addition.dict.yaml'},
        {name: '五笔极点 - 附加', path: 'wubi86_jidian_extra.dict.yaml'},
        {name: '五笔极点 - 用户', path: 'wubi86_jidian_user.dict.yaml'},

        // 测试词库
        {name: '测试- 普通 ⛳', path: 'test.dict.yaml'},
        {name: '测试- 分组 ⛳', path: 'test_group.dict.yaml'},
        {name: '测试- 主 ⛳', path: 'main.dict.yaml'},
    ]
    let matchedPath = map.filter(item => item.path === fileName)
    // 返回匹配的名字，或者返回原文件名
    return matchedPath.length > 0 ? matchedPath[0].name: fileName.substring(0, fileName.indexOf('.dict.yaml'))
}



// 创建 menu
function createMenu(filesMenu) {
    let menuStructure = [
        {
            label: '词库工具',
            submenu: [
                {
                    label: '配置',
                    click() {
                        createConfigWindow()
                    }
                },
            ]
        },
        {
            label: '编辑',
            role: 'editMenu'
        },
        {
            label: '选择词库',
            submenu: filesMenu
        },
        {
            label: '布署',
            submenu: [
                {
                    label: '重新布署',
                    click() {
                        applyRime()
                    }
                },
            ]
        },
        {
            label: '文件夹',
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
    if(IS_IN_DEVELOP){
        menuStructure.push(
            {
                label: '码表处理',
                submenu: [
                    {
                        label: '处理一码多词：空格',
                        click() {
                            showToolWindow()
                        }
                    },
                ]
            }
        )
    }
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
                    fileList.push({
                        name: getLabelNameFromFileName(item),
                        path: item
                    })
                    filesMenu.push({
                        label: getLabelNameFromFileName(item),
                        click(sender, window, content) {
                            window.title = sender.label // 点击对应菜单时，显示当前编辑词库的名字
                            currentFilePath = item
                            readFile(item)
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
    let config = readConfigFile()
    if (!config.rimeHomeDir){ // 没有设置配置文件目录时
        switch (os.platform()){
            case 'aix': break
            case 'darwin': return path.join(userHome + '/Library/Rime') // macOS
            case 'freebsd': break
            case 'linux': break
            case 'openbsd': break
            case 'sunos': break
            case 'win32': return path.join(userHome + '/AppData/Roaming/Rime') // windows
        }
    } else {
        return config.rimeHomeDir
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
