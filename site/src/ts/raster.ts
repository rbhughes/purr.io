export interface Raster {
  bottom_lat?: number;
  bottom_lon?: number;
  calib_checksum?: string;
  calib_file_name?: string;
  calib_file_name_lc?: string;
  calib_log_base_depth?: number;
  calib_log_copyright?: string;
  calib_log_date?: string;
  calib_log_depth_type?: string;
  calib_log_depth_unit?: string;
  calib_log_description?: string;
  calib_log_description_lc?: string;
  calib_log_provider?: string;
  calib_log_top_depth?: number;
  calib_log_type?: string;
  calib_log_type_lc?: string;
  calib_orig_fs_path?: string;
  calib_segment_base_depth?: number;
  calib_segment_depth_unit: string;
  calib_segment_name: string;
  calib_segment_num: number;
  calib_segment_scale: string;
  calib_segment_top_depth: number;
  calib_type: string;
  calib_vault_fs_path: string;
  created_at: string;
  loader_name: string;
  pk: string;
  raster_bytes: number;
  raster_checksum: string;
  raster_file_name: string;
  raster_orig_fs_path: string;
  raster_pixel_height: number;
  raster_pixel_width: number;
  raster_vault_fs_path: string;
  sk: string;
  surface_lat: number;
  surface_lon: number;
  updated_at: string;
  uwi: string;
  well_county?: string;
  well_name?: string;
  well_operator?: string;
  well_state?: string;
  well_wsn?: number;
}

export type DT_Raster = {
  sk: string;
  uwi: string;
  calib_file_name?: string;
  raster_file_name?: string;
};

export const dtRasterKeys: Array<keyof DT_Raster> = [
  "sk",
  "uwi",
  "calib_file_name",
  "raster_file_name",
];
