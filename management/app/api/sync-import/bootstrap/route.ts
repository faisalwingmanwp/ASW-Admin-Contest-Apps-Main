import { getImportBootstrap } from "@/lib/actions/import-actions";

export async function GET() {
  const result = await getImportBootstrap();
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
}


