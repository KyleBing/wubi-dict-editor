const IS_IN_DEVELOP = false // 生产
// const IS_IN_DEVELOP = true // 开发
const CONFIG_FILE_NAME = 'config.json' // 配置文件 文件名
const CONFIG_DICT_MAP_FILE_NAME = 'dict_map.txt' // 编码生成用的字典码表文件
const CONFIG_FILE_PATH = 'wubi-dict-editor' // 配置文件存放的目录

const DEFAULT_CONFIG = {
    initFileName: 'wubi86_jidian_user.dict.yaml', // 初始文件信息
    autoDeployOnAdd: false, // 添词后 是否自动布署
    autoDeployOnDelete: false, // 删词后 是否自动布署
    autoDeployOnEdit: false, // 编辑词条后 是否自动布署
    enterKeyBehavior: 'add', // add | search
    rimeHomeDir: '', // 配置文件主目录
    searchMethod: 'both', // 搜索匹配的内容  code | phrase | both | any
    chosenGroupIndex: -1, // 列表中选定的分组 id
    theme: 'auto', // auto 跟随系统 | black
    hasSetDictMap: false, // 是否已经设置字典码表文件
    isToolPanelShowing: true // index.htlm 工具面板是否展开
}


module.exports = {
    IS_IN_DEVELOP, CONFIG_FILE_NAME,CONFIG_FILE_PATH, DEFAULT_CONFIG, CONFIG_DICT_MAP_FILE_NAME
}
