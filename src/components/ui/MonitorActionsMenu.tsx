import { useRef } from "react";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import type { MenuItem } from "primereact/menuitem";
import { Monitor } from "../../services/api";

type MonitorActionsMenuProps = {
  monitor: Monitor;
  onView: (monitor: Monitor) => void;
  onEdit: (monitor: Monitor) => void;
  onHistory: (monitor: Monitor) => void;
  onToggleStatus: (monitor: Monitor) => void;
};

function normalizeStatus(status?: string) {
  const value = String(status || "pending").toLowerCase();

  if (value === "up" || value === "active" || value === "online") return "online";
  if (value === "down" || value === "offline") return "offline";
  if (value === "disabled") return "disabled";

  return "pending";
}

export default function MonitorActionsMenu({
  monitor,
  onView,
  onEdit,
  onHistory,
  onToggleStatus,
}: MonitorActionsMenuProps) {
  const menu = useRef<Menu>(null);
  const isDisabled = normalizeStatus(monitor.status) === "disabled";

  const items: MenuItem[] = [
    {
      label: "View target",
      icon: "pi pi-eye",
      command: () => onView(monitor),
    },
    {
      label: "Edit target",
      icon: "pi pi-pencil",
      command: () => onEdit(monitor),
    },
    {
      label: "View history",
      icon: "pi pi-history",
      command: () => onHistory(monitor),
    },
    {
      separator: true,
    },
    {
      label: isDisabled ? "Enable target" : "Disable target",
      icon: isDisabled ? "pi pi-check-circle" : "pi pi-ban",
      className: isDisabled ? "monitor-enable-menu-item" : "monitor-disable-menu-item",
      command: () => onToggleStatus(monitor),
    },
  ];

  return (
    <div className="monitor-action-menu">
      <Menu model={items} popup ref={menu} className="monitor-popup-menu" />

      <Button
        type="button"
        icon="pi pi-ellipsis-v"
        text
        rounded
        className="monitor-action-trigger"
        onClick={(event) => menu.current?.toggle(event)}
        aria-label="Open target actions"
      />
    </div>
  );
}