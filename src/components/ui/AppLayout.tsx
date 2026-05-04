import { Outlet } from "react-router-dom";
import SideBar from "./SideBar";
import { useAppSelector } from "../../store/hooks";

export default function AppLayout() {
  const { mode } = useAppSelector((state) => state.theme);

  return (
    <div className={`app-shell ${mode}`}>
      <SideBar />

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}