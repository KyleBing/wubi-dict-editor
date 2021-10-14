import {shakeDom, shakeDomFocus} from "./Utility.mjs"
import Vue from '../node_modules/vue/dist/vue.esm.browser.min.js'

const {ipcRenderer} = require('electron')
const {IS_IN_DEVELOP} =  require('./js/Global')


// Vue 2
const app = {
    el: '#app',
    data() {
        return {
            IS_IN_DEVELOP: IS_IN_DEVELOP, // 是否为开发模式
            fileList: null,
            // { "name": "luna_pinyin.sogou", "path": "luna_pinyin.sogou.dict.yaml" }
            config: {
                initFile: {}, // 初始文件信息
                autoDeploy: false, // 是否自动布署
                enterKeyBehavior: 'add', // add | search
            }
        }
    },
    mounted() {
        this.heightContent = innerHeight - 47 - 20 - 10

        ipcRenderer.on('FileList', (event, fileList) => {
            fileList.sort((a,b) => a.name > b.name ? 1: -1)
            this.fileList = fileList
        })
        ipcRenderer.send('GetFileList')

        onresize = ()=>{
            this.heightContent = innerHeight - 47 - 20 - 10
        }
    },
    methods: {
        setInitFile(file){
            this.config.initFile = file
            this.saveConfig()
        },
        saveConfig(){
            console.log(JSON.stringify(this.config))
        },
        loadConfig(){

        }
    },
    watch: {
        config: (newValue)=>{
            console.log(this.config)
        }
    }
}

new Vue(app)
