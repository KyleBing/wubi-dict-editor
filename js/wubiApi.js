const request = require('./request')
const {BASE_URL} = require('./Global')

module.exports = {
    // 下载线上扩展词库内容
    pullExtraDict(token) { return request(token, 'post', null, null, BASE_URL + "wubi/word/export-extra")},

    // 获取线上扩展词库类别
    getCategories(token) { return request(token, 'get', null, null, BASE_URL + "wubi/category/list")},

    // 上传词条到服务器
    uploadWordsBatch(token, requestData) {return request(token,'post', null, requestData,  BASE_URL + 'wubi/word/add-batch')},

    // DICT
    // 查看当前文件是否存在备份
    checkDictFileBackupExistence(token, requestData) {return request(token,'post', null, requestData,  BASE_URL + 'wubi/dict/check-backup-exist')},
    pullDictFileContent(token, params) {return request(token,'get', params, null, BASE_URL + 'wubi/dict/pull')},
    pushDictFileContent(token, requestData) {return request(token,'put', null, requestData,  BASE_URL + 'wubi/dict/push')},
}
