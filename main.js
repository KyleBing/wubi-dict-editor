const {app, globalShortcut, BrowserWindow, Menu, ipcMain, shell, dialog, net, Notification} = require('electron')
const {exec} = require('child_process')
const fs = require('fs')
const os = require('os')
const url = require("url")
const path = require("path")
const {shakeDom, log, shakeDomFocus, dateFormatter, unicodeBase64Encode, unicodeBase64Decode} = require('./js/Utility')
const {
    DEFAULT_BASE_URL,
    IS_REQUEST_LOCAL,
    IS_IN_DEVELOP,
    CONFIG_FILE_PATH,
    CONFIG_FILE_NAME,
    DEFAULT_CONFIG,
    CONFIG_DICT_MAP_FILE_NAME
} = require('./js/Global')
const plist = require("plist")
const wubiApi = require("./js/wubiApi")

let mainWindow // 主窗口
let fileList = [] // 文件目录列表，用于移动词条

function createMainWindow() {
    let width = IS_IN_DEVELOP ? 1800 : 1250
    let height = 800
    mainWindow = new BrowserWindow({
        width,
        height,
        icon: __dirname + '/assets/appIcon/appicon.ico', // windows icon
        // icon: __dirname + '/assets/appIcon/linux.png', // linux icon
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    if (IS_IN_DEVELOP) {
        mainWindow.webContents.openDevTools() // 打开调试窗口
    }

    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, './view/index/index.html'),
            protocol: "file:",
            slashes: true
        })
    )
    mainWindow.on('closed', function () {
        mainWindow = null
        if (configWindow) configWindow.close()
        if (toolWindow) toolWindow.close()
    })

    // 保存词库到文件
    ipcMain.on('saveFile', (event, filename, yamlString) => {
        fs.writeFile(path.join(getRimeConfigDir(), filename), yamlString, {encoding: "utf8"}, err => {
            if (!err) {
                console.log('saveFileSuccess')
                try {
                    applyRime() // 布署
                } catch (err) {
                    console.log('获取程序目录失败')
                }
                mainWindow.webContents.send('saveFileSuccess')
            }
        })
    })

    // 监听 window 的文件载入请求
    ipcMain.on('loadInitDictFile', event => {
        let config = readConfigFile()
        readFileFromConfigDir(config.initFileName)
    })

    // 监听载入主文件内容的请求
    ipcMain.on('loadDictFile', (event, filename) => {
        readFileFromConfigDir(filename)
    })

    // 监听载入次文件内容的请求
    ipcMain.on('MainWindow:LoadSecondDict', (event, filename) => {
        let filePath = path.join(getRimeConfigDir(), filename)
        fs.readFile(filePath, {encoding: 'utf-8'}, (err, res) => {
            if (err) {
                console.log(err)
            } else {
                mainWindow.webContents.send('setTargetDict', filename, filePath, res)
            }
        })
    })

    // 监听载入主文件内容的请求
    ipcMain.on('loadMainDict', event => {
        let mainDictFileName = 'wubi86_jidian.dict.yaml'
        fs.readFile(path.join(getRimeConfigDir(), mainDictFileName), {encoding: 'utf-8'}, (err, res) => {
            if (err) {
                console.log(err)
            } else {
                mainWindow.webContents.send('setMainDict', path.join(getRimeConfigDir(), mainDictFileName), res)
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

    // config 相关，载入配置文件内容
    ipcMain.on('MainWindow:RequestConfigFile', event => {
        let config = readConfigFile() // 没有配置文件时，返回 false
        if (config) { // 如果有配置文件
            mainWindow.send('MainWindow:ResponseConfigFile', config) // 向窗口发送 config 内容
        }
    })
    // 保存配置文件内容
    ipcMain.on('saveConfigFileFromMainWindow', (event, configString) => {
        writeConfigFile(configString, mainWindow)
    })

    // 响应所有请求 dictMap 的请求
    ipcMain.on('getDictMap', event => {
        let dictMapFilePath = path.join(getAppConfigDir(), CONFIG_DICT_MAP_FILE_NAME)
        let dictMapFileContent = readFileFromDisk(dictMapFilePath)
        if (dictMapFileContent) {
            if (mainWindow) mainWindow.send('setDictMap', dictMapFileContent, CONFIG_DICT_MAP_FILE_NAME, dictMapFilePath)
            if (toolWindow) toolWindow.send('setDictMap', dictMapFileContent, CONFIG_DICT_MAP_FILE_NAME, dictMapFilePath)
        } else {
            // 如果没有设置码表字典文件，使用默认配置目录中的码表文件作为字典文件
            let rimeWubiDefaultDictFilePath = path.join(getRimeConfigDir(), 'wubi86_jidian.dict.yaml')
            let originalDictFileContent = readFileFromDisk(rimeWubiDefaultDictFilePath)
            if (originalDictFileContent) {
                if (mainWindow) mainWindow.send('setDictMap', originalDictFileContent, CONFIG_DICT_MAP_FILE_NAME, dictMapFilePath)
                if (toolWindow) toolWindow.send('setDictMap', originalDictFileContent, CONFIG_DICT_MAP_FILE_NAME, dictMapFilePath)
            }
        }
    })

    // 保存选中词条到 plist 文件
    ipcMain.on('MainWindow:ExportSelectionToPlistFile', (event, wordsSelected) => {

        let wordsProcessed = wordsSelected.map(item => {
            return {
                phrase: item.word,
                shortcut: item.code
            }
        })
        let plistContentString = plist.build(wordsProcessed)
        let exportFilePath = path.join(os.homedir(), 'Desktop', 'wubi-jidian86-export.plist')

        fs.writeFile(
            exportFilePath,
            plistContentString,
            {encoding: 'utf-8'},
            err => {
                if (err) {
                    console.log(err)
                } else {
                    // notification
                    if (Notification.isSupported()) {
                        new Notification({
                            title: '已成功导出文件',
                            subtitle: `文件路径：${exportFilePath}`, // macOS
                            body: `文件路径：${exportFilePath}`
                        }).show()
                    }
                }
            })
    })


    // 获取线上词库：增量同步本地词库
    ipcMain.on('MainWindow:sync.get:INCREASE', (event, {fileName, userInfo}) => {
        getOnlineDictContent(fileName, userInfo)
            .then(res => {
                if (res.data && res.data.content) {
                    res.data.content = Buffer.from(res.data.content, "base64").toString()
                }
                mainWindow.send('MainWindow:sync.get:INCREASE:SUCCESS', res)
            })
            .catch(err => {
                console.log(err)
            })
    })
    // 获取线上词库：覆盖本地词库
    ipcMain.on('MainWindow:sync.get:OVERWRITE', (event, {fileName, userInfo}) => {
        getOnlineDictContent(fileName, userInfo)
            .then(res => {
                if (res.data && res.data.content) {
                    res.data.content = Buffer.from(res.data.content, "base64").toString()
                }
                mainWindow.send('MainWindow:sync.get:OVERWRITE:SUCCESS', res)
            })
            .catch(err => {
                console.log(err)
            })
    })

    function getOnlineDictContent(dictName, userInfo) {
        let config = readConfigFile() // 没有配置文件时，返回 false
        return wubiApi.pullDictFileContent(userInfo,{
            title: dictName,
        }, config.baseURL)
    }

    // 保存至线上词库，如果存在覆盖它
    ipcMain.on('MainWindow:sync.save', (event, {fileName, fileContentYaml, wordCount, userInfo}) => {
        console.log('MainWindow:sync.save', fileName)
        if (fileContentYaml.length < 20000) { // 限制整个文件的大小，最大 20000 字
            let finalContent = Buffer.from(fileContentYaml).toString('base64')
            console.log('content size original: ', fileContentYaml.length)
            console.log('content size escaped: ', (escape(fileContentYaml)).length)
            console.log('content size unicodeEncode: ', finalContent.length)

            let config = readConfigFile() // 没有配置文件时，返回 false

            wubiApi
                .pushDictFileContent(
                    userInfo,
                    {
                        title: fileName,
                        content: finalContent, // 为了避免一些标点干扰出现的问题，直接全部转义，
                        contentSize: fileContentYaml.length,
                        wordCount: wordCount,
                    }, config.baseURL)
                .then(res => {
                    mainWindow.send('MainWindow:sync.save:SUCCESS', res.data)
                })
                .catch(err => {
                    mainWindow.send('MainWindow:sync.save:FAIL', '上传失败')
                    console.log(err)
                })
        } else {
            mainWindow.send('MainWindow:sync.save:FAIL', '同步内容超过 20000 字')
        }
    })


    // 载入文件内容
    ipcMain.on('MainWindow:LoadFile', (event, fileName) => {
        readFileFromConfigDir(fileName, mainWindow)
    })
    // 载入文件内容
    ipcMain.on('MainWindow:ApplyRime', event => {
        applyRime()
    })
}

let toolWindow

function showToolWindow() {
    let width = IS_IN_DEVELOP ? 1400 : 1000
    let height = IS_IN_DEVELOP ? 600 : 600
    toolWindow = new BrowserWindow({
        width,
        height,
        icon: __dirname + '/assets/appIcon/appicon.ico', // windows icon
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    if (IS_IN_DEVELOP) {
        toolWindow.webContents.openDevTools() // 打开调试窗口
    }

    toolWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'view/tool/tool.html'),
            protocol: "file:",
            slashes: true
        })
    )
    toolWindow.on('closed', function () {
        let listeners = [
            'ToolWindow:RequestConfigFile',
            'ToolWindow:chooseDictFile',
            'ToolWindow:SaveFile',
            'ToolWindow:loadFileContent',
            'ToolWindow:openFileOutside',
            'ToolWindow:GetFileList',
            'ToolWindow:LoadTargetDict'
        ]
        listeners.forEach(item => {
            ipcMain.removeAllListeners(item)
        })
        toolWindow = null
        if (mainWindow) mainWindow.show()
    })


    // 保存选中词条到 plist 文件
    ipcMain.on('ToolWindow:ExportSelectionToPlistFile', (event, wordsSelected) => {

        let wordsProcessed = wordsSelected.map(item => {
            return {
                phrase: item.word,
                shortcut: item.code
            }
        })
        let plistContentString = plist.build(wordsProcessed)
        let exportFilePath = path.join(os.homedir(), 'Desktop', 'wubi-jidian86-export.plist')

        fs.writeFile(
            exportFilePath,
            plistContentString,
            {encoding: 'utf-8'},
            err => {
                if (err) {
                    console.log(err)
                } else {
                    // notification
                    if (Notification.isSupported()) {
                        new Notification({
                            title: '已成功导出文件',
                            subtitle: `文件路径：${exportFilePath}`, // macOS
                            body: `文件路径：${exportFilePath}`
                        }).show()
                    }
                }
            })
    })


    // 选取码表文件目录
    ipcMain.on('ToolWindow:chooseDictFile', event => {
        let dictFilePath = dialog.showOpenDialogSync(toolWindow, {
            filters: [
                {name: 'Text', extensions: ['text', 'txt', 'yaml']},
            ],
            properties: ['openFile'] // 选择文件
        })
        console.log(dictFilePath)
        if (dictFilePath) {
            readFileFromDiskAndResponse(dictFilePath[0], toolWindow)
        }
    })

    // 监听载入主文件内容的请求
    ipcMain.on('ToolWindow:loadMainDict', event => {
        let mainDictFileName = 'wubi86_jidian.dict.yaml'
        fs.readFile(path.join(getRimeConfigDir(), mainDictFileName), {encoding: 'utf-8'}, (err, res) => {
            if (err) {
                console.log(err)
            } else {
                toolWindow.webContents.send('ToolWindow:setMainDict', path.join(getRimeConfigDir(), mainDictFileName), res)
            }
        })
    })

    // 保存词库到文件
    ipcMain.on('ToolWindow:SaveFile', (event, filePath, fileConentString) => {
        fs.writeFile(filePath, fileConentString, {encoding: "utf8"}, err => {
            if (!err) {
                console.log('saveFileSuccess')
                // applyRime() // 布署
                toolWindow.webContents.send('saveFileSuccess')
            }
        })
    })

    // 监听 window 的文件载入请求
    ipcMain.on('ToolWindow:loadFileContent', (event, filePath) => {
        readFileFromDiskAndResponse(filePath, toolWindow)
    })

    // 外部打开当前码表文件
    ipcMain.on('ToolWindow:openFileOutside', (event, filename) => {
        shell.openPath(path.join(getRimeConfigDir(), filename)).then(res => {
            console.log(res)
        }).catch(err => {
            console.log(err)
        })
    })

    ipcMain.on('ToolWindow:GetFileList', event => {
        toolWindow.send('ToolWindow:FileList', fileList)
    })

    // 监听载入次文件内容的请求
    ipcMain.on('ToolWindow:LoadTargetDict', (event, filename) => {
        let filePath = path.join(getRimeConfigDir(), filename)
        fs.readFile(filePath, {encoding: 'utf-8'}, (err, res) => {
            if (err) {
                console.log(err)
            } else {
                toolWindow.webContents.send('ToolWindow:SetTargetDict', filename, filePath, res)
            }
        })
    })

    // config 相关
    ipcMain.on('ToolWindow:RequestConfigFile', event => {
        let config = readConfigFile() // 没有配置文件时，返回 false

        if (config) { // 如果有配置文件
            if (toolWindow) { // 如果有配置文件
                toolWindow.send('ToolWindow:ResponseConfigFile', config) // 向窗口发送 config 内容
            }
        }
    })
}


// 读取文件 从硬盘
function readFileFromDisk(filePath) {
    try {
        return fs.readFileSync(filePath, {encoding: 'utf-8'})
    } catch (e) {
        return false
    }
}

// 读取文件并回馈给指定窗口
function readFileFromDiskAndResponse(filePath, responseWindow) {
    let fileName = path.basename(filePath) // 获取文件名
    let fileContent = readFileFromDisk(filePath)
    if (fileContent) {
        responseWindow.send('showFileContent', fileName, filePath, fileContent)
    } else {
        console.log('读取文件错误')
    }
}


let configWindow

function createConfigWindow() {
    let width = IS_IN_DEVELOP ? 1400 : 800
    let height = IS_IN_DEVELOP ? 600 : 600
    // TODO：打开配置窗口的时候，先创建配置文件夹，供后面保存配置文件和字典文件使用

    // 判断 config 文件夹是否存在
    let configDir = getAppConfigDir()
    console.log(configDir)
    if (!fs.existsSync(configDir)) {
        console.log('create config dir', configDir)
        fs.mkdirSync(configDir) // 创建目录

    }

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
            pathname: path.join(__dirname, 'view/config/config.html'),
            protocol: "file:",
            slashes: true
        })
    )
    configWindow.on('closed', function () {
        let listeners = [
            'requestFileList',
            'ConfigWindow:RequestSaveConfig',
            'ConfigWindow:ChooseRimeHomeDir',
            'ConfigWindow:SetDictMapFile',
        ]
        listeners.forEach(item => {
            ipcMain.removeAllListeners(item)
        })
        configWindow = null
        if (toolWindow) toolWindow.show()
        if (mainWindow) mainWindow.show()
    })


    // 处理登录请求
    ipcMain.on('ConfigWindow:Login', (event, userInfo) => {
        let requestData = {
            email: userInfo.email,
            password: userInfo.password,
        }

        let config = readConfigFile()

        // 1. 新建 net.request 请求
        let baseURL = config.baseURL || DEFAULT_BASE_URL // 当配置文件中没有值时，使用默认值

        const request = net.request({
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
            url: IS_REQUEST_LOCAL ?
                'http://localhost:3000/user/login' :
                `${baseURL}/user/login`
        })
        // 2. 通过 request.write() 方法，发送的 post 请求数据需要先进行序列化，变成纯文本的形式
        request.write(JSON.stringify(requestData))

        // 3. 处理返回结果
        request.on('response', response => {
            response.on('data', res => {
                console.log(res.toString())
                // res 是 Buffer 数据
                // 通过 toString() 可以转为 String
                // 详见： https://blog.csdn.net/KimBing/article/details/124299412
                let data = JSON.parse(res.toString())
                configWindow.send('ConfigWindow:ResponseLogin', data)
            })
            response.on('end', () => {
            })
        })

        // 4. 记得关闭请求
        request.end()


    })

    // 载入文件列表
    ipcMain.on('requestFileList', event => {
        configWindow.send('responseFileList', fileList)
    })

    // config 相关
    ipcMain.on('ConfigWindow:RequestConfigFile', event => {
        let config = readConfigFile() // 没有配置文件时，返回 false
        if (config) { // 如果有配置文件
            if (configWindow) { // 如果有配置文件
                configWindow.send('ConfigWindow:ResponseConfigFile', config) // 向窗口发送 config 内容
            }
        }
    })

    // 保存配置文件内容
    ipcMain.on('ConfigWindow:RequestSaveConfig', (event, configString) => {
        writeConfigFile(configString)
    })

    // 选取配置文件目录
    ipcMain.on('ConfigWindow:ChooseRimeHomeDir', event => {
        let rimeHomeDir = dialog.showOpenDialogSync(configWindow, {
            properties: ['openDirectory'] // 选择文件夹
        })
        if (rimeHomeDir) {
            configWindow.send('ConfigWindow:ChosenRimeHomeDir', rimeHomeDir)
        }
    })

    // 选取输入法程序目录
    ipcMain.on('ConfigWindow:ChooseRimeExecDir', event => {
        let rimeExecDir = dialog.showOpenDialogSync(configWindow, {
            properties: ['openDirectory'] // 选择文件夹
        })
        if (rimeExecDir) {
            configWindow.send('ConfigWindow:ChosenRimeExecDir', rimeExecDir)
        }
    })

    // 选取编码字典文件
    ipcMain.on('ConfigWindow:SetDictMapFile', event => {
        // 获取文件码表文件路径，返回值为路径数组
        let dictMapPathArray = dialog.showOpenDialogSync(configWindow, {
            defaultPath: getRimeConfigDir(), // 默认为 Rime 配置文件目录
            filters: [
                {name: '码表文件', extensions: ['text', 'txt', 'yaml']},
            ],
            properties: ['openFile'] // 选择文件夹
        })
        if (dictMapPathArray.length > 0) {
            let filePath = dictMapPathArray[0]
            let fileName = path.basename(filePath) // 获取文件名
            let fileContent = readFileFromDisk(filePath)
            if (fileContent) {
                configWindow.send('ConfigWindow:ShowDictMapContent', fileName, filePath, fileContent)
            } else {
                log('读取码表字典文件错误')
            }
        }
    })

    // 保存 DictMap 文件
    ipcMain.on('ConfigWindow:SaveDictMapFile', (event, fileContentString) => {
        let configPath = getAppConfigDir()
        console.log(configPath)
        fs.writeFile(
            path.join(configPath, CONFIG_DICT_MAP_FILE_NAME),
            fileContentString,
            {encoding: 'utf-8'},
            err => {
                if (err) {
                    console.log(err)
                } else {
                    configWindow.send('ConfigWindow:SaveDictMapSuccess')
                }
            })
    })
}


