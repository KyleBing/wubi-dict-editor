import Vue from '../../node_modules/vue/dist/vue.esm.browser.min.js'

const {ipcRenderer} = require('electron')
const { IS_IN_DEVELOP, CONFIG_FILE_PATH, CONFIG_FILE_NAME, DEFAULT_CONFIG } =  require('../../js/Global.js')


// Vue 2
const app = {
    el: '#app',
    data() {
        return {
            IS_IN_DEVELOP: IS_IN_DEVELOP, // 是否为开发模式
            fileList: null,
            // { "name": "luna_pinyin.sogou", "path": "luna_pinyin.sogou.dict.yaml" }
            config: DEFAULT_CONFIG
        }
    },
    mounted() {
        this.heightContent = innerHeight - 47 - 20 - 10

        // load file list
        ipcRenderer.on('responseFileList', (event, fileList) => {
            fileList.sort((a,b) => a.name > b.name ? 1: -1)
            this.fileList = fileList
        })
        ipcRenderer.send('requestFileList')

        // config
        ipcRenderer.on('responseConfigFile', (event, config) => {
            this.config = config
        })
        ipcRenderer.send('requestConfigFile')

        // 选取配置目录后保存
        ipcRenderer.on('choosenRimeHomeDir', (event, dir) => {
            this.config.rimeHomeDir = dir[0]
            this.saveConfig()
        })

        onresize = ()=>{
            this.heightContent = innerHeight - 47 - 20 - 10
        }
    },
    methods: {
        setInitFile(file){
            this.config.initFileName = file.path
            this.saveConfig()
        },
        saveConfig(){
            console.log(JSON.stringify(this.config))
            ipcRenderer.send('requestSaveConfig', JSON.stringify(this.config))
        },
        loadConfig(){
            ipcRenderer.send('requestConfigFile')
        },
        chooseRimeHomeDir(){
            ipcRenderer.send('chooseRimeHomeDir')
        }
    },
    watch: {
        config: (newValue)=>{
            switch (newValue.theme){
                case "auto":
                    document.documentElement.classList.add('auto-mode');
                    document.documentElement.classList.remove('dark-mode');
                    break;
                case "black":
                    document.documentElement.classList.add('dark-mode');
                    document.documentElement.classList.remove('auto-mode');
                    break;
            }
        },
    }
}

new Vue(app)
