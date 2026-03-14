import { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2,
  Package, Info, Loader2, ArrowRight, RefreshCw, BarChart3, SlidersHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from "recharts";

interface ForecastSuggestion {
  id: number;
  name: string;
  sku: string;
  currentStock: number;
  forecastedDailyDemand: number;
  daysUntilStockout: number | null;
  trend: 'Increasing' | 'Decreasing' | 'Stable';
  confidence: number;
  suggestion: 'Reorder Now' | 'Reorder Soon' | 'Maintain' | 'Overstocked';
  suggestedQty: number;
  reason: string;
  recommendations: {
    safetyStock: number;
    reorderPoint: number;
    maxStock: number;
    leadTime: number;
  };
  currentSettings: {
    reorderPoint: number;
    reorderQty: number;
  };
}

interface ProductForecast {
  history: { date: string; quantity: number; type: string }[];
  forecast: { date: string; quantity: number; type: string }[];
}

export default function Forecasting() {
  const [suggestions, setSuggestions] = useState<ForecastSuggestion[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ForecastSuggestion | null>(null);
  const [productForecast, setProductForecast] = useState<ProductForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const data = await api.get<ForecastSuggestion[]>("/forecasts/suggestions");
      setSuggestions(data);
      if (data.length > 0 && !selectedProduct) {
        handleSelectProduct(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = async (product: ForecastSuggestion) => {
    setSelectedProduct(product);
    setLoadingDetail(true);
    try {
      const data = await api.get<ProductForecast>(`/forecasts/${product.id}`);
      setProductForecast(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const getTrendIcon = (trend: string) => {
    if (trend === 'Increasing') return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (trend === 'Decreasing') return <TrendingDown className="h-4 w-4 text-success" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getSuggestionBadge = (suggestion: string) => {
    switch (suggestion) {
      case 'Reorder Now': return <Badge variant="destructive" className="animate-pulse">Reorder Now</Badge>;
      case 'Reorder Soon': return <Badge className="bg-warning hover:bg-warning/80 text-warning-foreground">Reorder Soon</Badge>;
      case 'Overstocked': return <Badge variant="secondary">Overstocked</Badge>;
      default: return <Badge className="bg-success hover:bg-success/80 text-success-foreground">Optimal</Badge>;
    }
  };

  const combinedChartData = productForecast ? [
    ...productForecast.history.map(h => ({ ...h, actual: h.quantity })),
    ...productForecast.forecast.map(f => ({ ...f, predicted: f.quantity }))
  ] : [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">AI Demand Forecasting</h1>
          <p className="text-sm text-muted-foreground">Predictive insights to optimize your inventory levels</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSuggestions} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh Analysis
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Suggestions List */}
        <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Inventory Health</h2>
          {suggestions.map((s) => (
            <Card 
              key={s.id} 
              className={`cursor-pointer transition-all hover:border-primary/50 ${selectedProduct?.id === s.id ? 'border-primary ring-1 ring-primary/20' : ''}`}
              onClick={() => handleSelectProduct(s)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-sm leading-none mb-1">{s.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{s.sku}</p>
                  </div>
                  {getSuggestionBadge(s.suggestion)}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Stock Status</p>
                    <p className="text-sm font-bold">{s.currentStock} {s.currentStock === 1 ? 'unit' : 'units'}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Daily Demand</p>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-bold">~{s.forecastedDailyDemand}</p>
                      {getTrendIcon(s.trend)}
                    </div>
                  </div>
                </div>

                {s.daysUntilStockout !== null && (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <AlertTriangle className={`h-3 w-3 ${s.daysUntilStockout < 7 ? 'text-destructive' : 'text-warning'}`} />
                    <span className={s.daysUntilStockout < 7 ? 'text-destructive font-medium' : 'text-warning font-medium'}>
                      Predicted stockout in {s.daysUntilStockout} days
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right: Detailed Forecast Chart */}
        <div className="lg:col-span-2 space-y-6">
          {selectedProduct ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{selectedProduct.name} Analysis</CardTitle>
                      <CardDescription>Historical consumption vs AI-predicted demand</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Forecast Confidence</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${selectedProduct.confidence > 70 ? 'bg-success' : selectedProduct.confidence > 40 ? 'bg-warning' : 'bg-destructive'}`} 
                            style={{ width: `${selectedProduct.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold">{selectedProduct.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    {loadingDetail ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : productForecast && productForecast.history.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={combinedChartData}>
                          <defs>
                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(168, 76%, 42%)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(168, 76%, 42%)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(215, 20%, 90%)" />
                          <XAxis 
                            dataKey="date" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(str) => {
                              const d = new Date(str);
                              return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            }}
                          />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(214, 20%, 88%)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                          <Area 
                            type="monotone" 
                            dataKey="actual" 
                            name="Actual Consumption" 
                            stroke="hsl(199, 89%, 48%)" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorActual)" 
                            connectNulls
                          />
                          <Area 
                            type="monotone" 
                            dataKey="predicted" 
                            name="Predicted Demand" 
                            stroke="hsl(168, 76%, 42%)" 
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorPredicted)" 
                            connectNulls
                          />
                          <ReferenceLine x={productForecast.history[productForecast.history.length - 1]?.date} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'top', value: 'Today', fontSize: 10, fill: '#64748b' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mb-2 opacity-20" />
                        <p className="text-sm">Insufficient historical data to generate forecast chart.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Suggestions Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={selectedProduct.suggestion.includes('Reorder') ? 'border-warning/30 bg-warning/5' : ''}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" /> Smart Reorder
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-4">{selectedProduct.reason}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground mb-1">Suggested Reorder Qty</p>
                        <p className="text-2xl font-bold">{selectedProduct.suggestedQty || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase text-muted-foreground mb-1">Rec. Reorder Point</p>
                        <p className="text-xl font-bold text-primary">{selectedProduct.recommendations.reorderPoint}</p>
                      </div>
                    </div>
                    {selectedProduct.suggestedQty > 0 && (
                      <Button size="sm" className="w-full mt-4 gap-2">
                        Create Purchase <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" /> Optimal Stock Levels
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-1 border-b border-dashed">
                        <span className="text-xs text-muted-foreground">Safety Stock (Buffer)</span>
                        <span className="text-xs font-mono font-bold">{selectedProduct.recommendations.safetyStock} units</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed">
                        <span className="text-xs text-muted-foreground">Optimal Max Stock</span>
                        <span className="text-xs font-mono font-bold">{selectedProduct.recommendations.maxStock} units</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed">
                        <span className="text-xs text-muted-foreground">Current Lead Time</span>
                        <span className="text-xs font-mono font-bold">{selectedProduct.recommendations.leadTime} days</span>
                      </div>
                      <div className="mt-4 pt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Stock Efficiency</span>
                          <span className="text-[10px] font-bold text-primary">AI TARGET</span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div className="absolute top-0 left-0 h-full bg-success opacity-20 w-full" />
                          <div 
                            className="absolute top-0 h-full bg-primary" 
                            style={{ 
                              left: `${Math.min(95, (selectedProduct.recommendations.reorderPoint / selectedProduct.recommendations.maxStock) * 100)}%`,
                              width: '2px'
                            }} 
                          />
                          <div 
                            className="absolute top-0 h-full bg-foreground" 
                            style={{ 
                              left: `${Math.min(95, (selectedProduct.currentStock / selectedProduct.recommendations.maxStock) * 100)}%`,
                              width: '4px',
                              borderRadius: '2px'
                            }} 
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[9px] text-muted-foreground">0</span>
                          <span className="text-[9px] text-muted-foreground font-bold">Current: {selectedProduct.currentStock}</span>
                          <span className="text-[9px] text-muted-foreground">{selectedProduct.recommendations.maxStock}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-xl">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
                <p className="text-muted-foreground">Select a product to see detailed forecasting data</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
