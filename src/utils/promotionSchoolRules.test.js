import test from 'node:test'
import assert from 'node:assert/strict'
import { promotionIntervalDays, promotionCopyForSchool, HUFS_REQUIRED_COPY } from './promotionSchoolRules.js'
test('Mirae campus waits fourteen days; other schools keep three', () => {
  for (const school of ['연세대학교 미래캠퍼스', '연세대학교(미래)', '연세대학교 미래']) assert.equal(promotionIntervalDays(school), 14)
  for (const school of ['연세대학교', '한국외국어대학교', '한국외국어대학교(글로벌)', '인하대학교']) assert.equal(promotionIntervalDays(school), 3)
})
test('HUFS copy appends mandatory notice once and leaves other schools unchanged', () => {
  for (const school of ['한국외국어대학교', '한국외국어대학교(글로벌)']) {
    const copy = promotionCopyForSchool('홍보 본문', school)
    assert.equal(copy, '홍보 본문\n\n' + HUFS_REQUIRED_COPY)
    assert.equal(promotionCopyForSchool(copy, school), copy)
  }
  assert.equal(promotionCopyForSchool('홍보 본문', '연세대학교 미래캠퍼스'), '홍보 본문')
})
