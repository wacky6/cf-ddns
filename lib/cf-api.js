'use strict'

const CF = 'https://api.cloudflare.com/client/v4'
const superagent = require('superagent-promise')( require('superagent'), Promise )

module.exports = function APIAuth(key, email) {
    return function API(method, url, op) {
        return new Promise( (resolve, reject) => {
            op(
                superagent[method.toLowerCase()](`${CF}${url}`)
                .set('X-Auth-Key', key)
                .set('X-Auth-Email', email)
            )
            .ok( ({ status }) => status && status !== 500 )
            .then( ({ body }) => {
                if (!body.success) {
                    let firstError = body.errors[0]
                    let errorMessage = `${firstError.message}, ${firstError.error_chain}`
                    return reject(new Error(`api call fail: ${errorMessage}`))
                }
                resolve(body)
            })
            .catch( (err) => reject(new Error(`fail to reach cloudflare: ${errorMessage}`)) )
        })
    }
}
