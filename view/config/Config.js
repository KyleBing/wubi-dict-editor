const Vue  = require('../../node_modules/vue/dist/vue.common.prod')
const {ipcRenderer} = require('electron')
const {log} = require('../../js/Utility')
const { IS_IN_DEVELOP, CONFIG_FILE_PATH, CONFIG_FILE_NAME, DEFAULT_CONFIG } =  require('../../js/Global')
const os = require('os')
const DictMap = require('../../js/DictMap')


// Vue 2
const app = {
    el: '#app',
    data() {
        return {
            fileList: null, // 展示用的配置文件夹内的文件列表
            // [{ "name": "luna_pinyin.sogou", "path": "luna_pinyin.sogou.dict.yaml" }]
            config: DEFAULT_CONFIG,
            dictMapContent: '', // 字典文件内容
            userInfo: {
                email:'',
                password: ''
            },
            loginTip: ''
        }
    },
    mounted() {
        this.heightContent = innerHeight - 47 - 20 - 10 + 3

        // load file list
        ipcRenderer.on('responseFileList', (event, fileList) => {
            fileList.sort((a,b) => a.name > b.name ? 1: -1)
            this.fileList = fileList
        })
        ipcRenderer.send('requestFileList')

        // config
        ipcRenderer.on('ConfigWindow:ResponseLogin', (event, resOfLogin) => {
            if (resOfLogin.success){
                console.log('登录成功', resOfLogin.data)
                this.tipNotice('登录成功')
                this.$set(this.config, 'userInfo', resOfLogin.data)
            } else {
                console.log('登录失败', resOfLogin.message)
                this.tipNotice('登录失败')
            }
        })

        // config
        ipcRenderer.on('ConfigWindow:ResponseConfigFile', (event, config) => {
            this.config = config
            this.userInfo.email = config.userInfo && config.userInfo.email
        })
        ipcRenderer.send('ConfigWindow:RequestConfigFile')

        // 选取配置目录后保存
        ipcRenderer.on('ConfigWindow:ChoosenRimeHomeDir', (event, dir) => {
            this.config.rimeHomeDir = dir[0]
        })

        // 字典文件保存后
        ipcRenderer.on('ConfigWindow:SaveDictMapSuccess', event => {
            this.config.hasSetDictMap = true
        })

        // 读取字典文件的内容
        ipcRenderer.on('ConfigWindow:ShowDictMapContent', (event, fileName, filePath, fileContent) => {
            let dictMap = new DictMap(fileContent, fileName, filePath)
            let dictMapFileContent = dictMap.toExportString()
            ipcRenderer.send('ConfigWindow:SaveDictMapFile', dictMapFileContent) // 保存取到的单字字典文本
        })


        onresize = ()=>{
            this.heightContent = innerHeight - 47 - 20 - 10 + 3
        }
    },
    methods: {
        tipNotice(msg){
            this.loginTip = msg
            setTimeout(()=>{this.loginTip = ''}, 3000)
        },
        login(){
            ipcRenderer.send('ConfigWindow:Login', this.userInfo)
        },
        setInitFile(file){
            this.config.initFileName = file.path
        },
        setDictMap(){
            ipcRenderer.send('ConfigWindow:SetDictMapFile')
        },
        chooseRimeHomeDir(){
            ipcRenderer.send('ConfigWindow:ChooseRimeHomeDir')
        }
    },
    watch: {
        config: {
            handler(newValue) {
                switch (newValue.theme){
                    case "auto":
                        document.documentElement.classList.add('theme-auto');
                        document.documentElement.classList.remove('theme-dark');
                        document.documentElement.classList.remove('theme-white');
                        break;
                    case "black":
                        document.documentElement.classList.remove('theme-auto');
                        document.documentElement.classList.add('theme-dark');
                        document.documentElement.classList.remove('theme-white');
                        break;
                    case "white":
                        document.documentElement.classList.remove('theme-auto');
                        document.documentElement.classList.remove('theme-dark');
                        document.documentElement.classList.add('theme-white');
                        break;
                }
                log(JSON.stringify(newValue))
                ipcRenderer.send('ConfigWindow:RequestSaveConfig', JSON.stringify(this.config))
            },
            deep: true
        },
    }
}

new Vue(app)
