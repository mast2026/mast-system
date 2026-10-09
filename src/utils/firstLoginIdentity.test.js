import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesFirstLoginIdentity } from '../../supabase/functions/mast-auth/firstLoginIdentity.js'

const member = { id: 1, name: '테스트', school: '인하대학교', generation: 3, phone: '010-1234-5678', password_hash: null, roster_status: 'active' }
const identity = { memberId: 1, name: '테스트', school: '인하대학교', generation: '3', phone: '01012345678' }
test('first login requires the full matching identity and accepts phone formatting', () => {
  assert.equal(matchesFirstLoginIdentity(member, identity), true)
  assert.equal(matchesFirstLoginIdentity(member, { ...identity, phone: '010-1234-5678' }), true)
  for (const change of [{ phone: '5678' }, { phone: '01099995678' }, { school: '다른학교' }, { generation: '2' }, { name: '다른회원' }, { memberId: 2 }]) {
    assert.equal(matchesFirstLoginIdentity(member, { ...identity, ...change }), false)
  }
})
test('existing credentials and excluded accounts cannot enter first login', () => {
  assert.equal(matchesFirstLoginIdentity({ ...member, password_hash: 'existing-hash' }, identity), false)
  assert.equal(matchesFirstLoginIdentity({ ...member, roster_status: 'archived' }, identity), false)
  assert.equal(matchesFirstLoginIdentity(null, identity), false)
})
