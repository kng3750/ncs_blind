import { fetchOrganizations, NcsApiError } from "@/lib/ncs-api";
import { validateQuery } from "@/lib/validation";

export async function GET(request: Request) {
  const validation = validateQuery(new URL(request.url).searchParams);
  if (!validation.ok) {
    return Response.json({ success: false, error: { code: "INVALID_REQUEST", message: validation.message } }, { status: 400 });
  }
  try {
    const data = await fetchOrganizations(validation.value);
    return Response.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = error instanceof NcsApiError;
    const code = known ? error.code : "INTERNAL_ERROR";
    const message = known ? error.message : "정보를 불러오는 중 문제가 발생했습니다.";
    const status = code === "CONFIGURATION_ERROR" ? 503 : 502;
    return Response.json({ success: false, error: { code, message } }, { status });
  }
}
