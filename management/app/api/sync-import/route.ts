import { importEntriesFromCsv } from "@/lib/actions/import-actions";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await importEntriesFromCsv(body);
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Failed" }), { status: 500 });
  }
}


