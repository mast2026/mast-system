import { createClient } from 'npm:@supabase/supabase-js@2.50.0'
const URL = Deno.env.get('SUPABASE_URL')!
const SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})
const fields=['id','mast_member_id','name','school','major','generation','role','is_leader','position_title','admin_sections','roster_status','roster_number','instagram_handle','is_officer']
const safeMember=(m:Record<string,unknown>)=>Object.fromEntries(fields.map(k=>[k,m[k]]))
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(req.method!=='POST')return reply({error:'요청 방식이 올바르지 않습니다.'},405)
 try {
  if(Number(req.headers.get('content-length')||0)>8192)return reply({error:'요청이 너무 큽니다.'},413)
  const text=await req.text();if(text.length>8192)return reply({error:'요청이 너무 큽니다.'},413)
  const b=JSON.parse(text), action=String(b.action||'')
  const db=createClient(URL,SECRET,{auth:{persistSession:false,autoRefreshToken:false}})
  const peer=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'
  const allowed=['lookup','login','admin-login','me','complete-reset','issue-reset','request-reset','first-login']
  if(!allowed.includes(action))return reply({error:'지원하지 않는 요청입니다.'},400)
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(peer)))
  const ipkey=Array.from(digest).map(v=>v.toString(16).padStart(2,'0')).join('')
  const {data:rate,error:rateError}=await db.rpc('mast_check_auth_rate',{p_key:`${action}:${ipkey}`,p_limit:action==='lookup'?60:action==='me'?300:20,p_seconds:600})
  if(rateError)throw rateError
  if(!rate)return reply({error:'시도 횟수가 너무 많습니다. 잠시 후 다시 시도해 주세요.'},429)
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'')||''
  const caller=createClient(URL,ANON,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}})
  let actor:Record<string,any>|null=null
  if(['me','issue-reset'].includes(action)){
   const {data:user,error:uerr}=await caller.auth.getUser(token)
   if(uerr||!user.user)return reply({error:'다시 로그인해 주세요.'},401)
   const {data:mid,error:miderr}=await caller.rpc('mast_current_member_id')
   if(miderr||!mid)return reply({error:'로그인이 만료됐거나 사용할 수 없는 계정입니다.'},401)
   const {data:m,error:merr}=await db.from('team_matching_members').select('*').eq('id',mid).maybeSingle()
   if(merr||!m)return reply({error:'회원을 찾을 수 없습니다.'},401)
   actor=m
  }
  if(action==='me')return reply({member:safeMember(actor!)})
  if(action==='lookup'){
   const name=String(b.name||'').trim()
   if(name.length<2||name.length>40)return reply({members:[]})
   const {data:rows,error}=await db.from('team_matching_members').select('id,name,school,generation,password_hash').eq('roster_status','active').ilike('name',name.replace(/[%_\\]/g,'\\$&')).limit(5)
   if(error)throw error
   return reply({members:(rows||[]).map(m=>({id:m.id,name:m.name,school:m.school,generation:m.generation,has_password:!!m.password_hash}))})
  }
  if(action==='request-reset'){
   const {data,error}=await db.rpc('request_member_password_reset',{p_name:String(b.name||'').trim(),p_school:String(b.school||'').trim(),p_generation:String(b.generation||'').trim(),p_phone:String(b.phone||'').trim()})
   if(error)throw error
   if(data?.error)return reply({error:data.error},400)
   return reply(data)
  }
  if(action==='complete-reset'){
   const {data,error}=await db.rpc('complete_member_password_reset',{p_token:b.token,p_password:b.password})
   if(error)return reply({error:'링크가 만료되었거나 비밀번호 조건에 맞지 않습니다. 운영진에게 새 링크를 요청해 주세요.'},400)
   return reply(data)
  }
  if(action==='issue-reset'){
   if(!['admin','manager','professor'].includes(String(actor!.role)))return reply({error:'전체 관리자만 링크를 발급할 수 있습니다.'},403)
   const {data,error}=await db.rpc('issue_member_password_reset',{p_member_id:Number(b.memberId),p_admin_code:String(b.adminCode||'')})
   if(error)return reply({error:'관리자 코드 또는 회원 정보를 확인해 주세요.'},403)
   return reply(data)
  }
  let member:Record<string,any>|null=null
  if(action==='admin-login'){
   const {data,error}=await db.rpc('verify_admin_code',{p_code:String(b.code||'')})
   if(error||!data)return reply({error:'관리자 코드가 일치하지 않습니다.'},401)
   member=data
  } else {
   const key=String(b.name||'').trim().toLowerCase()
   if(key.length<2||key.length>40)return reply({error:'이름 또는 비밀번호를 확인해 주세요.'},401)
   const {data:accountRate,error}=await db.rpc('mast_check_auth_rate',{p_key:`login-account:${key}`,p_limit:15,p_seconds:600})
   if(error)throw error
   if(!accountRate)return reply({error:'시도 횟수가 너무 많습니다. 잠시 후 다시 시도해 주세요.'},429)
   const {data,error:perr}= action==='first-login'
    ? await db.rpc('mast_initialize_password',{p_name:key,p_school:String(b.school||'').trim(),p_generation:String(b.generation||''),p_phone:String(b.phone||''),p_password:String(b.password||''),p_member_id:Number(b.memberId)})
    : await db.rpc('mast_verify_member_password',{p_name:key,p_password:String(b.password||''),p_member_id:b.memberId?Number(b.memberId):null})
   if(perr||!data)return reply({error:'이름 또는 비밀번호를 확인해 주세요.'},401)
   if(data.error)return reply({error:data.error},400)
   member=data
  }
  if(!member||!['active','system'].includes(member.roster_status))return reply({error:'사용할 수 없는 계정입니다.'},403)
  const email=`mast-member-${member.id}@auth.mast.invalid`
  const ephemeral=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(v=>v.toString(16).padStart(2,'0')).join('')
  const {data:mapping,error:maperr}=await db.from('mast_auth_members').select('auth_user_id').eq('member_id',member.id).maybeSingle()
  if(maperr)throw maperr
  let uid=mapping?.auth_user_id
  if(!uid){
   const {data:created,error}=await db.auth.admin.createUser({email,password:ephemeral,email_confirm:true})
   if(error||!created.user)throw error||new Error('auth creation failed')
   uid=created.user.id
   const {error:linkError}=await db.from('mast_auth_members').insert({auth_user_id:uid,member_id:member.id})
   if(linkError)throw linkError
  } else {
   const {error}=await db.auth.admin.updateUserById(uid,{password:ephemeral})
   if(error)throw error
  }
  const signer=createClient(URL,ANON,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:session,error}=await signer.auth.signInWithPassword({email,password:ephemeral})
  if(error||!session.session)throw error||new Error('session creation failed')
  const claims=JSON.parse(atob(session.session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
  const {error:authorizationError}=await db.from('mast_authorized_sessions').insert({session_id:claims.session_id,auth_user_id:uid,member_id:member.id,password_version:member.credential_version ?? '',admin_code_version:member.code_version ?? null})
  if(authorizationError)throw authorizationError
  return reply({member:safeMember(member),session:{access_token:session.session.access_token,refresh_token:session.session.refresh_token}})
 } catch {
  return reply({error:'요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'},500)
 }
})
