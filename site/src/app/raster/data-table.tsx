"use client";

import * as React from "react";
import { DT_Raster } from "@/ts/raster";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ChevronDown, Download } from "lucide-react";

//import { AsyncJobButton } from "./async-job-button";

export const makeSortableColumn = (
  colName: keyof DT_Raster,
  colHeader: string,
): ColumnDef<DT_Raster> => {
  return {
    accessorKey: colName,
    header: ({ column }) => (
      <Label
        className="flex items-center cursor-pointer"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span>{colHeader}</span>
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Label>
    ),
    cell: ({ row }) => <div>{row.getValue(colName)}</div>,
    enableHiding: true,
  };
};

const colsVisible: VisibilityState = {
  well_state: false,
  well_county: false,
  well_name: false,
  raster_vault_fs_path: false,
  calib_vault_fs_path: false,
};

const columns: ColumnDef<DT_Raster>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  makeSortableColumn("uwi", "uwi"),
  makeSortableColumn("well_state", "state"),
  makeSortableColumn("well_county", "county"),
  makeSortableColumn("calib_segment_name", "calib_segment_name"),
  makeSortableColumn("calib_segment_top_depth", "top"),
  makeSortableColumn("calib_segment_base_depth", "base"),

  {
    id: "units",
    header: ({ column }) => (
      <Label
        className="flex items-center cursor-pointer"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span>units</span>
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Label>
    ),

    accessorFn: (row) => {
      const cType = row.calib_log_depth_type ?? "";
      const cUnit = row.calib_log_depth_unit ?? "";
      return cType && cUnit ? `${cType}/${cUnit}` : cType || cUnit || "";
    },
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.getValue(columnId) as string;
      const b = rowB.getValue(columnId) as string;
      return a.localeCompare(b);
    },
    cell: ({ row }) => <div>{row.getValue("units")}</div>,
  },

  makeSortableColumn("calib_file_name", "calibration"),
  makeSortableColumn("raster_file_name", "raster"),
  makeSortableColumn("calib_vault_fs_path", "calib_path"),
  makeSortableColumn("raster_vault_fs_path", "raster_path"),
];

//////////////////////////////////////////////////////////////////////////

export default function RasterDataTable({
  data,
  pageSize,
  onLoadMore,
  hasMoreResults,
}: {
  data: DT_Raster[];
  pageSize: number;
  onLoadMore: () => void;
  hasMoreResults: boolean;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(colsVisible);
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState<string>("");

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    //debugTable: true,
    getColumnCanGlobalFilter: (column) => {
      return column.id !== "columnWithNullValues";
    },
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    initialState: { pagination: { pageSize: pageSize } },
  });

  React.useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  if (data.length === 0) {
    return <div>no data. maybe show dynamodb stats</div>;
  }

  return (
    <div className="w-full font-base text-mtext">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter all columns..."
          value={globalFilter ?? ""}
          onChange={(e) => table.setGlobalFilter(String(e.target.value))}
          className="max-w-sm"
        />

        <div className="flex items-center py-4"></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="noShadow" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md">
        <Table className="brute-table">
          <TableHeader className="font-heading">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="brute-white">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-text flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>

        <div className="space-x-2">
          {data.length > 0 && hasMoreResults && (
            <Button
              variant="noShadow"
              size="sm"
              onClick={onLoadMore}
              disabled={!hasMoreResults}
            >
              Load More
            </Button>
          )}

          <Button
            variant="noShadow"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="noShadow"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
      {table.getFilteredSelectedRowModel().rows.length > 0 && (
        <>
          <Button
            className="brute-shadow"
            onClick={() => {
              const selectedRows = table.getSelectedRowModel().rows;
              console.log(selectedRows);
            }}
          >
            <Download />
            Select for Loading
          </Button>
          {/* <AsyncJobButton
            selectedRows={table.getSelectedRowModel().rows}
            onJobComplete={(result) => {
              // Handle completion logic
              table.toggleAllRowsSelected(false);
            }}
          /> */}
        </>
      )}
    </div>
  );
}
