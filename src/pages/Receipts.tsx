import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Receipt {
  id: number;
  reference: string;
  supplier: string;
  status: string;
  created_at: string;
  lines: { id: number; product_name: string; product_sku: string; quantity: number; location_name: string }[] | null;
}

interface Product { id: number; name: string; sku: string; }
interface Location { id: number; name: string; warehouse_name: string; }

const statusClass: Record<string, string> = { Draft: "status-draft", Waiting: "status-waiting", Ready: "status-ready", Done: "status-done" };

export default function Receipts() {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState("");
  const [lines, setLines] = useState([{ product_id: "", location_id: "", quantity: "" }]);

  const fetchData = async () => {
    try {
      const [r, p, l] = await Promise.all([
        api.get<Receipt[]>("/receipts"),
        api.get<Product[]>("/products"),
        api.get<Location[]>("/warehouses/all/locations"),
      ]);
      setReceipts(r);
      setProducts(p);
      setLocations(l);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const addLine = () => setLines([...lines, { product_id: "", location_id: "", quantity: "" }]);
  const updateLine = (i: number, field: string, value: string) => {
    const updated = [...lines];
    (updated[i] as any)[field] = value;
    setLines(updated);
  };
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const createReceipt = async () => {
    try {
      await api.post("/receipts", {
        supplier,
        lines: lines.filter(l => l.product_id && l.quantity).map(l => ({
          product_id: parseInt(l.product_id),
          location_id: l.location_id ? parseInt(l.location_id) : null,
          quantity: parseFloat(l.quantity),
        })),
      });
      toast({ title: "Receipt created" });
      setDialogOpen(false);
      setSupplier("");
      setLines([{ product_id: "", location_id: "", quantity: "" }]);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const validate = async (id: number) => {
    try {
      await api.put(`/receipts/${id}/validate`);
      toast({ title: "Receipt validated – stock updated" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Receipts</h1>
          <p className="text-sm text-muted-foreground">Incoming goods from vendors</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Receipt</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Create Receipt</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Supplier</Label>
                <Input placeholder="Supplier name" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
              </div>
              <Label className="font-semibold">Items</Label>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 items-end">
                  <Select value={line.product_id} onValueChange={(v) => updateLine(i, "product_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={line.location_id} onValueChange={(v) => updateLine(i, "location_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.warehouse_name} / {l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Qty" value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} />
                  {lines.length > 1 && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeLine(i)}>×</Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLine}>+ Add Line</Button>
              <Button onClick={createReceipt}>Create Receipt</Button>
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
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3 text-right">Total Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => {
                const totalQty = r.lines?.reduce((sum, l) => sum + Number(l.quantity), 0) || 0;
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{r.reference}</td>
                    <td className="px-4 py-3">{r.supplier}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.lines?.map(l => l.product_name).join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-success">+{totalQty}</td>
                    <td className="px-4 py-3"><span className={`status-badge ${statusClass[r.status]}`}>{r.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {r.status !== "Done" && (
                        <Button variant="outline" size="sm" onClick={() => validate(r.id)}>Validate</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
