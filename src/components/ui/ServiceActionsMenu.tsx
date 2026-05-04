import { useRef } from "react";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import type { MenuItem } from "primereact/menuitem";
import { AgentService } from "../../services/api";

type ServiceActionsMenuProps = {
  service: AgentService;
  onView: (service: AgentService) => void;
  onRestart: (service: AgentService) => void;
  onEnable: (service: AgentService) => void;
  onDisable: (service: AgentService) => void;
};

export default function ServiceActionsMenu({
  service,
  onView,
  onRestart,
  onEnable,
  onDisable,
}: ServiceActionsMenuProps) {
  const menu = useRef<Menu>(null);
  const isEnabled = Boolean(service.enabled);

  const items: MenuItem[] = [
    {
      label: "View details",
      icon: "pi pi-eye",
      command: () => onView(service),
    },
    {
      label: "Restart service",
      icon: "pi pi-refresh",
      command: () => onRestart(service),
    },
    {
      separator: true,
    },
    isEnabled
      ? {
          label: "Disable service",
          icon: "pi pi-ban",
          className: "service-danger-menu-item",
          command: () => onDisable(service),
        }
      : {
          label: "Enable service",
          icon: "pi pi-check-circle",
          className: "service-success-menu-item",
          command: () => onEnable(service),
        },
  ];

  return (
    <div className="service-action-menu">
      <Menu model={items} popup ref={menu} className="service-popup-menu" />

      <Button
        type="button"
        icon="pi pi-ellipsis-v"
        text
        rounded
        className="service-action-trigger"
        onClick={(event) => menu.current?.toggle(event)}
        aria-label="Open service actions"
      />
    </div>
  );
}