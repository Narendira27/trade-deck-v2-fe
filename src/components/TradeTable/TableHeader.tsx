import React from "react";
import { type Column } from "./ColumnManager";

interface TableHeaderProps {
  columns: Column[];
}

const TableHeader: React.FC<TableHeaderProps> = ({ columns }) => {
  return (
    <thead className="bg-gray-800 sticky top-0 z-10">
      <tr>
        <th className="px-2 py-2 text-sm font-medium text-left text-gray-300 border-b border-gray-700 w-20">
          Actions
        </th>
        {columns
          .filter((col) => col.visible)
          .map((column) => (
            <th
              key={column.id}
              className="px-2 py-2 text-xs font-medium text-left text-gray-300 border-b border-gray-700"
              style={{ width: column.width }}
            >
              {column.label}
            </th>
          ))}
      </tr>
    </thead>
  );
};

export default TableHeader;
