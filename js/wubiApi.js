const request = require('./request')
const {BASE_URL} = require('./Global')

module.exports = {
    updateExtraDict(token) { return request(token, 'post', null, null, BASE_URL + "wubi/word/export-extra")},
    getCategories(token) { return request(token, 'get', null, null, BASE_URL + "wubi/category/list")},
    uploadWordsBatch(token, requestData) {return request(token,'post', null, requestData,  BASE_URL + 'wubi/word/add-batch')},
}
