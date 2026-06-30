// Supabase Edge Function: OneSignal 푸시 자동 발송
// 앱에서 공지/출석/홍보 알림을 만들 때 호출하면 OneSignal로 실제 푸시를 보냅니다.
//
// 배포 후 Secrets 2개 설정:
//   ONESIGNAL_APP_ID       = f2051dff-406b-4693-8f45-67f694fa6fff
//   ONESIGNAL_REST_API_KEY = <OneSignal Settings > Keys & IDs 의 REST API Key>
//
// 호출 바디:
//   { all: true, title, body, url }                // 전체 발송
//   { memberIds: ["12","34"], title, body, url }    // 특정 회원(external_id = 회원 id)

const APP_ID = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
const REST_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!APP_ID || !REST_KEY) return json({ error: "ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY 시크릿 미설정" }, 500);

  try {
    const { memberIds, all, title, body, url } = await req.json();

    const payload: Record<string, unknown> = {
      app_id: APP_ID,
      target_channel: "push",
      headings: { en: title || "MAST 알림", ko: title || "MAST 알림" },
      contents: { en: body || "", ko: body || "" },
    };
    if (url) payload.url = url;

    if (all) {
      payload.included_segments = ["Subscribed Users"];
    } else if (Array.isArray(memberIds) && memberIds.length) {
      payload.include_aliases = { external_id: memberIds.map((x: unknown) => String(x)) };
    } else {
      return json({ error: "발송 대상이 없습니다(all 또는 memberIds 필요)." }, 400);
    }

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Key ${REST_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return json(data, res.ok ? 200 : res.status);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
