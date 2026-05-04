import { useRef } from "react";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import type { MenuItem } from "primereact/menuitem";
import { Agent } from "../../services/api";

type AgentActionsMenuProps = {
  agent: Agent;
  onView: (agent: Agent) => void;
};

export default function AgentActionsMenu({
  agent,
  onView,
}: AgentActionsMenuProps) {
  const menu = useRef<Menu>(null);

  const items: MenuItem[] = [
    {
      label: "View details",
      icon: "pi pi-eye",
      command: () => onView(agent),
    },
  ];

  return (
    <div className="agent-action-menu">
      <Menu model={items} popup ref={menu} className="agent-popup-menu" />

      <Button
        type="button"
        icon="pi pi-ellipsis-v"
        text
        rounded
        className="agent-action-trigger"
        onClick={(event) => menu.current?.toggle(event)}
        aria-label="Open agent actions"
      />
    </div>
  );
}