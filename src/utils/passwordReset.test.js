import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPasswordResetLink, resetTokenFromHash, validateResetPassword } from './passwordReset.js'

test('requires a matching password containing letters and numbers within the size limit', () => {
  assert.equal(validateResetPassword('newPass123', 'newPass123'), '')
  for (const password of ['short1', '12345678', 'abcdefgh', 'a1'.repeat(65)]) {
    assert.ok(validateResetPassword(password, password))
  }
  assert.ok(validateResetPassword('newPass123', 'different123'))
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
