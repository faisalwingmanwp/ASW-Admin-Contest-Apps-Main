"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import Papa from "papaparse";
type BootstrapData = {
  competitions: { id: string; name: string }[];
  products: { id: string; name: string }[];
  entryProduct: { id: string } | null;
};

export default function SyncPage() {
  const [file, setFile] = useState<File | null>(null);
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [allowUpdate, setAllowUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [preview, setPreview] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sync-import/bootstrap", { cache: "no-store" });
        const json = await res.json();
        if (json.error) {
          toast.error(json.error);
        } else if (json.data) {
          setBootstrap(json.data);
          setProductId(json.data.entryProduct?.id ?? null);
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to load bootstrap data");
      }
    })();
  }, []);

  async function onSubmit(commit: boolean) {
    if (!competitionId) {
      toast.error("Select a competition");
      return;
    }
    if (!productId) {
      toast.error("Missing ENTRY product");
      return;
    }
    setLoading(true);
    try {
      const csv = await file!.text();
      const resp = await fetch("/api/sync-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv,
          competitionId,
          productId,
          dryRun: !commit || dryRun,
          allowUpdate,
        }),
      });
      const res = await resp.json();
      if (res.error) {
        toast.error(res.error);
        setPreview(null);
      } else {
        if (res.preview) setPreview(res.preview);
        if (res.summary) toast.success(`Imported: ${res.summary.entriesCreated} entries, ${res.summary.contestantsCreated} contestants, ${res.summary.reviewsCreated} reviews`);
      }
    } finally {
      setLoading(false);
    }
  }

  const problemRowFlags = useMemo(() => {
    if (!preview?.rows) return [] as boolean[];
    const flags: boolean[] = [];
    for (const r of preview.rows as Array<any>) {
      const songErrorCount = (r.songs || []).reduce(
        (sum: number, s: any) => sum + (s.errors?.length || 0),
        0
      );
      const hasErrors = (r.errors?.length || 0) > 0 || songErrorCount > 0;
      flags.push(Boolean(hasErrors));
    }
    return flags;
  }, [preview]);

  async function downloadCsv(kind: "problems" | "cleaned") {
    if (!file) {
      toast.error("Upload a CSV first");
      return;
    }
    if (!preview?.rows) {
      toast.error("Run a preview first");
      return;
    }
    try {
      const original = await file.text();
      const parsed = Papa.parse(original.trim(), { header: true, skipEmptyLines: true });
      const rows = Array.isArray(parsed.data) ? (parsed.data as Record<string, unknown>[]) : [];
      const fields = parsed.meta?.fields || (rows[0] ? Object.keys(rows[0]) : []);
      if (!rows.length) {
        toast.error("No rows found in CSV");
        return;
      }
      const filtered: Record<string, unknown>[] = [];
      rows.forEach((row, idx) => {
        const isProblem = problemRowFlags[idx] ?? false;
        if (kind === "problems") {
          if (isProblem) filtered.push(row);
        } else {
          if (!isProblem) filtered.push(row);
        }
      });

      const matrix: any[][] = [fields as any[]];
      for (const r of filtered) {
        matrix.push((fields as string[]).map((f) => (r as any)[f] ?? ""));
      }
      const csvOut = Papa.unparse(matrix, { header: false });
      const blob = new Blob([csvOut], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const base = file.name.replace(/\.csv$/i, "");
      a.href = url;
      a.download = `${base}.${kind}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate CSV");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Sync Data</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Competition</label>
            <Select onValueChange={setCompetitionId} value={competitionId ?? undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Select competition" />
              </SelectTrigger>
              <SelectContent>
                {bootstrap?.competitions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Product</label>
            <Select onValueChange={setProductId} value={productId ?? undefined}>
              <SelectTrigger>
                <SelectValue placeholder="ENTRY product" />
              </SelectTrigger>
              <SelectContent>
                {bootstrap?.products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input id="dry" type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            <label htmlFor="dry" className="font-medium">Dry run</label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="What is dry run?" className="text-gray-500 hover:text-gray-800">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>
                Runs the full import validation and matching without writing to the database. You'll see a preview of entries, contestants, categories, and any errors, but no data is saved.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input id="update" type="checkbox" checked={allowUpdate} onChange={(e) => setAllowUpdate(e.target.checked)} />
            <label htmlFor="update" className="font-medium">Allow updates</label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="What does allow updates do?" className="text-gray-500 hover:text-gray-800">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>
                When a duplicate entry is found (same email + competition + song title), update the existing record instead of skipping. Updates include song title, URL, co-writers, entry category, paid status, created date, and song-category links.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Upload CSV</label>
          <div className="flex items-center gap-2">
            <Input className="max-w-xs" type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button disabled={loading} onClick={() => onSubmit(false)} variant="secondary">Preview</Button>
          </div>
          {file && (
            <p className="text-xs text-muted-foreground">{file.name} ({Math.round(file.size / 1024)} KB)</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button disabled={loading} onClick={() => onSubmit(true)} className="bg-green-600 text-white">Import</Button>
      </div>
      {preview && (
        <div className="mt-6 space-y-6">
          <h2 className="font-medium">Preview</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={!file || !preview?.rows?.length}
              onClick={() => downloadCsv("problems")}
            >
              Download problem rows CSV
            </Button>
            <Button
              variant="secondary"
              disabled={!file || !preview?.rows?.length}
              onClick={() => downloadCsv("cleaned")}
            >
              Download cleaned CSV
            </Button>
          </div>

          {/* Errors table (shown first) */}
          {(() => {
            const errorRows: any[] = [];
            const rows = (preview.rows || []) as Array<any>;
            rows.forEach((r: any, idx: number) => {
              (r.errors || []).forEach((msg: string) => {
                errorRows.push({ scope: "Row", row: idx + 1, email: r.email, message: msg });
              });
              (r.songs || []).forEach((s: any, sidx: number) => {
                (s.errors || []).forEach((msg: string) => {
                  errorRows.push({ scope: `Song ${sidx + 1}`, row: idx + 1, email: r.email, title: s.title, url: s.url, categoriesRaw: s.categoriesRaw, message: msg });
                });
              });
            });
            if (!errorRows.length) return null;
            return (
              <div className="rounded-md border overflow-hidden">
                <div className="bg-red-600 text-white text-sm px-3 py-2">Errors</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errorRows.map((er, i) => (
                      <TableRow key={`${er.row}-${i}`} className="bg-red-50">
                        <TableCell>{er.row}</TableCell>
                        <TableCell>{er.scope}</TableCell>
                        <TableCell>{er.email}</TableCell>
                        <TableCell>{er.title || "—"}</TableCell>
                        <TableCell className="max-w-[320px] truncate" title={er.url}>{er.url || "—"}</TableCell>
                        <TableCell className="max-w-[240px] truncate" title={er.categoriesRaw}>{er.categoriesRaw || "—"}</TableCell>
                        <TableCell className="text-red-700">{er.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })()}

          {/* Main table (after errors) */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Songs</TableHead>
                  <TableHead>Row Errors</TableHead>
                  <TableHead>Song Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(preview.rows || []).map((r: any, idx: number) => {
                  const songErrorCount = (r.songs || []).reduce(
                    (sum: number, s: any) => sum + (s.errors?.length || 0),
                    0
                  );
                  const rowHasErrors = (r.errors?.length || 0) > 0 || songErrorCount > 0;
                  return (
                    <TableRow key={idx} className={rowHasErrors ? "bg-red-50" : undefined}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>{r.username}</TableCell>
                      <TableCell>{r.songs?.length || 0}</TableCell>
                      <TableCell className={r.errors?.length ? "text-red-600" : undefined}>{r.errors?.length || 0}</TableCell>
                      <TableCell className={songErrorCount ? "text-red-600" : undefined}>{songErrorCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}


