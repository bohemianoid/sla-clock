interface Ticket {
  id: number,
  customer: string,
  noSLA: boolean,
  subject: string,
  number: number,
  waitingSince: Date,
  sla: Date
}
