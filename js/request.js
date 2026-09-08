const axios = require('axios')

function normalizeRequestUrl(url) {
    // 服务器已强制 https；避免仍走 http 触发 301
    if (typeof url === 'string' && url.startsWith('http://kylebing.cn/')) {
        return 'https://' + url.slice('http://'.length)
    }
    return url
}

function request(userInfo, method, params, requestData, url){
    const finalUrl = normalizeRequestUrl(url)
    return new Promise((resolve, reject) => {
        axios({
            url: finalUrl,
            method,
            headers: {
                'Diary-Token': userInfo.password,
                'Diary-Uid': userInfo.uid
            },
            params,
            data: requestData,
            maxRedirects: 5,
        })
            .then(res => {
                if (res.data.success){
                    resolve(res.data)
                } else {
                    reject(res.data)
                }
            })
            .catch(err => {
                reject(err)
            })
    })
}


module.exports = request
