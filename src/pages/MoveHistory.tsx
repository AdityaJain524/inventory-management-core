import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";

interface StockMove {
  id: number; move_type: string; reference_code: string; product_name: string;
  product_sku: string; from_location: string; to_location: string;
  quantity: number; created_at: string;
}

const typeColors: Record<string, string> = {
  Receipt: "status-ready", Transfer: "status-waiting", Delivery: "status-draft", Adjustment: "status-canceled",
};

export default function MoveHistory() {
  const [moves, setMoves] = useState<StockMove[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchMoves = async () => {
    try {
      const params = typeFilter !== "all" ? `?type=${typeFilter}` : "";
      const data = await api.get<StockMove[]>(`/moves${params}`);
      setMoves(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchMoves(); }, [typeFilter]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Move History</h1>
          <p className="text-sm text-muted-foreground">Complete stock movement ledger</p>
        </div>
      </div>

      <div className="mb-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Receipt">Receipts</SelectItem>
            <SelectItem value="Delivery">Deliveries</SelectItem>
            <SelectItem value="Transfer">Transfers</SelectItem>
            <SelectItem value="Adjustment">Adjustments</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="data-table">
            <thead>
              <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium">MOV-{String(m.id).padStart(3, '0')}</td>
                  <td className="px-4 py-3"><span className={`status-badge ${typeColors[m.move_type]}`}>{m.move_type}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{m.reference_code}</td>
                  <td className="px-4 py-3">{m.product_name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{m.from_location || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{m.to_location || "—"}</td>
                  <td className={`px-4 py-3 text-right font-mono ${Number(m.quantity) < 0 ? "text-destructive" : "text-success"}`}>
                    {Number(m.quantity) > 0 ? `+${Number(m.quantity)}` : Number(m.quantity)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {moves.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No stock movements recorded yet. Validate receipts, deliveries, or transfers to see entries here.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
