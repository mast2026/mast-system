export function matchesFirstLoginIdentity(member, input) {
  const compact = (value) => String(value ?? '').replace(/\s/g, '').toLowerCase()
  const digits = (value) => String(value ?? '').replace(/[^0-9]/g, '')
  const phone = digits(input.phone)
  return Boolean(member && member.roster_status === 'active' && !member.password_hash
    && Number(member.id) === Number(input.memberId)
    && String(member.name).trim().toLowerCase() === String(input.name ?? '').trim().toLowerCase()
    && compact(member.school) === compact(input.school)
    && String(member.generation) === digits(input.generation)
    && /^010[0-9]{8}$/.test(phone) && digits(member.phone) === phone)
}
