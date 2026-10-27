const Vue  = require('../../node_modules/vue/dist/vue.common.prod')
const {ipcRenderer} = require('electron')
const {log} = require('../../js/Utility')
const { IS_IN_DEVELOP, CONFIG_FILE_PATH, CONFIG_FILE_NAME, DEFAULT_CONFIG, migrateBaseURL } =  require('../../js/Global')
const { applyAppearance, normalizeFontSize } = require('../../js/appearance')
const os = require('os')
const path = require('path')
const DictMap = require('../../js/DictMap')
const RegistrationApplyCopy = require('../../js/RegistrationApplyCopy')
const wubiApi = require('../../js/wubiApi')


// Vue 2
const app = {
    el: '#app',
    data() {
        return {
            // 必须拷贝：不能直接引用 DEFAULT_CONFIG，否则未加载完成时可能把默认 http 写回配置文件
            config: JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
            configLoaded: false,
            activeCategory: 'dict',
            categories: [
                { id: 'dict', label: '码表' },
                { id: 'ime', label: '输入法' },
                { id: 'behavior', label: '操作' },
                { id: 'appearance', label: '外观' },
                { id: 'sync', label: '同步' },
            ],
            fontSizeOptions: [12, 13, 14, 15, 16],
            dictMapContent: '', // 字典文件内容
            userInfo: {
                email:'',
                password: ''
            },
            loginTip: '',
            loginTipTimeoutHandler: null,
            resolvedRimeExecDir: '',
            registerPaidNote: RegistrationApplyCopy.PAID_NOTE,
        }
    },
    mounted() {
        this.heightContent = innerHeight - 47 - 20 - 10 + 3

        // RESPONSE OF FILE LIST
        ipcRenderer.on('responseFileList', (event, fileList) => {
            fileList.sort((a,b) => a.name > b.name ? 1: -1)
            // console.log('获取码表文件列表成功', fileList)
            if (this.config.fileNameList && this.config.fileNameList.length > 0){
                // console.log('已存在的码表名字对应：', this.config.fileNameList)
                // 如果已经存在设置过的名字对，过滤没有的加上
                let existFileNameMap = new Map()
                this.config.fileNameList
                    .filter(item => { // 以获取到的本地文件列表为主。过滤掉其它不存在文件的记录
                        return fileList.some(file => file.path === item.path )
                    })
                    .forEach(existFile => {
                        existFileNameMap.set(existFile.path, existFile)
                    })
                fileList.forEach(newFile => {
                    if (existFileNameMap.has(newFile.path)){

                    } else {
                        existFileNameMap.set(newFile.path, newFile)
                    }
                })
                let finalFileNameList = []
                // console.log('existFileNameMap：',existFileNameMap)
                existFileNameMap.forEach(item => {
                    finalFileNameList.push(item)
                })
                // console.log('finalFileNameList: ',finalFileNameList)
                this.$set(this.config, 'fileNameList', finalFileNameList)
            } else {
                this.$set(this.config, 'fileNameList', fileList)
                // [{ "name": "luna_pinyin.sogou", "path": "luna_pinyin.sogou.dict.yaml" }]
            }
        })

        // config login
        ipcRenderer.on('ConfigWindow:ResponseLogin', (event, resOfLogin) => {
            if (resOfLogin.success){
                console.log('登录成功', resOfLogin.data)
                this.showTip('登录成功')
                // 登录返回 data.token（JWT），不再含 password
                this.$set(this.config, 'userInfo', resOfLogin.data)
                this.userInfo.password = ''
            } else {
                console.log('登录失败', resOfLogin.message)
                this.showTip(resOfLogin.message || '登录失败')
            }
        })

        // RESPONSE OF CONFIG
        ipcRenderer.on('ConfigWindow:ResponseConfigFile', (event, config) => {
            console.log('获取配置成功')
            this.configLoaded = false
            // 磁盘配置优先，缺省字段用默认值补齐（不会用默认 baseURL 覆盖已有 https 配置）
            this.config = Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_CONFIG)), config)
            // 老版本存的地址已下线，这里显示迁移后的地址，保存时自然写回
            this.config.baseURL = migrateBaseURL(this.config.baseURL)

            // v1.27 添加 mainDictFileName 字段
            if (!this.config.hasOwnProperty('mainDictFileName')) this.$set(this.config, 'mainDictFileName', 'wubi86_jidian.dict.yaml')
            if (!this.config.hasOwnProperty('pinyinDictFileName')) this.$set(this.config, 'pinyinDictFileName', 'pinyin_simp.dict.yaml')

            // v1.15 添加 rimeExecDir 字段
            if (!this.config.hasOwnProperty('rimeExecDir')) this.$set(this.config, 'rimeExecDir', '')

            if (!this.config.hasOwnProperty('fontSize')) this.$set(this.config, 'fontSize', normalizeFontSize(DEFAULT_CONFIG.fontSize))
            applyAppearance(this.config)

            this.userInfo.email = this.config.userInfo && this.config.userInfo.email
            this.$nextTick(() => {
                this.configLoaded = true
            })
            // after config is loaded, then request for fileList
            ipcRenderer.send('requestFileList')
            if (process.platform === 'win32') {
                this.refreshResolvedRimeExecDir()
            }
        })

        ipcRenderer.send('ConfigWindow:RequestConfigFile')

        // 选取 rime 配置目录后保存
        ipcRenderer.on('ConfigWindow:ChosenRimeHomeDir', (event, dir) => {
            this.config.rimeHomeDir = dir[0]
        })
        // 选取 rime 程序目录后保存
        ipcRenderer.on('ConfigWindow:ChosenRimeExecDir', (event, dir) => {
            this.config.rimeExecDir = dir[0]
            this.refreshResolvedRimeExecDir()
        })
        ipcRenderer.on('ConfigWindow:ChosenRimeExecDir:Invalid', (event, message) => {
            this.showTip(message)
        })
        ipcRenderer.on('ConfigWindow:ResolvedRimeExecDir', (event, info) => {
            this.resolvedRimeExecDir = info.resolved || ''
        })

        // 字典文件保存后
        ipcRenderer.on('ConfigWindow:SaveDictMapSuccess', event => {
            this.config.hasSetDictMap = true
        })

        // 读取字典文件的内容
        ipcRenderer.on('ConfigWindow:ShowDictMapContent', (event, fileName, filePath, fileContent) => {
            let dictMap = new DictMap(fileContent)
            let dictMapFileContent = dictMap.toExportString()
            ipcRenderer.send('ConfigWindow:SaveDictMapFile', dictMapFileContent) // 保存取到的单字字典文本
        })


        onresize = ()=>{
            this.heightContent = innerHeight - 47 - 20 - 10 + 3
        }
    },
    computed: {
        // 当前系统下的两个词库目录，按钮直接写入配置。
        shortcutHomes() {
            const home = os.homedir()
            if (process.platform === 'darwin') {
                return {
                    rime: path.join(home, 'Library', 'Rime'),
                    meifeng: path.join(home, 'Library', 'Application Support', 'MeifengWubi', 'rime'),
                }
            }
            if (process.platform === 'win32') {
                return {
                    rime: path.join(home, 'AppData', 'Roaming', 'Rime'),
                    meifeng: path.join(home, 'AppData', 'Roaming', 'MeifengWubi', 'rime'),
                }
            }
            return {
                rime: path.join(home, '.config', 'ibus', 'rime'),
                meifeng: path.join(home, '.config', 'MeifengWubi', 'rime'),
            }
        },
        registerApplyHref() {
            return RegistrationApplyCopy.registerApplyHref(this.config.baseURL)
        },
        registerHref() {
            return RegistrationApplyCopy.registerHref(this.config.baseURL)
        },
    },
    methods: {
        /**
         * @param {string} message
         * @param {number} [duration=3000] 显示时长（毫秒）
         */
        showTip(message, duration = 3000) {
            if (!message) {
                return
            }
            if (this.loginTipTimeoutHandler) {
                clearTimeout(this.loginTipTimeoutHandler)
            }
            this.loginTip = String(message)
            this.loginTipTimeoutHandler = setTimeout(() => {
                this.loginTip = ''
                this.loginTipTimeoutHandler = null
            }, duration)
        },
        login(){
            if (!this.userInfo.email || !this.userInfo.password) {
                this.showTip('请填写邮箱和密码')
                return
            }
            if (!this.config.baseURL) {
                this.showTip('请先填写请求地址')
                return
            }
            ipcRenderer.send('ConfigWindow:Login', this.userInfo)
        },
        // 清除本地登录态
        logout(){
            this.$set(this.config, 'userInfo', null)
            this.userInfo = { email: '', password: '' }
            this.showTip('已退出登录')
        },
        // 删除线上同步数据：只清空云端个人词库，账号保持登录；需输入完整账号邮箱确认
        clearSyncData(){
            const userInfo = this.config.userInfo
            if (!userInfo || !userInfo.uid) {
                this.showTip('请先登录')
                return
            }
            if (!this.confirmByEmail(
                '删除线上同步数据',
                '云端备份的个人词库会被删除，同步次数归零。本机词库和账号资料不受影响，下次自动同步时会重新上传本机词库。',
                userInfo.email
            )) {
                return
            }
            wubiApi.clearSyncData(userInfo, this.config.baseURL)
                .then(res => this.showTip(res.message || '线上同步数据已删除'))
                .catch(err => this.showTip((err && err.message) || '删除失败'))
        },
        // 注销账号：输入完整邮箱后在服务端删除全部用户数据，再清本地登录态
        destroyAccount(){
            const userInfo = this.config.userInfo
            if (!userInfo || !userInfo.uid) {
                this.showTip('请先登录')
                return
            }
            if (!this.confirmByEmail(
                '注销账号',
                '注销会永久删除账号资料、云端个人词库、本人提交的词条、邀请码、邮箱验证记录和本人提交的注册申请。注销后无法登录，也无法恢复；本机词库仍保留在本地。',
                userInfo.email
            )) {
                return
            }
            wubiApi.destroyAccount(userInfo, this.config.baseURL)
                .then(res => {
                    this.$set(this.config, 'userInfo', null)
                    this.userInfo = { email: '', password: '' }
                    this.showTip(res.message || '账号已注销')
                })
                .catch(err => this.showTip((err && err.message) || '注销失败'))
        },
        // 破坏性操作确认：必须完整输入当前账号邮箱，一致才继续
        confirmByEmail(title, message, email){
            const expected = String(email || '').trim()
            if (!expected) {
                this.showTip('没有读到账号邮箱，请重新登录后再试')
                return false
            }
            const typed = prompt(`${title}\n\n${message}\n\n请输入账号邮箱 ${expected} 以确认。`)
            if (typed === null) {
                return false
            }
            if (typed.trim().toLowerCase() !== expected.toLowerCase()) {
                this.showTip('邮箱不一致，操作已取消')
                return false
            }
            return true
        },
        setInitFile(file){
            this.config.initFileName = file.path
        },
        setMainDictFile(file){
            this.config.mainDictFileName = file.path
        },
        setPinyinDictFile(file){
            this.config.pinyinDictFileName = file.path
        },
        setDictMap(){
            ipcRenderer.send('ConfigWindow:SetDictMapFile')
        },
        chooseRimeHomeDir(){
            ipcRenderer.send('ConfigWindow:ChooseRimeHomeDir')
        },
        // 一键切到当前系统的 Rime 目录或玫枫默认词库目录。
        useShortcutHome(kind) {
            const target = kind === 'meifeng' ? this.shortcutHomes.meifeng : this.shortcutHomes.rime
            this.config.rimeHomeDir = target
        },
        isShortcutHome(kind) {
            const current = this.config.rimeHomeDir
            if (!current) return false
            const target = kind === 'meifeng' ? this.shortcutHomes.meifeng : this.shortcutHomes.rime
            if (process.platform === 'win32') {
                return path.normalize(current).toLowerCase() === path.normalize(target).toLowerCase()
            }
            return path.normalize(current) === path.normalize(target)
        },
        chooseRimeExecDir(){
            ipcRenderer.send('ConfigWindow:ChooseRimeExecDir')
        },
        clearRimeHomeDir(){
            this.config.rimeHomeDir = ''
        },
        clearRimeExecDir(){
            this.config.rimeExecDir = ''
            this.refreshResolvedRimeExecDir()
        },
        refreshResolvedRimeExecDir(){
            ipcRenderer.send('ConfigWindow:ResolveRimeExecDir')
        },
    },
    watch: {
        config: {
            handler(newValue) {
                applyAppearance(newValue)
                // 配置从未磁盘加载完成前不写回，避免默认值覆盖用户的 baseURL
                if (!this.configLoaded) return
                ipcRenderer.send('ConfigWindow:RequestSaveConfig', JSON.stringify(this.config))
            },
            deep: true
        },
    }
}

new Vue(app)
