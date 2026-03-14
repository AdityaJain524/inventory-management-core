import { useState, useEffect } from "react";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ProductReorder {
  id: number;
  name: string;
  sku: string;
  category_name: string;
  total_stock: number;
  reorder_point: number;
  reorder_qty: number;
}

export default function ReorderRules() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductReorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ reorder_point: 0, reorder_qty: 0 });

  const fetchData = async () => {
    try {
      const p = await api.get<ProductReorder[]>("/products/reorder-rules");
      setProducts(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const startEdit = (p: ProductReorder) => {
    setEditingId(p.id);
    setEditForm({ reorder_point: p.reorder_point, reorder_qty: p.reorder_qty });
  };

  const saveRule = async (id: number) => {
    try {
      await api.put(`/products/${id}/reorder`, editForm);
      toast({ title: "Reorder rule updated" });
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
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
          <h1 className="text-2xl font-bold">Reorder Rules</h1>
          <p className="text-sm text-muted-foreground">Manage automatic replenishment thresholds</p>
        </div>
      </div>

      <div className="mt-6">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Current Stock</th>
                    <th className="px-4 py-3 text-right">Reorder Point</th>
                    <th className="px-4 py-3 text-right">Reorder Qty</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-20" />
                        No active reorder rules found. Set reorder points in the Products page.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {Number(p.total_stock)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editingId === p.id ? (
                            <Input 
                              type="number" 
                              className="w-24 ml-auto text-right h-8" 
                              value={editForm.reorder_point}
                              onChange={(e) => setEditForm({ ...editForm, reorder_point: parseInt(e.target.value) || 0 })}
                            />
                          ) : (
                            <span className="font-mono">{p.reorder_point}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editingId === p.id ? (
                            <Input 
                              type="number" 
                              className="w-24 ml-auto text-right h-8" 
                              value={editForm.reorder_qty}
                              onChange={(e) => setEditForm({ ...editForm, reorder_qty: parseInt(e.target.value) || 0 })}
                            />
                          ) : (
                            <span className="font-mono">{p.reorder_qty}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editingId === p.id ? (
                            <Button size="sm" onClick={() => saveRule(p.id)} className="h-8">
                              <Save className="h-4 w-4 mr-2" /> Save
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => startEdit(p)} className="h-8">
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
