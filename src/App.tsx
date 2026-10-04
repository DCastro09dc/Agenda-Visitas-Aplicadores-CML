import { ChangeEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Search, Upload, X, MapPin, CalendarDays, Users, Wifi, UserRound, Phone, FileSpreadsheet } from "lucide-react";

type Row = Record<string, unknown>;

const value = (row: Row, ...keys: string[]) => {
  for (const key of keys) if (row[key] !== undefined && String(row[key]).trim() !== "") return String(row[key]);
  return "";
};
const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const formatDate = (v: unknown) => {
  if (!v) return "—";
  if (v instanceof Date) return v.toLocaleDateString("es-SV");
  return String(v);
};

function App() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [group, setGroup] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [fileName, setFileName] = useState("");

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const mainSheet = workbook.Sheets["Programación nacional"] ?? workbook.Sheets[workbook.SheetNames[0]];
    const auxSheet = workbook.Sheets["Hoja 1"];
    const main = XLSX.utils.sheet_to_json<Row>(mainSheet, { defval: "" });
    const aux = auxSheet ? XLSX.utils.sheet_to_json<Row>(auxSheet, { defval: "" }) : [];
    const auxMap = new Map(aux.map(r => [value(r, "Unnamed: 0", "Código", "Codigo"), r]));
    setRows(main.map(r => {
      const a = auxMap.get(value(r, "Código", "Codigo")) ?? {};
      return {
        ...r,
        "Aplicador 1": value(a, "Aplicador 1"),
        "Aplicador 2": value(a, "Aplicador 2"),
        "Aplicador 3": value(a, "Aplicador 3"),
        "Director respondió 1° contacto": value(a, "Director respondio 1° contacto"),
        "Director respondió 2° contacto": value(a, "Director respondio 2° contacto"),
        "Director respondió 3° contacto": value(a, "Director respondio 3° contacto"),
        "Intervenida": value(a, "INTERVENIDA"),
        "Difícil acceso (seguimiento)": value(a, "Dificil acceso"),
        "Zona peligrosa": value(a, "Zona Peligrosa"),
        "Conectividad": value(a, "CONECTIVIDAD"),
        "Aplicación en plataforma": value(a, "APLICACION EN PLATAFORMA"),
        "Comentarios": value(a, "COMENTARIOS"),
      };
    }));
    setSelected(null);
  };

  const departments = useMemo(() => [...new Set(rows.map(r => value(r, "Departamento")).filter(Boolean))].sort(), [rows]);
  const groups = useMemo(() => [...new Set(rows.map(r => value(r, "Grupo")).filter(Boolean))].sort(), [rows]);
  const results = useMemo(() => {
    const q = normalize(query.trim());
    return rows.filter(r => {
      const hay = normalize(Object.values(r).map(v => String(v ?? "")).join(" "));
      return (!q || hay.includes(q)) &&
        (!department || value(r, "Departamento") === department) &&
        (!group || value(r, "Grupo") === group);
    });
  }, [rows, query, department, group]);

  const clear = () => { setQuery(""); setDepartment(""); setGroup(""); setSelected(null); };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><div className="eyebrow">CML · APLICADORES</div><h1>Agenda de Visitas</h1><p>Buscador de programación y seguimiento de centros escolares</p></div>
        <label className="upload-button"><Upload size={18}/><span>Cargar Excel</span><input type="file" accept=".xlsx,.xls" onChange={loadFile}/></label>
      </header>

      <main className="content">
        <section className="hero-panel">
          <div className="hero-icon"><FileSpreadsheet/></div>
          <div><h2>{fileName ? "Programación cargada" : "Cargá la programación para comenzar"}</h2>
          <p>{fileName ? <><b>{fileName}</b> · {rows.length.toLocaleString("es-SV")} registros listos para buscar.</> : "El Excel se procesa directamente en este navegador y no se sube a ningún servidor."}</p></div>
        </section>

        {rows.length > 0 && <>
          <section className="search-panel">
            <div className="search-box"><Search size={21}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nombre, código, aplicador, director, municipio…"/>{query && <button onClick={()=>setQuery("")}><X/></button>}</div>
            <select value={department} onChange={e=>setDepartment(e.target.value)}><option value="">Todos los departamentos</option>{departments.map(d=><option key={d}>{d}</option>)}</select>
            <select value={group} onChange={e=>setGroup(e.target.value)}><option value="">Todos los grupos</option>{groups.map(g=><option key={g}>{g}</option>)}</select>
            <button className="clear-button" onClick={clear}>Limpiar</button>
          </section>

          <div className="result-bar"><b>{results.length.toLocaleString("es-SV")}</b> resultado(s){results.length > 150 && " · mostrando los primeros 150"}</div>
          {!selected ? <section className="results">
            {results.slice(0,150).map((r,i)=><button className="result-card" key={i} onClick={()=>setSelected(r)}>
              <div className="result-main"><h3>{value(r,"Centro escolar") || "Sin nombre"}</h3><div className="chips"><span>Código {value(r,"Código")}</span><span>{formatDate(r["Fecha"])}</span><span>{value(r,"Grupo")}</span></div></div>
              <div className="location"><MapPin size={16}/>{value(r,"Municipio")} · {value(r,"Distrito")}</div>
            </button>)}
            {!results.length && <div className="empty">No encontramos coincidencias. Probá con parte del nombre o código.</div>}
          </section> : <Detail row={selected} onBack={()=>setSelected(null)}/>}
        </>}
      </main>
    </div>
  );
}

