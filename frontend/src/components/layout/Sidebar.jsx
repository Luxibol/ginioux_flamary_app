import { LayoutDashboard, ClipboardList, Truck, Paperclip, History } from "lucide-react";

const menuItems = [
  { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { key: "orders", label: "Commandes en cours", icon: ClipboardList },
  { key: "shipments", label: "Expéditions", icon: Truck },
  { key: "import", label: "Import PDF", icon: Paperclip },
  { key: "history", label: "Historique", icon: History },
];

function Sidebar() {
  const activeKey = "orders";

  return (
    <aside className="w-64 border-r border-gf-border bg-gf-surface flex flex-col">
      <nav className="flex-1 p-3 pt-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = item.key === activeKey;
            const Icon = item.icon;

            return (
              <li key={item.key}>
                <button
                  type="button"
                  className={[
                    "relative w-full h-11 px-3 rounded-xl text-left",
                    "flex items-center gap-3",
                    "text-sm",
                    "hover:bg-gf-orange/10",
                    isActive
                      ? "bg-gf-orange/15 text-gf-orange font-medium"
                      : "text-gf-text",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>

                  {isActive && (
                    <span className="absolute right-0 top-2 bottom-2 w-1 rounded-l bg-gf-orange" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
