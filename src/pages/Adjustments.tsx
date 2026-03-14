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

interface Adjustment {
  id: number; reference: string; product_name: string; product_sku: string;
  location_name: string; warehouse_name: string;
  recorded_qty: number; counted_qty: number; status: string; created_at: string;
}
interface Product { id: number; name: string; sku: string; total_stock: number; }
interface Location { id: number; name: string; warehouse_name: string; }

const statusClass: Record<string, string> = { Draft: "status-draft", Done: "status-done" };

export default function Adjustments() {
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ product_id: "", location_id: "", counted_qty: "" });

  const fetchData = async () => {
    try {
      const [a, p, l] = await Promise.all([
        api.get<Adjustment[]>("/adjustments"),
        api.get<Product[]>("/products"),
        api.get<Location[]>("/warehouses/all/locations"),
      ]);
      setAdjustments(a); setProducts(p); setLocations(l);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const createAdjustment = async () => {
    try {
      await api.post("/adjustments", {
        product_id: parseInt(form.product_id),
        location_id: parseInt(form.location_id),
        counted_qty: parseFloat(form.counted_qty),
      });
      toast({ title: "Adjustment created" });
      setDialogOpen(false); setForm({ product_id: "", location_id: "", counted_qty: "" });
      fetchData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const validate = async (id: number) => {
    try {
      await api.put(`/adjustments/${id}/validate`);
      toast({ title: "Adjustment validated – stock updated" });
      fetchData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Stock Adjustments</h1>
          <p className="text-sm text-muted-foreground">Reconcile recorded vs physical stock</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Adjustment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Stock Adjustment</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Product</Label>
                  <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Location</Label>
                  <Select value={form.location_id} onValueChange={(v) => setForm({ ...form, location_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.warehouse_name} / {l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Counted Quantity (Physical Count)</Label>
                <Input type="number" placeholder="Enter physical count" value={form.counted_qty} onChange={(e) => setForm({ ...form, counted_qty: e.target.value })} />
              </div>
              <Button onClick={createAdjustment}>Submit Adjustment</Button>
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
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Recorded</th>
                <th className="px-4 py-3 text-right">Counted</th>
                <th className="px-4 py-3 text-right">Diff</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => {
                const diff = Number(a.counted_qty) - Number(a.recorded_qty);
                return (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{a.reference}</td>
                    <td className="px-4 py-3">{a.product_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.warehouse_name ? `${a.warehouse_name} / ${a.location_name}` : a.location_name}</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(a.recorded_qty)}</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(a.counted_qty)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${diff < 0 ? "text-destructive" : diff > 0 ? "text-success" : ""}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td className="px-4 py-3"><span className={`status-badge ${statusClass[a.status]}`}>{a.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{a.status !== "Done" && <Button variant="outline" size="sm" onClick={() => validate(a.id)}>Validate</Button>}</td>
                  </tr>
                );
              })}
              {adjustments.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No adjustments yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
