import { originPattern, parseCssUrl, toFileUrl } from './settings'

describe('toFileUrl', () => {
  it('converts absolute POSIX paths', () => {
    expect(toFileUrl('/Users/me/forms/fillout/theme-sfgov.css'))
      .toBe('file:///Users/me/forms/fillout/theme-sfgov.css')
  })

  it('encodes characters that are special in URLs', () => {
    expect(toFileUrl('/tmp/my css/a#b?.css'))
      .toBe('file:///tmp/my%20css/a%23b%3F.css')
  })

  it('converts Windows paths', () => {
    expect(toFileUrl('C:\\Users\\me\\theme.css'))
      .toBe('file:///C:/Users/me/theme.css')
  })

  it('trims whitespace', () => {
    expect(toFileUrl('  /tmp/a.css\n')).toBe('file:///tmp/a.css')
  })

  it.each(['', 'theme.css', './theme.css', '~/theme.css'])(
    'rejects non-absolute path %j',
    (path) => {
      expect(() => toFileUrl(path)).toThrow('absolute')
    },
  )
})

describe('parseCssUrl', () => {
  it('accepts https URLs', () => {
    expect(parseCssUrl('https://example.com/a.css').href).toBe('https://example.com/a.css')
  })

  it.each([
    'http://localhost:8000/a.css',
    'http://127.0.0.1/a.css',
    'http://[::1]:3000/a.css',
  ])('accepts local http URL %s', (value) => {
    expect(() => parseCssUrl(value)).not.toThrow()
  })

  it('rejects remote http URLs', () => {
    expect(() => parseCssUrl('http://example.com/a.css')).toThrow('https')
  })

  it.each(['', 'example.com/a.css', 'file:///tmp/a.css'])('rejects %j', (value) => {
    expect(() => parseCssUrl(value)).toThrow()
  })
})

describe('originPattern', () => {
  it('drops the port and path', () => {
    expect(originPattern(new URL('http://localhost:8000/a.css'))).toBe('http://localhost/*')
    expect(originPattern(new URL('https://example.com/x/a.css'))).toBe('https://example.com/*')
  })
})
