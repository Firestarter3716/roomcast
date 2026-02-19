import { isIpInWhitelist } from '@/shared/lib/ip-utils'

describe('isIpInWhitelist', () => {
  it('returns true for empty whitelist (no restriction)', () => {
    expect(isIpInWhitelist('192.168.1.1', [])).toBe(true)
  })

  it('matches an exact IP address', () => {
    expect(isIpInWhitelist('192.168.1.100', ['192.168.1.100'])).toBe(true)
  })

  it('rejects a non-matching exact IP address', () => {
    expect(isIpInWhitelist('192.168.1.101', ['192.168.1.100'])).toBe(false)
  })

  it('matches an IP within a /24 CIDR range', () => {
    expect(isIpInWhitelist('192.168.1.50', ['192.168.1.0/24'])).toBe(true)
    expect(isIpInWhitelist('192.168.1.255', ['192.168.1.0/24'])).toBe(true)
  })

  it('rejects an IP outside a /24 CIDR range', () => {
    expect(isIpInWhitelist('192.168.2.1', ['192.168.1.0/24'])).toBe(false)
    expect(isIpInWhitelist('10.0.0.1', ['192.168.1.0/24'])).toBe(false)
  })

  it('handles /32 CIDR (single host)', () => {
    expect(isIpInWhitelist('10.0.0.1', ['10.0.0.1/32'])).toBe(true)
    expect(isIpInWhitelist('10.0.0.2', ['10.0.0.1/32'])).toBe(false)
  })

  it('handles /0 CIDR (matches everything)', () => {
    expect(isIpInWhitelist('1.2.3.4', ['0.0.0.0/0'])).toBe(true)
    expect(isIpInWhitelist('255.255.255.255', ['0.0.0.0/0'])).toBe(true)
  })

  it('checks multiple entries in whitelist', () => {
    const whitelist = ['10.0.0.1', '192.168.1.0/24', '172.16.0.5']
    expect(isIpInWhitelist('10.0.0.1', whitelist)).toBe(true)
    expect(isIpInWhitelist('192.168.1.42', whitelist)).toBe(true)
    expect(isIpInWhitelist('172.16.0.5', whitelist)).toBe(true)
    expect(isIpInWhitelist('8.8.8.8', whitelist)).toBe(false)
  })

  it('handles invalid IP format gracefully', () => {
    expect(isIpInWhitelist('not-an-ip', ['192.168.1.0/24'])).toBe(false)
    expect(isIpInWhitelist('192.168.1.1', ['bad-cidr/24'])).toBe(false)
    expect(isIpInWhitelist('999.999.999.999', ['192.168.1.0/24'])).toBe(false)
  })

  it('trims whitespace from whitelist entries', () => {
    expect(isIpInWhitelist('192.168.1.1', ['  192.168.1.1  '])).toBe(true)
    expect(isIpInWhitelist('10.0.0.5', ['  10.0.0.0/24  '])).toBe(true)
  })
})
