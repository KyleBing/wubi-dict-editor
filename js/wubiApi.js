const request = require('./request')
const {resolveBaseURL} = require('./Global')

function apiUrl(baseURL, path) {
    return resolveBaseURL(baseURL) + path.replace(/^\//, '')
}

module.exports = {
    // 下载线上扩展词库内容
    pullExtraDict(userInfo, baseURL) { return request(userInfo, 'post', null, null, apiUrl(baseURL, 'wubi/word/export-extra'))},

    // 获取线上扩展词库类别
    getCategories(userInfo, baseURL) { return request(userInfo, 'get', null, null, apiUrl(baseURL, 'wubi/category/list'))},

    // 上传词条到服务器
    uploadWordsBatch(userInfo, requestData, baseURL) {return request(userInfo,'post', null, requestData, apiUrl(baseURL, 'wubi/word/add-batch'))},

    // DICT
    // 查看当前文件是否存在备份
    checkDictFileBackupExistence(userInfo, requestData, baseURL) {return request(userInfo,'post', null, requestData, apiUrl(baseURL, 'wubi/dict/check-backup-exist'))},
    pullDictFileContent(userInfo, params, baseURL) {return request(userInfo,'get', params, null, apiUrl(baseURL, 'wubi/dict/pull'))},
    pushDictFileContent(userInfo, requestData, baseURL) {return request(userInfo,'put', null, requestData, apiUrl(baseURL, 'wubi/dict/push'))},
}
