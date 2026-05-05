import { useRef } from "react";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import type { MenuItem } from "primereact/menuitem";
import type { AgentRelease } from "../../services/api";

type Props = {
  release: AgentRelease;
  onView: (release: AgentRelease) => void;
  onActivate: (release: AgentRelease) => void;
  onCopyUrl: (release: AgentRelease) => void;
};

export default function AgentReleaseActionsMenu({
  release,
  onView,
  onActivate,
  onCopyUrl,
}: Props) {
  const menu = useRef<Menu>(null);

  const isActive = release.is_active || release.status === "active";
  const releaseUrl = release.download_url || release.file_url;

  const items: MenuItem[] = [
    {
      label: "View details",
      icon: "pi pi-eye",
      command: () => onView(release),
    },
    {
      label: "Copy download URL",
      icon: "pi pi-copy",
      disabled: !releaseUrl,
      command: () => onCopyUrl(release),
    },
    {
      separator: true,
    },
    {
      label: isActive ? "Already active" : "Set as active",
      icon: isActive ? "pi pi-check-circle" : "pi pi-bolt",
      disabled: isActive,
      className: isActive
        ? "release-success-menu-item"
        : "release-warning-menu-item",
      command: () => onActivate(release),
    },
  ];

  return (
    <div className="release-action-menu">
      <Menu model={items} popup ref={menu} className="release-popup-menu" />

      <Button
        type="button"
        icon="pi pi-ellipsis-v"
        text
        rounded
        className="release-action-trigger"
        onClick={(event) => menu.current?.toggle(event)}
        aria-label="Open release actions"
      />
    </div>
  );
}