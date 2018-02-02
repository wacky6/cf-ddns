'use strict'

const CF = 'https://api.cloudflare.com/client/v4'
const superagent = require('superagent-promise')( require('superagent'), Promise )

module.exports = function createAPIEndpoint(key, email, endpoint = CF) {
    return async function API(method, url, op) {
        let resp
        try {
            resp = await op(
                superagent[method.toLowerCase()](`${endpoint}${url}`)
                .set('X-Auth-Key', key)
                .set('X-Auth-Email', email)
            )
            .ok( ({ status }) => status && status !== 500 )
            .timeout(10000)
            .retry(3)
        } catch(e) {
            throw new Error(`fail to reach cloudflare: ${err.message}`)
            return
        }

        const body = resp.body
        if (!body.success) {
            let firstError = body.errors[0]
            let errorMessage = `${firstError.message}, ${firstError.error_chain}`
            throw new Error(`api call fail: ${errorMessage}`)
        }

        return body
    }
}
