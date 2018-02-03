const {promisify} = require('util')
const _ipify = require('ipify')
const ipify = promisify(_ipify)
const parseDomain = require('parse-domain')
const {error, warn, info, verbose} = require('./lib/logger')
const API = require('./lib/cf-api')
const resolve = require('./lib/resolver')
const {floor, max} = Math

module.exports = function CloudflareDDNS({
    key,      // CF API Key
    email,    // CF Email
    host,     // host name
    interval = 120,    // ip addr probe interval,
    endpoint,    // cloudflare v4 endpoint
    logger: {
        error, warn, info, verbose, silly
    }
}) {
    let api = API(key, email, endpoint)
    let curIp = null
    let domain = parseDomain(host)
    if ( ! domain ) {
        error(`unrecognized domain: +${host}`)
        process.exit(1)
        return
    }
    let domainId = `${domain.domain}.${domain.tld}`
    verbose(`top-level domain: ${domainId}`)

    async function intervalFn() {
        let ip,
            type,
            ttl = max(120, interval),
            proxied = false

        // get public ip from ipify
        try {
            ip = await ipify()
            verbose(`  probed: ${ip}`)
            type = ip.indexOf(':') !== -1 ? 'AAAA' : 'A'
        } catch(err) {
            return warn(`fail to get ip: ${err.message}`)
        }

        let currentRecords = await resolve(host)
        let curIp = currentRecords[type] || currentRecords['AAAA'] || currentRecords['A']
        verbose(`resolved: ${curIp}`)

        if (curIp === ip)
            return

        try {
            let body
            // get zone identifier
            body = await api(
                'GET',
                '/zones',
                (req) => req.query({ name: domainId, status: 'active', match: 'all' })
            )

            let zoneId = body.result[0].id
            verbose(`zone id: ${zoneId}`)

            // get record identifier
            body = await api(
                'GET',
                `/zones/${zoneId}/dns_records`,
                (req) => req.query({ name: host })
            )

            let recordId = body.result[0] ? body.result[0].id : null
            let recordAddr = body.result[0] ? body.result[0].content : null
            if (recordId) {
                verbose(`record id: ${recordId}, addr: ${recordAddr}`)
            } else {
                verbose(`no record for host`)
            }

            if (recordAddr !== ip) {
                // update or create DNS record
                body = await api(
                    recordId ? 'PUT' : 'POST',
                    recordId ? `/zones/${zoneId}/dns_records/${recordId}` : `/zones/${zoneId}/dns_records`,
                    (req) => req.send({ type, name: host, content: ip, ttl, proxied: false })
                )
                info(`record updated: ${host} = ${type} ${ip}`)
            } else {
                info(`record matches probed ip, wait for dns propagation`)
            }

        } catch(err) {
            warn(err.stack)
            return warn(err.message)
        }
    }

    let itvl = setInterval(intervalFn, interval * 1000)
    intervalFn()

    return {
        stop() {
            return clearInterval(itvl)
        }
    }
}
