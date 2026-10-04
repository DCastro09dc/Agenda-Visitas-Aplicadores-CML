import { CalendarDays, ClipboardList, MapPinned, Users } from "lucide-react";
import { mockVisits } from "./data/mockVisits";

const statusClass: Record<string, string> = {
  Pendiente: "status pending",
  Confirmada: "status confirmed",
  Realizada: "status completed",
  Cancelada: "status cancelled",
};

function App() {
  const pending = mockVisits.filter((visit) => visit.status === "Pendiente").length;
  const confirmed = mockVisits.filter((visit) => visit.status === "Confirmada").length;
  const completed = mockVisits.filter((visit) => visit.status === "Realizada").length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">CML</p>
          <h1>Agenda de Visitas</h1>
          <p className="subtitle">Control de visitas de aplicadores</p>
        </div>
        <button className="primary-button">
          <CalendarDays size={18} />
          Nueva visita
        </button>
      </header>

      <main className="content">
        <section className="stats-grid" aria-label="Resumen">
          <article className="stat-card">
            <ClipboardList />
            <div><span>Total</span><strong>{mockVisits.length}</strong></div>
          </article>
          <article className="stat-card">
            <CalendarDays />
            <div><span>Pendientes</span><strong>{pending}</strong></div>
          </article>
          <article className="stat-card">
            <Users />
            <div><span>Confirmadas</span><strong>{confirmed}</strong></div>
          </article>
          <article className="stat-card">
            <MapPinned />
            <div><span>Realizadas</span><strong>{completed}</strong></div>
          </article>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Próximas visitas</h2>
              <p>Base inicial para la agenda y seguimiento.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Aplicador</th>
                  <th>Cliente</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {mockVisits.map((visit) => (
                  <tr key={visit.id}>
                    <td>{visit.date}</td>
                    <td>{visit.time}</td>
                    <td>{visit.applicant}</td>
                    <td>{visit.client}</td>
                    <td>{visit.address}</td>
                    <td><span className={statusClass[visit.status]}>{visit.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
