import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Transfer {
  id: number; reference: string; status: string; created_at: string;
  from_location_name: string; from_warehouse_name: string;
  to_location_name: string; to_warehouse_name: string;
  lines: { id: number; product_name: string; product_sku: string; quantity: number }[] | null;
}
interface Product { id: number; name: string; sku: string; total_stock: number; }
interface Location { id: number; name: string; warehouse_name: string; }

const statusClass: Record<string, string> = { Draft: "status-draft", Waiting: "status-waiting", Ready: "status-ready", Done: "status-done" };

export default function Transfers() {
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc, setToLoc] = useState("");
  const [lines, setLines] = useState([{ product_id: "", quantity: "" }]);

  const fetchData = async () => {
    try {
      const [t, p, l] = await Promise.all([
        api.get<Transfer[]>("/transfers"),
        api.get<Product[]>("/products"),
        api.get<Location[]>("/warehouses/all/locations"),
      ]);
      setTransfers(t); setProducts(p); setLocations(l);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const addLine = () => setLines([...lines, { product_id: "", quantity: "" }]);
  const updateLine = (i: number, f: string, v: string) => { const u = [...lines]; (u[i] as any)[f] = v; setLines(u); };
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const createTransfer = async () => {
    try {
      await api.post("/transfers", {
        from_location_id: parseInt(fromLoc),
        to_location_id: parseInt(toLoc),
        lines: lines.filter(l => l.product_id && l.quantity).map(l => ({
          product_id: parseInt(l.product_id), quantity: parseFloat(l.quantity),
        })),
      });
      toast({ title: "Transfer created" });
      setDialogOpen(false); setFromLoc(""); setToLoc(""); setLines([{ product_id: "", quantity: "" }]);
      fetchData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const validate = async (id: number) => {
    try {
      await api.put(`/transfers/${id}/validate`);
      toast({ title: "Transfer validated – stock moved" });
      fetchData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Internal Transfers</h1>
          <p className="text-sm text-muted-foreground">Move stock between warehouses & locations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Transfer</Button></DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Create Internal Transfer</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>From Location</Label>
                  <Select value={fromLoc} onValueChange={setFromLoc}>
                    <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                    <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.warehouse_name} / {l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>To Location</Label>
                  <Select value={toLoc} onValueChange={setToLoc}>
                    <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                    <SelectContent>{locations.filter(l => String(l.id) !== fromLoc).map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.warehouse_name} / {l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Label className="font-semibold">Items</Label>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_32px] gap-2 items-end">
                  <Select value={line.product_id} onValueChange={(v) => updateLine(i, "product_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" placeholder="Qty" value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} />
                  {lines.length > 1 && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeLine(i)}>×</Button>}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLine}>+ Add Line</Button>
              <Button onClick={createTransfer}>Create Transfer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="data-table">
            <thead>
              <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3 text-right">Total Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => {
                const totalQty = t.lines?.reduce((s, l) => s + Number(l.quantity), 0) || 0;
                return (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{t.reference}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.from_warehouse_name} / {t.from_location_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.to_warehouse_name} / {t.to_location_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.lines?.map(l => l.product_name).join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{totalQty}</td>
                    <td className="px-4 py-3"><span className={`status-badge ${statusClass[t.status]}`}>{t.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{t.status !== "Done" && <Button variant="outline" size="sm" onClick={() => validate(t.id)}>Validate</Button>}</td>
                  </tr>
                );
              })}
              {transfers.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No transfers yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