// config 文件保存在 用户文件夹下 / CONFIG_FILE_PATH/CONFIG_FILE_NAME 文件中
function writeConfigFile(contentString) {
    let configPath = getAppConfigDir()
    fs.writeFile(
        path.join(configPath, CONFIG_FILE_NAME),
        contentString, {encoding: 'utf-8'},
        err => {
            if (err) {
                console.log(err)
            } else {
                // 配置保存成功后，向主窗口发送配置文件内容
                if (toolWindow) toolWindow.send('ToolWindow:ResponseConfigFile', JSON.parse(contentString)) // 向窗口发送 config 内容
                if (mainWindow) mainWindow.send('MainWindow:ResponseConfigFile', JSON.parse(contentString)) // 向窗口发送 config 内容
            }
        })
}

function readConfigFile() {
    let configPath = path.join(os.homedir(), CONFIG_FILE_PATH)
    try { // 捕获读取文件时的错误，如果有配置文件 返回其内容，如果没有，返回  false
        let result = fs.readFileSync(path.join(configPath, CONFIG_FILE_NAME), {encoding: 'utf-8'})
        return JSON.parse(result)
    } catch (err) {
        return DEFAULT_CONFIG
    }
}

app.on('ready', () => {
    createMainWindow()
    getDictFileList() // 读取目录中的所有码表文件
    createMenu() // 创建菜单

    // Register a 'CommandOrControl+X' shortcut listener.
    const ret = globalShortcut.register('CommandOrControl+Shift+Alt+I', () => {
        console.log('ctrl + shift + alt + i is pressed')
        mainWindow.show()
    })

    if (!ret) {
        console.log('registration failed')
    }

    // Check whether a shortcut is registered.
    console.log(globalShortcut.isRegistered('CommandOrControl+Shift+Alt+I'))

})


