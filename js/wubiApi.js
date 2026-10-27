const request = require('./request')
const {resolveBaseURL} = require('./Global')

// baseURL 已含 /wubi/portal 前缀，这里的 path 不再重复写前缀
function apiUrl(baseURL, path) {
    return resolveBaseURL(baseURL) + path.replace(/^\//, '')
}

module.exports = {
    // 公开系统配置（含 dict_sync_max_chars），无需登录
    getSystemConfig(baseURL) { return request(null, 'get', null, null, apiUrl(baseURL, 'system-config')) },

    // 下载线上扩展词库内容
    pullExtraDict(userInfo, baseURL) { return request(userInfo, 'post', null, null, apiUrl(baseURL, 'word/export-extra'))},

    // 获取线上扩展词库类别
    getCategories(userInfo, baseURL) { return request(userInfo, 'get', null, null, apiUrl(baseURL, 'category/list'))},

    // 上传词条到服务器
    uploadWordsBatch(userInfo, requestData, baseURL) {return request(userInfo,'post', null, requestData, apiUrl(baseURL, 'word/add-batch'))},

    // DICT
    // 查看当前文件是否存在备份
    checkDictFileBackupExistence(userInfo, requestData, baseURL) {return request(userInfo,'post', null, requestData, apiUrl(baseURL, 'dict/check-backup-exist'))},
    dictMeta(userInfo, params, baseURL) {return request(userInfo,'get', params, null, apiUrl(baseURL, 'dict/meta'))},
    pullDictFileContent(userInfo, params, baseURL) {return request(userInfo,'get', params, null, apiUrl(baseURL, 'dict/pull'))},
    pushDictFileContent(userInfo, requestData, baseURL) {return request(userInfo,'put', null, requestData, apiUrl(baseURL, 'dict/push'))},

    // ACCOUNT
    // 删除线上同步数据：只清空云端个人词库备份，账号保留
    clearSyncData(userInfo, baseURL) {return request(userInfo, 'delete', null, null, apiUrl(baseURL, 'user/clear-sync-data'))},
    // 注销账号：删除服务端全部用户数据，不可恢复
    destroyAccount(userInfo, baseURL) {return request(userInfo, 'delete', null, null, apiUrl(baseURL, 'user/destroy-account'))},
}
