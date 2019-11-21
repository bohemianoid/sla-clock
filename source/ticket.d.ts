interface Ticket {
  id: number,
  customer: string,
  subject: string,
  number: number,
  status: number,
  waitingSince: Date,
  sla: Date
}