app.on('will-quit', () => {
    // Unregister a shortcut.
    globalShortcut.unregister('CommandOrControl+Shift+Alt+I')

    // Unregister all shortcuts.
    globalShortcut.unregisterAll()
})

app.on('window-all-closed', function () {
    // if (process.platform !== 'darwin') app.quit()
    app.quit()
})

app.on('activate', function () {
    if (mainWindow === null) {
        createMainWindow()
    }
})

// 读取文件 从配置文件目录
function readFileFromConfigDir(fileName, responseWindow) {
    let rimeHomeDir = getRimeConfigDir()
    let filePath = path.join(rimeHomeDir, fileName)
    fs.readFile(filePath, {encoding: 'utf-8'}, (err, res) => {
        if (err) {
            console.log(err)
        } else {
            if (responseWindow) {
                responseWindow.send('showFileContent', fileName, filePath, res)
            } else {
                mainWindow.webContents.send('showFileContent', fileName, filePath, res)
            }
        }
    })
}


// 匹配文件名，返回对应文件的名字
function getLabelNameFromFileName(fileName) {
    let map = [
        {name: '❤ 用户词库', path: 'wubi86_jidian_user.dict.yaml'},
        {name: '分类词库', path: 'wubi86_jidian_extra.dict.yaml'},
        {name: '极点主表', path: 'wubi86_jidian.dict.yaml'},
        {name: 'pīnyīn 词库', path: 'pinyin_simp.dict.yaml'},
        {name: '英文', path: 'wubi86_jidian_english.dict.yaml'},
        {name: '扩展-行政区域', path: 'wubi86_jidian_extra_district.dict.yaml'},

        // 测试词库
        {name: '测试 - 主表 ⛳', path: 'test_main.dict.yaml'},
        {name: '测试 - 分组 ⛳', path: 'test_group.dict.yaml'},
        {name: '测试 - 普通 ⛳', path: 'test.dict.yaml'},
    ]
    let matchedPath = map.filter(item => item.path === fileName)
    // 返回匹配的名字，或者返回原文件名
    return matchedPath.length > 0 ? matchedPath[0].name : fileName.substring(0, fileName.indexOf('.dict.yaml'))
}


