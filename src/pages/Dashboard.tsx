import { useState, useEffect } from "react";
import {
  Package, AlertTriangle, ArrowDownToLine, Truck, ArrowLeftRight,
  TrendingUp, TrendingDown, Loader2, Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface KPIs {
  total_products: number;
  low_stock: number;
  out_of_stock: number;
  pending_receipts: number;
  pending_deliveries: number;
  pending_transfers: number;
}

interface Operation {
  id: string;
  type: string;
  party: string;
  product: string;
  qty: number;
  status: string;
  date: string;
}

interface LowStockProduct {
  id: number;
  name: string;
  sku: string;
  total_stock: number;
  reorder_point: number;
  reorder_qty: number;
}

const statusClass: Record<string, string> = {
  Draft: "status-draft",
  Waiting: "status-waiting",
  Ready: "status-ready",
  Done: "status-done",
  Canceled: "status-canceled",
};

export default function Dashboard() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [docFilter, setDocFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [k, ops, ls] = await Promise.all([
        api.get<KPIs>("/dashboard/kpis"),
        api.get<Operation[]>(`/dashboard/recent-operations?type=${docFilter}&status=${statusFilter}`),
        api.get<LowStockProduct[]>("/dashboard/low-stock"),
      ]);
      setKpis(k);
      setOperations(ops);
      setLowStock(ls);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [docFilter, statusFilter]);

  const kpiCards = kpis ? [
    { label: "Total Products", value: kpis.total_products, icon: Package, color: "text-primary" },
    { label: "Low / Out of Stock", value: kpis.low_stock + kpis.out_of_stock, icon: AlertTriangle, color: "text-warning" },
    { label: "Pending Receipts", value: kpis.pending_receipts, icon: ArrowDownToLine, color: "text-info" },
    { label: "Pending Deliveries", value: kpis.pending_deliveries, icon: Truck, color: "text-accent" },
    { label: "Scheduled Transfers", value: kpis.pending_transfers, icon: ArrowLeftRight, color: "text-success" },
  ] : [];

  const chartData = kpis ? [
    { name: "Products", value: kpis.total_products, fill: "hsl(199, 89%, 48%)" },
    { name: "Low Stock", value: kpis.low_stock + kpis.out_of_stock, fill: "hsl(38, 92%, 50%)" },
    { name: "Receipts", value: kpis.pending_receipts, fill: "hsl(160, 84%, 39%)" },
    { name: "Deliveries", value: kpis.pending_deliveries, fill: "hsl(168, 76%, 42%)" },
    { name: "Transfers", value: kpis.pending_transfers, fill: "hsl(215, 28%, 50%)" },
  ] : [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time inventory overview</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="kpi-card group">
            <div className="flex items-center justify-between">
              <kpi.icon className={`h-5 w-5 ${kpi.color} transition-transform group-hover:scale-110`} />
            </div>
            <p className="mt-3 text-2xl font-bold">{kpi.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Chart + Low Stock */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inventory Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 88%)" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {lowStock.length > 0 && (
          <Card className="border-warning/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-warning" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lowStock.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono font-bold ${Number(p.total_stock) === 0 ? "text-destructive" : "text-warning"}`}>
                      {Number(p.total_stock)} left
                    </p>
                    <p className="text-[10px] text-muted-foreground">Reorder at {p.reorder_point}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select value={docFilter} onValueChange={setDocFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Document Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Receipt">Receipts</SelectItem>
            <SelectItem value="Delivery">Deliveries</SelectItem>
            <SelectItem value="Transfer">Transfers</SelectItem>
            <SelectItem value="Adjustment">Adjustments</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Waiting">Waiting</SelectItem>
            <SelectItem value="Ready">Ready</SelectItem>
            <SelectItem value="Done">Done</SelectItem>
            <SelectItem value="Canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recent Operations Table */}
      <Card className="mt-4">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op, i) => (
                  <tr key={`${op.id}-${i}`} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{op.id}</td>
                    <td className="px-4 py-3">{op.type}</td>
                    <td className="px-4 py-3">{op.product || "—"}</td>
                    <td className={`px-4 py-3 text-right font-mono ${Number(op.qty) < 0 ? "text-destructive" : "text-success"}`}>
                      {Number(op.qty) > 0 ? `+${Number(op.qty)}` : Number(op.qty)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-badge ${statusClass[op.status] || ""}`}>{op.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(op.date).toLocaleDateString()}</td>
                  </tr>
                ))}
                {operations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No operations match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
