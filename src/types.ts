export type VisitStatus = "Pendiente" | "Confirmada" | "Realizada" | "Cancelada";

export interface Visit {
  id: string;
  date: string;
  time: string;
  applicant: string;
  client: string;
  address: string;
  phone?: string;
  status: VisitStatus;
  notes?: string;
}
