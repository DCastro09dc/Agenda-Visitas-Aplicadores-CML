import { ChangeEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { CalendarDays, FileSpreadsheet, LogOut, MapPin, Search, Upload, UserRound, X } from "lucide-react";
import { supabase, supabaseConfigured } from "./lib/supabase";

type Row = Record<string, unknown>;
type Profile = { id: string; full_name: string; role: "admin" | "worker"; active: boolean };
type DbRow = {
  id: string;
  aplicador_id: string | null;
  aplicador_nombre: string | null;
  fecha: string | null;
  codigo: string | null;
  centro_escolar: string | null;
  departamento: string | null;
  municipio: string | null;
  distrito: string | null;
  grupo: string | null;
  datos: Row;
};

const value = (row: Row, ...keys: string[]) => {
  for (const key of keys) if (row[key] !== undefined && String(row[key]).trim() !== "") return String(row[key]);
  return "";
};
const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
const formatDate = (v: unknown) => {
  if (!v) return "—";
  if (v instanceof Date) return v.toLocaleDateString("es-SV");
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00") : null;
  return d ? d.toLocaleDateString("es-SV") : s;
};
const toIsoDate = (v: unknown) => {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}` : null;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<DbRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [group, setGroup] = useState("");
  const [selected, setSelected] = useState<DbRow | null>(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); setRows([]); setLoading(false); return; }
    loadProfile(session.user.id);
  }, [session?.user?.id]);

  const loadProfile = async (id: string) => {
    setLoading(true);
    let { data, error } = await supabase.from("profiles").select("id,full_name,role,active").eq("id", id).single();

    // Si la cuenta fue creada con confirmación por correo, el perfil se crea
    // automáticamente en el primer inicio de sesión autenticado.
    if (error && session?.user?.id === id) {
      const fullName = String(session.user.user_metadata?.full_name || "").trim();
      if (fullName) {
        const created = await supabase.from("profiles").insert({
          id,
          full_name: fullName,
          role: "worker",
          active: true
        }).select("id,full_name,role,active").single();
        data = created.data;
        error = created.error;
      }
    }

    if (error || !data) {
      setMessage("Tu usuario existe, pero todavía no tiene perfil en la programación.");
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile(data as Profile);
    if (data.role === "admin") await loadProfiles();
    await loadRows(data as Profile);
    setLoading(false);
  };

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id,full_name,role,active").eq("active", true).order("full_name");
    setProfiles((data ?? []) as Profile[]);
  };

  const loadRows = async (p: Profile | null = profile) => {
    if (!p) return;
    let q = supabase.from("programaciones").select("*").order("fecha", { ascending: true });
    if (p.role !== "admin") q = q.eq("aplicador_id", p.id);
    const { data, error } = await q;
    if (error) setMessage(error.message);
    else setRows((data ?? []) as DbRow[]);
  };

  const parseExcel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || profile?.role !== "admin") return;
    setFileName(file.name); setMessage(""); setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const mainSheet = workbook.Sheets["Programación nacional"] ?? workbook.Sheets[workbook.SheetNames[0]];
      const auxSheet = workbook.Sheets["Hoja 1"];
      const main = XLSX.utils.sheet_to_json<Row>(mainSheet, { defval: "" });
      const aux = auxSheet ? XLSX.utils.sheet_to_json<Row>(auxSheet, { defval: "" }) : [];
      const auxMap = new Map(aux.map(r => [value(r, "Unnamed: 0", "Código", "Codigo"), r]));
      const parsed = main.map(r => {
        const a = auxMap.get(value(r, "Código", "Codigo")) ?? {};
        const merged: Row = {
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
          "Comentarios": value(a, "COMENTARIOS")
        };
        const applicantName = value(merged, "Aplicador asignado", "Aplicador", "Nombre aplicador", "Aplicador 1");
        const match = profiles.find(p => normalize(p.full_name) === normalize(applicantName));
        return {
          import_id: null,
          aplicador_id: match?.id ?? null,
          aplicador_nombre: applicantName || null,
          fecha: toIsoDate(value(merged, "Fecha", "FECHA", "fecha")),
          codigo: value(merged, "Código", "Codigo") || null,
          centro_escolar: value(merged, "Centro escolar") || null,
          departamento: value(merged, "Departamento") || null,
          municipio: value(merged, "Municipio") || null,
          distrito: value(merged, "Distrito") || null,
          grupo: value(merged, "Grupo") || null,
          datos: merged
        };
      });
      const unmatched = [...new Set(parsed.filter(x => x.aplicador_nombre && !x.aplicador_id).map(x => x.aplicador_nombre!))];
      if (unmatched.length) {
        setMessage(`No publiqué el Excel: ${unmatched.length} aplicador(es) no coinciden con usuarios registrados: ${unmatched.slice(0,8).join(", ")}${unmatched.length > 8 ? "…" : ""}`);
        return;
      }
      if (!parsed.length) { setMessage("El Excel no contiene registros."); return; }
      const { data: batch, error: batchError } = await supabase.from("importaciones").insert({ archivo_nombre: file.name, filas: parsed.length, creador_id: profile.id }).select("id").single();
      if (batchError) throw batchError;
      const records = parsed.map(x => ({ ...x, import_id: batch.id }));
      const { error: deleteError } = await supabase.from("programaciones").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (deleteError) throw deleteError;
      for (let i=0; i<records.length; i+=500) {
        const { error } = await supabase.from("programaciones").insert(records.slice(i, i+500));
        if (error) throw error;
      }
      setMessage(`Programación publicada: ${records.length.toLocaleString("es-SV")} registros.`);
      await loadRows(profile);
    } catch (e: any) {
      setMessage(e?.message || "No se pudo importar el Excel.");
    } finally { setImporting(false); event.target.value = ""; }
  };

  const departments = useMemo(() => [...new Set(rows.map(r => r.departamento).filter(Boolean) as string[])].sort(), [rows]);
  const groups = useMemo(() => [...new Set(rows.map(r => r.grupo).filter(Boolean) as string[])].sort(), [rows]);
  const results = useMemo(() => {
    const q = normalize(query);
    return rows.filter(r => {
      const hay = normalize([r.centro_escolar,r.codigo,r.aplicador_nombre,r.departamento,r.municipio,r.distrito,r.grupo,JSON.stringify(r.datos)].join(" "));
      return (!q || hay.includes(q)) && (!department || r.departamento === department) && (!group || r.grupo === group);
    });
  }, [rows, query, department, group]);

  if (!supabaseConfigured) return <SetupScreen />;
  if (!session) return <Login onMessage={setMessage} message={message} />;
  if (loading) return <div className="loading">Cargando tu programación…</div>;
  if (!profile) return <Login onMessage={setMessage} message={message} />;

  const signOut = () => supabase.auth.signOut();

  return <div className="app-shell">
    <header className="topbar">
      <div><div className="eyebrow">CML · APLICADORES</div><h1>Agenda de Visitas</h1><p>{profile.role === "admin" ? "Panel administrativo · programación centralizada" : "Tu programación asignada"}</p></div>
      <div className="header-actions">
        {profile.role === "admin" && <label className="upload-button"><Upload size={18}/><span>{importing ? "Publicando…" : "Cargar Excel"}</span><input type="file" accept=".xlsx,.xls" disabled={importing} onChange={parseExcel}/></label>}
        <button className="logout-button" onClick={signOut}><LogOut size={17}/> Salir</button>
      </div>
    </header>
    <main className="content">
      <section className="hero-panel">
        <div className="hero-icon"><UserRound/></div>
        <div><h2>Hola, {profile.full_name}</h2><p>{profile.role === "admin" ? "Solo vos podés publicar una nueva programación. Al publicarla, se actualiza para todos." : `Tenés ${rows.length.toLocaleString("es-SV")} registro(s) asignado(s).`}</p></div>
      </section>
      {message && <div className="notice">{message}</div>}
      {rows.length > 0 && <>
        <section className="search-panel">
          <div className="search-box"><Search size={21}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar centro, código, municipio, grupo…"/>{query && <button onClick={()=>setQuery("")}><X/></button>}</div>
          <select value={department} onChange={e=>setDepartment(e.target.value)}><option value="">Todos los departamentos</option>{departments.map(d=><option key={d}>{d}</option>)}</select>
          <select value={group} onChange={e=>setGroup(e.target.value)}><option value="">Todos los grupos</option>{groups.map(g=><option key={g}>{g}</option>)}</select>
          <button className="clear-button" onClick={()=>{setQuery("");setDepartment("");setGroup("");setSelected(null)}}>Limpiar</button>
        </section>
        <div className="result-bar"><b>{results.length.toLocaleString("es-SV")}</b> resultado(s)</div>
        {!selected ? <section className="results">{results.slice(0,150).map(r=><button className="result-card" key={r.id} onClick={()=>setSelected(r)}>
          <div className="result-main"><h3>{r.centro_escolar || "Sin nombre"}</h3><div className="chips"><span>Código {r.codigo || "—"}</span><span>{formatDate(r.fecha)}</span><span>{r.grupo || "—"}</span></div></div>
          <div className="location"><MapPin size={16}/>{r.municipio || "—"} · {r.distrito || "—"}</div>
        </button>)}{!results.length && <div className="empty">No encontramos coincidencias.</div>}</section>
        : <Detail row={selected} onBack={()=>setSelected(null)}/>}
      </>}
      {!rows.length && <div className="empty">Todavía no hay programación publicada para este usuario.</div>}
    </main>
  </div>;
}

function Login({ onMessage, message }: { onMessage: (s:string)=>void; message:string }) {
  const [register,setRegister]=useState(false);
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [busy,setBusy]=useState(false);
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setBusy(true); onMessage("");
    if (register) {
      if (password.length < 6) { onMessage("La contraseña debe tener al menos 6 caracteres."); setBusy(false); return; }
      const {data,error}=await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim() } }
      });
      if (error) onMessage(error.message);
      else if (data.user) {
        if (data.session) {
          const {error: profileError}=await supabase.from("profiles").insert({
            id:data.user.id,
            full_name:name.trim(),
            role:"worker",
            active:true
          });
          if (profileError) onMessage(profileError.message);
          else {
            onMessage("Cuenta creada. Ya podés entrar.");
            setRegister(false);
          }
        } else {
          onMessage("Cuenta creada. Revisá tu correo para confirmar la cuenta y luego ingresá.");
        }
      }
    } else {
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error)onMessage(error.message);
    }
    setBusy(false);
  };
  return <div className="auth-shell"><form className="auth-card" onSubmit={submit}>
    <div className="hero-icon"><UserRound/></div><div className="eyebrow">CML · APLICADORES</div>
    <h1>{register?"Crear mi cuenta":"Ingresá a tu agenda"}</h1>
    <p>{register?"Creá tu cuenta gratis. Tu acceso quedará como aplicador y solo verás tu programación.":"Ingresá con tu correo y contraseña."}</p>
    {register&&<input type="text" required minLength={2} placeholder="Nombre completo" value={name} onChange={e=>setName(e.target.value)}/>}
    <input type="email" required placeholder="Correo electrónico" value={email} onChange={e=>setEmail(e.target.value)}/>
    <input type="password" required minLength={6} placeholder="Contraseña (mínimo 6 caracteres)" value={password} onChange={e=>setPassword(e.target.value)}/>
    <button className="primary-button" disabled={busy}>{busy?(register?"Creando…":"Ingresando…"):(register?"Crear cuenta":"Ingresar")}</button>
    <button type="button" className="clear-button" onClick={()=>{setRegister(!register);onMessage("")}}>{register?"Ya tengo cuenta":"Crear una cuenta"}</button>
    {message&&<div className="notice">{message}</div>}
  </form></div>;
}

function SetupScreen(){return <div className="auth-shell"><div className="auth-card"><div className="hero-icon"><FileSpreadsheet/></div><div className="eyebrow">CML · CONFIGURACIÓN</div><h1>Falta conectar la base de datos</h1><p>Esta versión ya está preparada para Supabase. Hay que colocar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el entorno de publicación.</p></div></div>}

function Detail({row,onBack}:{row:DbRow;onBack:()=>void}){
  const data=row.datos||{};
  const fields=[["Código",row.codigo],["Fecha",formatDate(row.fecha)],["Semana",value(data,"Semana")],["Región",value(data,"Región")],["Departamento",row.departamento],["Municipio",row.municipio],["Distrito",row.distrito],["Grupo",row.grupo],["Aplicador asignado",row.aplicador_nombre],["ID aplicador",value(data,"ID")],["Teléfono aplicador",value(data,"Teléfono")],["Vive en",value(data,"Vive en")],["Km línea recta",value(data,"Km (línea recta)")],["Km carretera",value(data,"Km estimados por carretera")],["Director",value(data,"Director")],["Teléfono del director",value(data,"Teléfono del director")],["Matrícula",value(data,"Matrícula")],["Motivo de la fecha",value(data,"Motivo de la fecha")],["Aplicador 1",value(data,"Aplicador 1")],["Aplicador 2",value(data,"Aplicador 2")],["Aplicador 3",value(data,"Aplicador 3")],["Intervenida",value(data,"Intervenida")],["Difícil acceso (seguimiento)",value(data,"Difícil acceso (seguimiento)")],["Zona peligrosa",value(data,"Zona peligrosa")],["Conectividad",value(data,"Conectividad")],["Aplicación en plataforma",value(data,"Aplicación en plataforma")],["Comentarios",value(data,"Comentarios")]];
  return <section className="detail-panel"><button className="back-button" onClick={onBack}>← Volver</button><div className="detail-title"><div><div className="eyebrow">CENTRO ESCOLAR</div><h2>{row.centro_escolar||"Sin nombre"}</h2></div><div className="detail-chips"><span><CalendarDays/> {formatDate(row.fecha)}</span><span>{row.grupo||"—"}</span></div></div><div className="detail-grid">{fields.map(([label,val])=><div className="field" key={label}><b>{label}</b><span>{val||"—"}</span></div>)}</div></section>
}
export default App;
