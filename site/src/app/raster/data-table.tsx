"use client";

import { Raster, DT_Raster, dtRasterKeys } from "@/ts/raster";

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
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const makeSortableColumn = (
  colName: keyof DT_Raster,
  colHeader: string
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
  makeSortableColumn("calib_segment_name", "curves"),
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

  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const r = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="noShadow" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(r.sk)}
            >
              Copy payment ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View customer</DropdownMenuItem>
            <DropdownMenuItem>View payment details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function DataTableDemo({ data }: { data: DT_Raster[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(colsVisible);
  const [rowSelection, setRowSelection] = React.useState({});

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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full font-base text-mtext">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter uwis..."
          value={(table.getColumn("uwi")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("uwi")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
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
                            header.getContext()
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
                        cell.getContext()
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
    </div>
  );
}
