const IS_IN_DEVELOP = false // 生产
// const IS_IN_DEVELOP = true // 开发

// 五笔独立服务，nginx 把 /wubi/portal/ 反代到 portal-wubi（/wubi/ 根路径是文档站）
const DEFAULT_BASE_URL = 'https://kylebing.cn/wubi/portal/'
// const DEFAULT_BASE_URL = 'http://localhost:3001/wubi/portal/'

const IS_REQUEST_LOCAL = false // 同步请求，请求线上
// const IS_REQUEST_LOCAL = true // 同步请求，请求本地


const CONFIG_FILE_NAME = 'config.json' // 配置文件 文件名
const CONFIG_DICT_MAP_FILE_NAME = 'dict_map.txt' // 编码生成用的字典码表文件
const CONFIG_FILE_PATH = 'wubi-dict-editor' // 配置文件存放的目录

// 已停用的线上请求地址：v1.5.0 起五笔接口统一在 /wubi/portal/ 下，
// 下面这些老地址都拿不到接口（返回 404 纯文本），老配置命中时改回当前默认。
// 顺序要把更长的前缀放在前面，避免 /wubi/ 把 /wubi/portal/ 也匹配掉。
const LEGACY_ONLINE_BASE_URLS = [
    'https://kylebing.cn/portal/wubi/',
    'https://kylebing.cn/portal-wubi/',
    'https://kylebing.cn/wubi-manager/',
    'https://kylebing.cn/portal/',
    'https://kylebing.cn/wubi/',
]

/** 统一处理 baseURL：老地址迁移到当前默认，非本站的自定义地址原样返回 */
function migrateBaseURL(baseURL) {
    let base = String(baseURL || '').trim()
    if (!base) return DEFAULT_BASE_URL // 没配置时直接用默认
    // 服务器已强制 https，老配置里的 http 一并升级
    if (base.startsWith('http://kylebing.cn/')) {
        base = 'https://' + base.slice('http://'.length)
    }
    // 补末尾斜杠后再比对，兼容不带 / 的写法
    const withSlash = base.endsWith('/') ? base : base + '/'
    if (withSlash === DEFAULT_BASE_URL) return DEFAULT_BASE_URL
    if (LEGACY_ONLINE_BASE_URLS.some(prefix => withSlash === prefix || withSlash.startsWith(prefix))) {
        return DEFAULT_BASE_URL
    }
    return base
}

/** 统一处理配置里的 baseURL：优先用配置，并保证末尾有 / */
function resolveBaseURL(baseURL) {
    let base = String(baseURL || DEFAULT_BASE_URL).trim()
    if (!base) base = DEFAULT_BASE_URL
    base = migrateBaseURL(base) // 老地址改回当前默认，避免请求打到已下线的路径
    if (!base.endsWith('/')) base += '/'
    return base
}

const DEFAULT_CONFIG = {
    initFileName: 'wubi86_jidian_user.dict.yaml' ,  // 初始文件信息
    baseURL: 'https://kylebing.cn/wubi/portal/',     // BASE_URL
    autoDeployOnAdd: false ,                        // 添词后 是否自动部署
    autoDeployOnDelete: false ,                     // 删词后 是否自动部署
    autoDeployOnEdit: false ,                       // 编辑词条后 是否自动部署
    autoDeployOnSave: true ,                        // 保存后是否自动部署，默认保持原行为
    autoSyncUserDict: false ,                       // 仅用户词库文件自动同步
    enterKeyBehavior: 'add' ,                       // add | search
    rimeHomeDir: '' ,                               // 配置文件主目录
    rimeExecDir: '' ,                               // 输入法程序主目录
    searchMethod: 'both' ,                          // 搜索匹配的内容  code | phrase | both | any
    chosenGroupIndex: -1 ,                          // 列表中选定的分组 id
    theme: 'auto' ,                                 // auto 跟随系统 | black | white
    fontSize: 13 ,                                  // 界面基础字号（px）
    hasSetDictMap: false ,                          // 是否已经设置字典码表文件
    isToolPanelShowing: true,                       // index.html 工具面板是否展开
    fileNameList: [],                               // 匹配文件名，显示自定义码表文件的名字
        // [{ "name": "luna_pinyin.sogou", "path": "luna_pinyin.sogou.dict.yaml" }]
    mainDictFileName: 'wubi86_jidian.dict.yaml',    // 主词库文件名 v1.28
    pinyinDictFileName: 'pinyin_simp.dict.yaml',    // 拼音词库文件名
}

const SYNC_MAX_WORD_COUNT = 40000


module.exports = {
    DEFAULT_BASE_URL, resolveBaseURL, migrateBaseURL, IS_REQUEST_LOCAL, IS_IN_DEVELOP, CONFIG_FILE_NAME,
    CONFIG_FILE_PATH, DEFAULT_CONFIG, CONFIG_DICT_MAP_FILE_NAME, SYNC_MAX_WORD_COUNT
}