function Detail({ row, onBack }: { row: Row; onBack: () => void }) {
  const fields = [
    ["Código", value(row,"Código")],["Fecha",formatDate(row["Fecha"])],["Semana",value(row,"Semana")],["Región",value(row,"Región")],
    ["Departamento",value(row,"Departamento")],["Municipio",value(row,"Municipio")],["Distrito",value(row,"Distrito")],["Grupo",value(row,"Grupo")],
    ["Requiere Starlink",value(row,"Requiere Starlink")],["Centro de difícil acceso",value(row,"Centro de difícil acceso")],
    ["Aplicador asignado",value(row,"Aplicador asignado")],["ID aplicador",value(row,"ID")],["Teléfono aplicador",value(row,"Teléfono")],
    ["Vive en",value(row,"Vive en")],["Fuera de su departamento",value(row,"Fuera de su departamento")],
    ["Km línea recta",value(row,"Km (línea recta)")],["Km carretera",value(row,"Km estimados por carretera")],
    ["Starlink del aplicador",value(row,"Starlink del aplicador")],["Director",value(row,"Director")],["Teléfono del director",value(row,"Teléfono del director")],
    ["Matrícula",value(row,"Matrícula")],["Motivo de la fecha",value(row,"Motivo de la fecha")],
    ["Aplicador 1",value(row,"Aplicador 1")],["Aplicador 2",value(row,"Aplicador 2")],["Aplicador 3",value(row,"Aplicador 3")],
    ["Intervenida",value(row,"Intervenida")],["Difícil acceso (seguimiento)",value(row,"Difícil acceso (seguimiento)")],
    ["Zona peligrosa",value(row,"Zona peligrosa")],["Conectividad",value(row,"Conectividad")],["Aplicación en plataforma",value(row,"Aplicación en plataforma")],["Comentarios",value(row,"Comentarios")]
  ];
  return <section className="detail-panel"><button className="back-button" onClick={onBack}>← Volver a resultados</button>
    <div className="detail-title"><div><div className="eyebrow">CENTRO ESCOLAR</div><h2>{value(row,"Centro escolar")}</h2></div><div className="detail-chips"><span><CalendarDays/> {formatDate(row["Fecha"])}</span><span><Users/> {value(row,"Grupo")}</span></div></div>
    <div className="detail-grid">{fields.map(([label,val])=><div className="field" key={label}><b>{label}</b><span>{val || "—"}</span></div>)}</div>
  </section>;
}
export default App;
