import type { Visit } from "../types";

export const mockVisits: Visit[] = [
  {
    id: "VIS-001",
    date: "2026-10-05",
    time: "08:00",
    applicant: "Carlos Martínez",
    client: "María López",
    address: "Soyapango, San Salvador",
    phone: "7000-0000",
    status: "Confirmada",
    notes: "Llamar antes de llegar.",
  },
  {
    id: "VIS-002",
    date: "2026-10-05",
    time: "10:30",
    applicant: "Ana Hernández",
    client: "José Rivera",
    address: "Ilopango, San Salvador",
    status: "Pendiente",
  },
  {
    id: "VIS-003",
    date: "2026-10-06",
    time: "09:00",
    applicant: "Carlos Martínez",
    client: "Laura Gómez",
    address: "San Martín, San Salvador",
    status: "Realizada",
  },
];