// 创建 menu
function createMenu() {
    let menuStructure = [
        {
            label: '配置',
            submenu: [
                {
                    label: '配置',
                    click() {
                        createConfigWindow()
                    }
                },
                {
                    label: '刷新', // 刷新页面
                    click() {
                        refreshWindows()
                    }
                },
                {
                    label: '打开调试窗口',
                    click(menuItem, targetWindow) {
                        targetWindow.openDevTools()
                    }
                },
                {
                    label: '关闭调试窗口',
                    click(menuItem, targetWindow) {
                        targetWindow.closeDevTools()
                    }
                },
            ]
        },
        {
            label: '编辑',
            role: 'editMenu'
        },
        {
            label: '文件夹',
            submenu: [
                {
                    label: '打开 Rime 配置文件夹', click() {
                        shell.openPath(getRimeConfigDir())
                    }
                },
                {
                    label: '打开 Rime 程序文件夹', click() {
                        shell.openPath(getRimeExecDir())
                    }
                },
                {
                    label: '打开工具配置文件夹', click() {
                        let configDir = path.join(os.homedir(), CONFIG_FILE_PATH)
                        shell.openPath(configDir)
                    }
                },
            ]
        },
        {
            label: '码表处理工具',
            submenu: [
                {
                    label: '码表处理工具',
                    click() {
                        showToolWindow()
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
    if (IS_IN_DEVELOP) {
        /*        menuStructure.push(

                )*/
    }
    let menu = Menu.buildFromTemplate(menuStructure)
    Menu.setApplicationMenu(menu)
}

// 刷新所有窗口内容
function refreshWindows() {
    if (mainWindow) mainWindow.reload()
    if (configWindow) configWindow.reload()
    if (toolWindow) toolWindow.reload()
}

// 读取配置目录中的所有码表文件
function getDictFileList() {
    let rimeFolderPath = getRimeConfigDir()
    fs.readdir(rimeFolderPath, (err, filePaths) => {
        if (err) {
            console.log(err)
        } else {
            let filesMenu = []
            // 筛选 .yaml 文件
            let yamlFileList = filePaths.filter(item => item.indexOf('.dict.yaml') > 0)
            // 匹配获取上面提前定义的文件名
            fileList = yamlFileList.map(item => {
                return {
                    name: getLabelNameFromFileName(item),
                    path: item
                }
            })
            // 排序路径
            fileList.sort((a, b) => a.name > b.name ? 1 : -1)
        }
    })
}

// 布署 Rime
function applyRime() {
    let rimeBinDir = getRimeExecDir()
    console.log(path.join(rimeBinDir, 'WeaselDeployer.exe'))
    switch (os.platform()) {
        case 'darwin':
            // macOS
            exec(`"${rimeBinDir}/Squirrel" --reload`, error => {
                console.log(error)
            })
            break
        case 'win32':
            // windows
            let execFilePath = path.join(rimeBinDir, 'WeaselDeployer.exe')
            exec(`"${execFilePath}" /deploy`, err => {
                if (err) {
                    console.log(err)
                }
            })
    }
}

// 根据系统返回 rime 配置路径
function getRimeConfigDir() {
    let userHome = os.homedir()
    let config = readConfigFile()
    if (!config.rimeHomeDir) { // 没有设置配置文件目录时
        switch (os.platform()) {
            case 'aix':
                break
            case 'darwin':
                return path.join(userHome + '/Library/Rime') // macOS
            case 'freebsd':
                break
            case 'linux':
                return path.join(userHome + '/.config/ibus/rime/')
            case 'openbsd':
                break
            case 'sunos':
                break
            case 'win32':
                return path.join(userHome + '/AppData/Roaming/Rime') // windows
        }
    } else {
        return config.rimeHomeDir
    }
}

function getAppConfigDir() {
    return path.join(os.homedir(), CONFIG_FILE_PATH)
}

// 返回  Rime 可执行文件夹
function getRimeExecDir() {
    switch (os.platform()) {
        case 'aix':
            break
        case 'darwin':
            // macOS
            return path.join('/Library/Input Methods/Squirrel.app', 'Contents/MacOS')
        case 'freebsd':
            break
        case 'linux':
            break
        case 'openbsd':
            break
        case 'sunos':
            break
        case 'win32':
            // windows
            let configContent = readConfigFile()
            if (configContent.rimeExecDir) { // 如果存在已配置的程序目录，使用它
                return configContent.rimeExecDir
            } else {
                const PATH_RIME_BIN_WIN = 'C:/Program Files (x86)/Rime'
                let execDirEntries = fs.readdirSync(PATH_RIME_BIN_WIN, {withFileTypes: true})
                execDirEntries.sort((a,b) => a.name > b.name?1:-1)
                let rimeDirEntries = execDirEntries.filter(item => item.name.includes('weasel')) // 过滤带 weasel 字符的文件夹
                return path.join(PATH_RIME_BIN_WIN, rimeDirEntries[rimeDirEntries.length - 1].name)
            }
    }
}

