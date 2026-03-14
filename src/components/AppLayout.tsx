import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, BrainCircuit, Package, ClipboardList, ArrowDownToLine, Truck,
  SlidersHorizontal, History, Settings, User, LogOut, ChevronDown,
  ChevronRight, Warehouse, Menu, ArrowLeftRight,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "AI Forecasting", icon: BrainCircuit, path: "/forecasting" },
  {
    label: "Products",
    icon: Package,
    children: [
      { label: "All Products", path: "/products" },
      { label: "Categories", path: "/products/categories" },
      { label: "Reorder Rules", path: "/products/reorder-rules" },
    ],
  },
  {
    label: "Operations",
    icon: ClipboardList,
    children: [
      { label: "Receipts", path: "/operations/receipts", icon: ArrowDownToLine },
      { label: "Delivery Orders", path: "/operations/deliveries", icon: Truck },
      { label: "Internal Transfers", path: "/operations/transfers", icon: ArrowLeftRight },
      { label: "Adjustments", path: "/operations/adjustments", icon: SlidersHorizontal },
    ],
  },
  { label: "Move History", icon: History, path: "/move-history" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Products", "Operations"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path;

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg">
          <Warehouse className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-sidebar-accent-foreground">CoreInventory</h1>
          <p className="text-xs text-sidebar-foreground">Inventory Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) =>
          item.children ? (
            <div key={item.label}>
              <button
                onClick={() => toggleMenu(item.label)}
                className="nav-item w-full justify-between"
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                {expandedMenus.includes(item.label) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {expandedMenus.includes(item.label) && (
                <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                  {item.children.map((child) => (
                    <Link
                      key={child.path}
                      to={child.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`nav-item text-xs ${isActive(child.path) ? "nav-item-active" : ""}`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              key={item.path}
              to={item.path!}
              onClick={() => setSidebarOpen(false)}
              className={`nav-item ${isActive(item.path!) ? "nav-item-active" : ""}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        )}
      </nav>

      {/* Profile */}
      <div className="border-t border-sidebar-border p-3">
        {user && (
          <div className="mb-2 px-3 py-1">
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user.first_name} {user.last_name}</p>
            <p className="text-[10px] text-sidebar-foreground truncate">{user.email}</p>
          </div>
        )}
        <Link to="/profile" className="nav-item" onClick={() => setSidebarOpen(false)}>
          <User className="h-4 w-4" />
          My Profile
        </Link>
        <button className="nav-item w-full text-destructive hover:text-destructive" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 h-full w-60">{sidebar}</aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="flex items-center gap-3 border-b p-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">CoreInventory</span>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
