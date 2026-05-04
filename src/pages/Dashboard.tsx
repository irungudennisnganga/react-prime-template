import { useAppSelector } from "../store/hooks";

export default function Dashboard() {
  const { user, tenant } = useAppSelector((state) => state.auth);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="page-kicker">Overview</p>
          <h1>Good morning, {user?.full_name || user?.email || "User"}</h1>
          <p>
            Stay on top of your infrastructure health, uptime, incidents, and
            traffic.
          </p>
        </div>

        <div className="tenant-pill">
          <i className="pi pi-building" />
          {tenant?.name || "Tenant"}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="metric-card highlight">
          <span>Total Monitors</span>
          <strong>24</strong>
          <small>+8% this month</small>
        </div>

        <div className="metric-card">
          <span>Average Uptime</span>
          <strong>99.98%</strong>
          <small>Healthy infrastructure</small>
        </div>

        <div className="metric-card">
          <span>Active Incidents</span>
          <strong>2</strong>
          <small>Needs attention</small>
        </div>

        <div className="metric-card">
          <span>Response Time</span>
          <strong>184ms</strong>
          <small>Average latency</small>
        </div>
      </div>

      <div className="dashboard-content-grid">
        <section className="panel-card">
          <div className="panel-header">
            <h2>Recent Activities</h2>
            <button>View all</button>
          </div>

          <div className="activity-list">
            <div className="activity-row">
              <i className="pi pi-check-circle success" />
              <div>
                <strong>API Gateway recovered</strong>
                <span>2 minutes ago</span>
              </div>
            </div>

            <div className="activity-row">
              <i className="pi pi-exclamation-triangle warning" />
              <div>
                <strong>High latency detected</strong>
                <span>14 minutes ago</span>
              </div>
            </div>

            <div className="activity-row">
              <i className="pi pi-server" />
              <div>
                <strong>New monitor added</strong>
                <span>1 hour ago</span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-header">
            <h2>Infrastructure Health</h2>
            <button>Details</button>
          </div>

          <div className="health-bars">
            <div>
              <span>API Services</span>
              <div className="bar">
                <div style={{ width: "92%" }} />
              </div>
            </div>

            <div>
              <span>Databases</span>
              <div className="bar">
                <div style={{ width: "86%" }} />
              </div>
            </div>

            <div>
              <span>Background Jobs</span>
              <div className="bar">
                <div style={{ width: "74%" }} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}