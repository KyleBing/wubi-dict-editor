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
            initFile: {}
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
            this.initFile = file
        }
    },
    watch: {

    }
}

new Vue(app)
