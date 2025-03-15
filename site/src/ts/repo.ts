export interface Repo {
  pk: string;
  sk: string;
  conn: object;
  fs_path: string;
  id: string;
  name: string;
  priority: number;
  display_epsg: number;
  storage_epsg: number;
  suite: string;
  created_at: string;
  updated_at: string;
}
