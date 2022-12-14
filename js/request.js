const axios = require('axios')

function request(token, method, params, requestData, url){
    return new Promise((resolve, reject) => {
        axios({
            url,
            method,
            headers: {
                'Diary-Token': token
            },
            params,
            data: requestData
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
