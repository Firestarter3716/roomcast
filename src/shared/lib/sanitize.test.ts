import { sanitizeString, sanitizeObject } from '@/shared/lib/sanitize'

describe('sanitizeString', () => {
  it('escapes HTML entities (&, <, >, ", \')', () => {
    expect(sanitizeString('&')).toBe('&amp;')
    expect(sanitizeString('<')).toBe('&lt;')
    expect(sanitizeString('>')).toBe('&gt;')
    expect(sanitizeString('"')).toBe('&quot;')
    expect(sanitizeString("'")).toBe('&#x27;')
    expect(sanitizeString('a & b < c > d " e \' f')).toBe(
      'a &amp; b &lt; c &gt; d &quot; e &#x27; f'
    )
  })

  it('strips HTML tags after escaping', () => {
    const input = '<script>alert("xss")</script>'
    const result = sanitizeString(input)
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('</script>')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })

  it('passes through normal text unchanged', () => {
    expect(sanitizeString('hello world')).toBe('hello world')
    expect(sanitizeString('plain text with numbers 123')).toBe('plain text with numbers 123')
  })

  it('handles empty string', () => {
    expect(sanitizeString('')).toBe('')
  })
})

describe('sanitizeObject', () => {
  it('sanitizes string values in objects', () => {
    const input = { name: '<b>bold</b>', title: 'safe' }
    const result = sanitizeObject(input)
    expect(result.name).toBe('&lt;b&gt;bold&lt;/b&gt;')
    expect(result.title).toBe('safe')
  })

  it('sanitizes nested objects recursively', () => {
    const input = {
      level1: {
        level2: {
          value: '<script>alert("xss")</script>',
        },
      },
    }
    const result = sanitizeObject(input)
    expect(result.level1.level2.value).not.toContain('<script>')
    expect(result.level1.level2.value).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
  })

  it('sanitizes arrays', () => {
    const input = ['<b>one</b>', 'two', '<i>three</i>']
    const result = sanitizeObject(input)
    expect(result[0]).toBe('&lt;b&gt;one&lt;/b&gt;')
    expect(result[1]).toBe('two')
    expect(result[2]).toBe('&lt;i&gt;three&lt;/i&gt;')
  })

  it('passes through numbers and booleans unchanged', () => {
    const input = { count: 42, active: true, ratio: 3.14, disabled: false }
    const result = sanitizeObject(input)
    expect(result.count).toBe(42)
    expect(result.active).toBe(true)
    expect(result.ratio).toBe(3.14)
    expect(result.disabled).toBe(false)
  })

  it('handles null and undefined', () => {
    expect(sanitizeObject(null)).toBeNull()
    expect(sanitizeObject(undefined)).toBeUndefined()

    const input = { a: null, b: undefined, c: 'text' }
    const result = sanitizeObject(input)
    expect(result.a).toBeNull()
    expect(result.b).toBeUndefined()
    expect(result.c).toBe('text')
  })
})
