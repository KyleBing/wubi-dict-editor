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
        ipcRenderer.on('responseConfigFile', (event, config) => {
            this.config = config
        })
        ipcRenderer.send('requestConfigFile')

        // 选取配置目录后保存
        ipcRenderer.on('choosenRimeHomeDir', (event, dir) => {
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
        loadConfig(){
            ipcRenderer.send('requestConfigFile')
        },
        chooseRimeHomeDir(){
            ipcRenderer.send('chooseRimeHomeDir')
        }
    },
    watch: {
        config: {
            handler(newValue) {
                log(JSON.stringify(newValue))
                ipcRenderer.send('requestSaveConfig', JSON.stringify(this.config))
            },
            deep: true
        },
    }
}

new Vue(app)
