export interface Job {
  id?: string;
  ttl: number;
  items?: any[];
  directive: string;
  status: string;
  body?: string;
}
