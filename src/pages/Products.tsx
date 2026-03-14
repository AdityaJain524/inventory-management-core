import { useState, useEffect } from "react";
import { Plus, Search, Loader2, Trash2, Pencil, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV } from "@/lib/utils";
import Papa from "papaparse";

interface Product {
  id: number;
  name: string;
  sku: string;
  category_id: number | null;
  category_name: string;
  uom: string;
  total_stock: number;
  reorder_point: number;
  reorder_qty: number;
}

interface Category { id: number; name: string; }
interface Location { id: number; name: string; warehouse_name: string; }

export default function Products() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", sku: "", category_id: "", uom: "pcs", initial_stock: "", location_id: "", reorder_point: "0", reorder_qty: "0" });
  const [newCat, setNewCat] = useState("");

  const fetchData = async () => {
    try {
      const searchParam = search ? `?search=${encodeURIComponent(search)}${catFilter !== "all" ? `&category_id=${catFilter}` : ""}` : catFilter !== "all" ? `?category_id=${catFilter}` : "";
      const [p, c, l] = await Promise.all([
        api.get<Product[]>(`/products${searchParam}`),
        api.get<Category[]>("/products/categories"),
        api.get<Location[]>("/warehouses/all/locations"),
      ]);
      setProducts(p);
      setCategories(c);
      setLocations(l);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, catFilter]);

  const createProduct = async () => {
    try {
      await api.post("/products", {
        name: form.name,
        sku: form.sku,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        uom: form.uom,
        initial_stock: form.initial_stock ? parseFloat(form.initial_stock) : 0,
        location_id: form.location_id ? parseInt(form.location_id) : null,
        reorder_point: parseInt(form.reorder_point) || 0,
        reorder_qty: parseInt(form.reorder_qty) || 0,
      });
      toast({ title: "Product created" });
      setDialogOpen(false);
      setForm({ name: "", sku: "", category_id: "", uom: "pcs", initial_stock: "", location_id: "", reorder_point: "0", reorder_qty: "0" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    try {
      await api.del(`/products/${id}`);
      toast({ title: "Product deleted" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const addCategory = async () => {
    if (!newCat) return;
    try {
      const cat = await api.post<Category>("/products/categories", { name: newCat });
      setCategories((prev) => [...prev, cat]);
      setNewCat("");
      toast({ title: "Category created" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setLoading(true);
          await api.post("/products/bulk", results.data);
          toast({ title: "Bulk upload successful", description: `Processed ${results.data.length} products.` });
          fetchData();
        } catch (err: any) {
          toast({ title: "Import Failed", description: err.message, variant: "destructive" });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const getStockBadge = (stock: number, reorderPoint: number) => {
    if (stock === 0) return <span className="status-badge status-canceled">Out of Stock</span>;
    if (reorderPoint > 0 && stock <= reorderPoint) return <span className="status-badge status-waiting">Low Stock</span>;
    return <span className="status-badge status-done">In Stock</span>;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} products registered</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(products, "Products")} className="h-9 px-3">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleBulkUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" size="sm" className="h-9 px-3">
              <Upload className="mr-2 h-4 w-4" /> Bulk Import
            </Button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9"><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="p-name">Product Name</Label>
                  <Input id="p-name" placeholder="e.g., Steel Rods" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="p-sku">SKU / Code</Label>
                    <Input id="p-sku" placeholder="STL-001" className="font-mono" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Unit of Measure</Label>
                    <Select value={form.uom} onValueChange={(v) => setForm({ ...form, uom: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="pcs">pcs</SelectItem>
                        <SelectItem value="m">meters</SelectItem>
                        <SelectItem value="sheets">sheets</SelectItem>
                        <SelectItem value="rolls">rolls</SelectItem>
                        <SelectItem value="pairs">pairs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="p-stock">Initial Stock</Label>
                    <Input id="p-stock" type="number" placeholder="0" value={form.initial_stock} onChange={(e) => setForm({ ...form, initial_stock: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Location</Label>
                    <Select value={form.location_id} onValueChange={(v) => setForm({ ...form, location_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.warehouse_name} / {l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Reorder Point</Label>
                    <Input type="number" value={form.reorder_point} onChange={(e) => setForm({ ...form, reorder_point: e.target.value })} />
                  </div>
                </div>
                <Button className="mt-2" onClick={createProduct}>Create Product</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-10">Manage Categories</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Product Categories</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="New category name..." 
                  value={newCat} 
                  onChange={(e) => setNewCat(e.target.value)} 
                />
                <Button onClick={addCategory}>Add</Button>
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted">
                    <tr><th className="px-3 py-2">Name</th></tr>
                  </thead>
                  <tbody>
                    {categories.map(c => (
                      <tr key={c.id} className="border-t">
                        <td className="px-3 py-2">{c.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">UOM</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{p.sku}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category_name || "—"}</td>
                    <td className="px-4 py-3">{p.uom}</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(p.total_stock)}</td>
                    <td className="px-4 py-3">{getStockBadge(Number(p.total_stock), p.reorder_point)}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => deleteProduct(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}