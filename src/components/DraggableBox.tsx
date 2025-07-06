import React, { useState, useRef, useEffect } from "react";
import { Minus, Trash2 } from "lucide-react";
import useStore from "../store/store";
import { type DraggableBoxColumn } from "../types/draggableBox";

interface DraggableBoxProps {
  columns: DraggableBoxColumn[];
}

const DraggableBox: React.FC<DraggableBoxProps> = ({ columns }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  const { showDraggable, setShowDraggable } = useStore();

  const handleMouseDown = (e: React.MouseEvent) => {
    if (boxRef.current) {
      const rect = boxRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return showDraggable === true ? (
    <div
      ref={boxRef}
      className={`absolute z-50 bg-gray-900 p-4 rounded-lg shadow-lg border border-gray-700 cursor-move select-none
        ${isDragging ? "opacity-90" : ""}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: "auto",
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="space-x-2 flex w-full h-full flex-row justify-end items-center cursor-pointer mb-2">
        <button
          onClick={setShowDraggable}
          className="text-gray-400 hover:text-white"
        >
          <Minus size={20} />
        </button>
      </div>
      <ExcelLikeBox columns={columns} />
    </div>
  ) : null;
};

const ExcelLikeBox = ({ columns }: { columns: DraggableBoxColumn[] }) => {
  const { draggableData, updateDraggableData, removeDraggableData } =
    useStore();

  const onChangeValue = (
    id: string,
    value: { myValue1?: string; myValue2?: string }
  ) => {
    updateDraggableData(id, value);
  };

  const onDelete = (id: string) => {
    removeDraggableData(id);
  };

  const getCellValue = (columnId: string, data: any) => {
    switch (columnId) {
      case "index":
        return (
          <td className="px-2 py-2 text-center text-wrap text-xs text-white">
            {data.index} {" - "} {data.expiry} {" - "} {data.ltpRange}
          </td>
        );
      case "lowestValue":
        return (
          <td className="px-2 py-2 text-center text-wrap text-xs text-white">
            {data.lowestValue || 0}
          </td>
        );
      case "myValue1":
        return (
          <td className="px-2 py-2 text-center text-wrap">
            <input
              value={data.myValue1}
              onChange={(e) =>
                onChangeValue(data.id, { myValue1: e.target.value })
              }
              className="w-12 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </td>
        );
      case "result1":
        return (
          <td className="px-2 py-2 text-center text-wrap text-xs">
            {parseInt(data.lowestValue || 0) - parseInt(data.myValue1 || 0)}
          </td>
        );
      case "myValue2":
        return (
          <td className="px-2 py-2 text-center text-wrap">
            <input
              value={data.myValue2}
              className="w-12 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
              onChange={(e) =>
                onChangeValue(data.id, { myValue2: e.target.value })
              }
            />
          </td>
        );
      case "result2":
        return (
          <td className="px-2 py-2 text-center text-wrap text-xs">
            {parseInt(data.lowestValue || 0) - parseInt(data.myValue2 || 0)}
          </td>
        );
      case "action":
        return (
          <td className="px-2 py-2 text-center cursor-pointer text-wrap text-xs">
            <button
              onClick={() => {
                onDelete(data.id);
              }}
              className="cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          </td>
        );
      default:
        return <td className="px-2 py-2 text-center text-xs">-</td>;
    }
  };

  const visibleColumns = columns.filter((col) => col.visible);

  return (
    <div className="overflow-x-auto shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-600">
        <thead className="bg-gray-800">
          <tr>
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className="px-2 py-2 text-left text-xs font-medium text-wrap text-white"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-gray-900 divide-y divide-gray-600">
          {draggableData.length > 0 &&
            draggableData.map((each) => (
              <tr key={each.id} className="hover:bg-gray-800">
                {visibleColumns.map((column) => (
                  <React.Fragment key={column.id}>
                    {getCellValue(column.id, each)}
                  </React.Fragment>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default DraggableBox;