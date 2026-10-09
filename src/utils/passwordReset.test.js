import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPasswordResetLink, resetTokenFromHash, validateResetPassword } from './passwordReset.js'

test('allows any nonempty matching password without length or character composition rules', () => {
  for (const password of ['1', '1234', 'abc', '한글', '!', ' ', 'a'.repeat(300)]) {
    assert.equal(validateResetPassword(password, password), '')
  }
  assert.ok(validateResetPassword('', ''))
  assert.ok(validateResetPassword('1234', 'different'))
})

test('keeps reset credentials in the fragment, away from server request URLs', () => {
  const token = 'ab'.repeat(32)
  const link = buildPasswordResetLink('https://mast-system.vercel.app', token)
  const url = new URL(link)
  assert.equal(url.pathname, '/reset-password')
  assert.equal(url.search, '')
  assert.equal(resetTokenFromHash(url.hash), token)
  assert.equal(resetTokenFromHash('#token=invalid'), '')
  assert.equal(resetTokenFromHash(''), '')
  assert.throws(() => buildPasswordResetLink(url.origin, 'invalid'))
})
