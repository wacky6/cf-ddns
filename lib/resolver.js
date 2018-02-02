const {promisify} = require('util')
const {resolve4: _resolve4, resolve6: _resolve6} = require('dns')
const resolve4 = promisify(_resolve4)
const resolve6 = promisify(_resolve6)

module.exports = async function resolve(hostname) {
    const [addr4, addr6] = await Promise.all([
        resolve4(hostname).catch(e => null),
        resolve6(hostname).catch(e => null)
    ])
    return {
        'AAAA': addr6,
        'A': addr4
    }
}