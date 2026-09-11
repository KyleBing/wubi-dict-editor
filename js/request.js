const axios = require('axios')

function normalizeRequestUrl(url) {
    // 服务器已强制 https；避免仍走 http 触发 301
    if (typeof url === 'string' && url.startsWith('http://kylebing.cn/')) {
        return 'https://' + url.slice('http://'.length)
    }
    return url
}

// 从响应头读取续签 JWT，写回 userInfo.token
function applyRenewedToken(userInfo, headers) {
    if (!userInfo || !headers) {
        return
    }
    const raw = headers['x-access-token'] || headers['X-Access-Token']
    const token = Array.isArray(raw) ? raw[0] : raw
    if (typeof token === 'string' && token) {
        userInfo.token = token
    }
}

// portal-go：Authorization: Bearer <jwt>（登录返回 data.token）
function request(userInfo, method, params, requestData, url){
    const finalUrl = normalizeRequestUrl(url)
    const token = userInfo && userInfo.token
    const headers = {}
    if (token) {
        headers.Authorization = `Bearer ${token}`
    }
    return new Promise((resolve, reject) => {
        axios({
            url: finalUrl,
            method,
            headers,
            params,
            data: requestData,
            maxRedirects: 5,
        })
            .then(res => {
                applyRenewedToken(userInfo, res.headers)
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
