const request = require('./request')
const {DEFAULT_BASE_URL} = require('./Global')

module.exports = {
    // 下载线上扩展词库内容
    pullExtraDict(token, baseURL) { return request(token, 'post', null, null, (baseURL || DEFAULT_BASE_URL) + "wubi/word/export-extra")},

    // 获取线上扩展词库类别
    getCategories(token, baseURL) { return request(token, 'get', null, null, (baseURL || DEFAULT_BASE_URL ) + "wubi/category/list")},

    // 上传词条到服务器
    uploadWordsBatch(token, requestData, baseURL) {return request(token,'post', null, requestData,  (baseURL || DEFAULT_BASE_URL ) + 'wubi/word/add-batch')},

    // DICT
    // 查看当前文件是否存在备份
    checkDictFileBackupExistence(token, requestData, baseURL) {return request(token,'post', null, requestData,  (baseURL || DEFAULT_BASE_URL ) + 'wubi/dict/check-backup-exist')},
    pullDictFileContent(token, params, baseURL) {return request(token,'get', params, null, (baseURL || DEFAULT_BASE_URL ) + 'wubi/dict/pull')},
    pushDictFileContent(token, requestData, baseURL) {return request(token,'put', null, requestData,  (baseURL || DEFAULT_BASE_URL ) + 'wubi/dict/push')},
}
