import { useState, useEffect } from "react";
import { Plus, Warehouse as WarehouseIcon, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Warehouse { id: number; name: string; code: string; address: string; location_count: string; }
interface Location { id: number; name: string; warehouse_id: number; }

export default function SettingsPage() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [whDialogOpen, setWhDialogOpen] = useState(false);
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [selectedWh, setSelectedWh] = useState<Warehouse | null>(null);
  const [whLocations, setWhLocations] = useState<Location[]>([]);
  const [whForm, setWhForm] = useState({ name: "", code: "", address: "" });
  const [locName, setLocName] = useState("");

  const fetchWarehouses = async () => {
    try {
      const data = await api.get<Warehouse[]>("/warehouses");
      setWarehouses(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchWarehouses(); }, []);

  const createWarehouse = async () => {
    try {
      await api.post("/warehouses", whForm);
      toast({ title: "Warehouse created" });
      setWhDialogOpen(false); setWhForm({ name: "", code: "", address: "" });
      fetchWarehouses();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const viewLocations = async (wh: Warehouse) => {
    setSelectedWh(wh);
    try {
      const locs = await api.get<Location[]>(`/warehouses/${wh.id}/locations`);
      setWhLocations(locs);
      setLocDialogOpen(true);
    } catch (err) { console.error(err); }
  };

  const addLocation = async () => {
    if (!selectedWh || !locName) return;
    try {
      await api.post(`/warehouses/${selectedWh.id}/locations`, { name: locName });
      toast({ title: "Location added" });
      setLocName("");
      const locs = await api.get<Location[]>(`/warehouses/${selectedWh.id}/locations`);
      setWhLocations(locs);
      fetchWarehouses();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage warehouses and system configuration</p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Warehouses</h2>
        <Dialog open={whDialogOpen} onOpenChange={setWhDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Add Warehouse</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Warehouse</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label>Name</Label><Input placeholder="Warehouse name" value={whForm.name} onChange={(e) => setWhForm({ ...whForm, name: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Code</Label><Input placeholder="WH-XX" className="font-mono" value={whForm.code} onChange={(e) => setWhForm({ ...whForm, code: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Address</Label><Input placeholder="Address" value={whForm.address} onChange={(e) => setWhForm({ ...whForm, address: e.target.value })} /></div>
              <Button onClick={createWarehouse}>Create Warehouse</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((wh) => (
          <Card key={wh.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => viewLocations(wh)}>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <WarehouseIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{wh.name}</CardTitle>
                <p className="font-mono text-xs text-muted-foreground">{wh.code}</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{wh.address || "No address"}</p>
              <p className="mt-2 text-sm"><span className="font-medium">{wh.location_count}</span> storage locations</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Location management dialog */}
      <Dialog open={locDialogOpen} onOpenChange={setLocDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Locations – {selectedWh?.name}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-4">
            {whLocations.map((loc) => (
              <div key={loc.id} className="flex items-center gap-2 rounded-lg border p-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{loc.name}</span>
              </div>
            ))}
            {whLocations.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No locations yet.</p>}
            <div className="flex gap-2 mt-2">
              <Input placeholder="New location name" value={locName} onChange={(e) => setLocName(e.target.value)} />
              <Button onClick={addLocation} disabled={!locName}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
