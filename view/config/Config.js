const Vue  = require('../../node_modules/vue/dist/vue.common.dev')
const {ipcRenderer} = require('electron')
const {log} = require('../../js/Utility')
const { IS_IN_DEVELOP, CONFIG_FILE_PATH, CONFIG_FILE_NAME, DEFAULT_CONFIG } =  require('../../js/Global')


// Vue 2
const app = {
    el: '#app',
    data() {
        return {
            fileList: null, // 展示用的配置文件夹内的文件列表
            // [{ "name": "luna_pinyin.sogou", "path": "luna_pinyin.sogou.dict.yaml" }]
            config: DEFAULT_CONFIG
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
        ipcRenderer.on('ConfigWindow:ResponseConfigFile', (event, config) => {
            this.config = config
        })
        ipcRenderer.send('ConfigWindow:RequestConfigFile')

        // 选取配置目录后保存
        ipcRenderer.on('ConfigWindow:ChoosenRimeHomeDir', (event, dir) => {
            this.config.rimeHomeDir = dir[0]
        })

        onresize = ()=>{
            this.heightContent = innerHeight - 47 - 20 - 10 + 3
        }
    },
    methods: {
        setInitFile(file){
            this.config.initFileName = file.path
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
                        document.documentElement.classList.add('auto-mode');
                        document.documentElement.classList.remove('dark-mode');
                        break;
                    case "black":
                        document.documentElement.classList.add('dark-mode');
                        document.documentElement.classList.remove('auto-mode');
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
