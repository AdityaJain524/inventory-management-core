import { useState, useEffect } from "react";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: number;
  name: string;
}

export default function Categories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState("");

  const fetchData = async () => {
    try {
      const c = await api.get<Category[]>("/products/categories");
      setCategories(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const deleteCategory = async (id: number) => {
    if (!confirm("Delete this category?")) return;
    try {
      await api.del(`/products/categories/${id}`);
      toast({ title: "Category deleted" });
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
          <h1 className="text-2xl font-bold">Product Categories</h1>
          <p className="text-sm text-muted-foreground">{categories.length} categories defined</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-2">
            <Input 
              placeholder="New category name..." 
              value={newCat} 
              onChange={(e) => setNewCat(e.target.value)}
              className="w-64 h-9"
            />
            <Button size="sm" className="h-9" onClick={addCategory}>
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Category Name</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => deleteCategory(c.id)}>
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
    </div>
  );
}
