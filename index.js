const _ipify = require('ipify')
const parseDomain = require('parse-domain')
const {error, warn, info, verbose} = require('./lib/logger')
const koa = require('koa')
const co = require('co')
const API = require('./lib/cf-api')
const {floor, max} = Math

function ipify() {
    return new Promise( (resolve, reject) =>
        _ipify( (err, ip) => err ? reject(err) : resolve(ip) )
    )
}

module.exports = function CloudflareDDNS({
    key,      // CF API Key
    email,    // CF Email
    host,     // host name
    interval = 120,    // ip addr probe interval,
    logger: {
        error, warn, info, verbose, silly
    }
}) {
    let api = API(key, email)
    let curIp = null
    let domain = parseDomain(host)
    if ( ! domain ) {
        error(`unrecognized domain: +${host}`)
        process.exit(1)
        return
    }
    let domainId = `${domain.domain}.${domain.tld}`
    verbose(`top-level domain: ${domainId}`)

    let cbk = () => co(function*(){
        let ip,
            type,
            ttl = max(120, interval),
            proxied = false

        // get public ip from ipify
        try {
            ip = yield ipify()
            verbose(`probed ip: ${ip}`)
            type = ip.indexOf(':') !== -1 ? 'AAAA' : 'A'
        } catch(err) {
            return warn(`fail to get ip: ${err.message}`)
        }

        if (curIp === ip)
            return verbose(`no change in ip`)
        curIp = ip

        try {
            let body
            // get zone identifier
            body = yield api(
                'GET',
                '/zones',
                (req) => req.query({ name: domainId, status: 'active', match: 'all' })
            )

            let zoneId = body.result[0].id
            verbose(`zone id: ${zoneId}`)

            // get record identifier
            body = yield api(
                'GET',
                `/zones/${zoneId}/dns_records`,
                (req) => req.query({ name: host })
            )

            let recordId = body.result[0] ? body.result[0].id : null
            verbose(`record id: ${recordId}`)

            // update or create DNS record
            body = yield api(
                recordId ? 'PUT' : 'POST',
                recordId ? `/zones/${zoneId}/dns_records/${recordId}` : `/zones/${zoneId}/dns_records`,
                (req) => req.send({ type, name: host, content: ip, ttl, proxied: false })
            )

            info(`dns record updated: ${host} = ${type} ${ip}`)

        } catch(err) {
            return warn(err.message)
        }
    })

    let itvl = setInterval(cbk, interval * 1000)
    cbk()

    return {
        stop() {
            return clearInterval(itvl)
        }
    }
}
