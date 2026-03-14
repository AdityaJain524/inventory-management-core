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

interface Delivery {
  id: number; reference: string; customer: string; status: string; created_at: string;
  lines: { id: number; product_name: string; quantity: number; location_name: string }[] | null;
}
interface Product { id: number; name: string; sku: string; total_stock: number; }
interface Location { id: number; name: string; warehouse_name: string; }

const statusClass: Record<string, string> = { Draft: "status-draft", Waiting: "status-waiting", Ready: "status-ready", Done: "status-done", Canceled: "status-canceled" };

export default function Deliveries() {
  const { toast } = useToast();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState([{ product_id: "", location_id: "", quantity: "" }]);

  const fetchData = async () => {
    try {
      const [d, p, l] = await Promise.all([
        api.get<Delivery[]>("/deliveries"),
        api.get<Product[]>("/products"),
        api.get<Location[]>("/warehouses/all/locations"),
      ]);
      setDeliveries(d); setProducts(p); setLocations(l);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const addLine = () => setLines([...lines, { product_id: "", location_id: "", quantity: "" }]);
  const updateLine = (i: number, f: string, v: string) => { const u = [...lines]; (u[i] as any)[f] = v; setLines(u); };
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const createDelivery = async () => {
    try {
      await api.post("/deliveries", {
        customer,
        lines: lines.filter(l => l.product_id && l.quantity).map(l => ({
          product_id: parseInt(l.product_id), location_id: l.location_id ? parseInt(l.location_id) : null, quantity: parseFloat(l.quantity),
        })),
      });
      toast({ title: "Delivery order created" });
      setDialogOpen(false); setCustomer(""); setLines([{ product_id: "", location_id: "", quantity: "" }]);
      fetchData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const validate = async (id: number) => {
    try {
      await api.put(`/deliveries/${id}/validate`);
      toast({ title: "Delivery validated – stock reduced" });
      fetchData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Delivery Orders</h1>
          <p className="text-sm text-muted-foreground">Outgoing stock for customer shipment</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Delivery</Button></DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Create Delivery Order</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label>Customer</Label><Input placeholder="Customer name" value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
              <Label className="font-semibold">Items</Label>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 items-end">
                  <Select value={line.product_id} onValueChange={(v) => updateLine(i, "product_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name} ({Number(p.total_stock)})</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={line.location_id} onValueChange={(v) => updateLine(i, "location_id", v)}>
                    <SelectTrigger><SelectValue placeholder="From location" /></SelectTrigger>
                    <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.warehouse_name} / {l.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" placeholder="Qty" value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} />
                  {lines.length > 1 && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeLine(i)}>×</Button>}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLine}>+ Add Line</Button>
              <Button onClick={createDelivery}>Create Delivery</Button>
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
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3 text-right">Total Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => {
                const totalQty = d.lines?.reduce((s, l) => s + Number(l.quantity), 0) || 0;
                return (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{d.reference}</td>
                    <td className="px-4 py-3">{d.customer}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{d.lines?.map(l => l.product_name).join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-destructive">-{totalQty}</td>
                    <td className="px-4 py-3"><span className={`status-badge ${statusClass[d.status]}`}>{d.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{d.status !== "Done" && d.status !== "Canceled" && <Button variant="outline" size="sm" onClick={() => validate(d.id)}>Validate</Button>}</td>
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
