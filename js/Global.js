// const IS_IN_DEVELOP = false // 生产
const IS_IN_DEVELOP = true // 开发
const CONFIG_FILE_NAME = 'config.json'
const CONFIG_FILE_PATH = 'wubi-dict-editor'

const DEFAULT_CONFIG = {
    initFileName: {}, // 初始文件信息
    autoDeploy: false, // 是否自动布署
    enterKeyBehavior: 'add', // add | search
}

module.exports = {
    IS_IN_DEVELOP, CONFIG_FILE_NAME,CONFIG_FILE_PATH, DEFAULT_CONFIG
}
