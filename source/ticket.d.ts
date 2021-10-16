interface Ticket {
  id: number;
  customer: string;
  subject: string;
  number: number;
  status: number;
  tags: string[];
  waitingSince: Date;
  sla: Date;
}
