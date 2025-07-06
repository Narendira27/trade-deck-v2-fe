import React, { useEffect, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { formatCurrency, formatNumber } from "../../utils/formatters";
import axios from "axios";
import { API_URL } from "../../config/config";
import { toast } from "sonner";
import cookies from "js-cookie";
import useStore from "../../store/store";

interface Position {
  id: string;
  optionName: string;
  price: number;
  mtm: number;
  quantity: number;
  entrySide: "SELL" | "BUY";
  type: "CE" | "PE";
}

const PositionTracker: React.FC = () => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Position;
    direction: "asc" | "desc";
  } | null>(null);

  // Mock data - replace with real data from your store
  const [positions, setPositions] = useState<Position[]>([]);

  // {
  //   id: "5",
  //   optionName: "FINNIFTY 23500 CE",
  //   price: 78.9,
  //   mtm: 560,
  //   quantity: 40,
  //   type: "CE",
  // }

  const { trades, optionPrice, optionLotSize } = useStore();

  useEffect(() => {
    const getPositions = trades.flatMap((each) =>
      each.liveTradePositions
        .filter((pos) => !pos.closed)
        .map((pos) => ({
          ...pos,
          entrySide: each.entrySide, // Include parent trade's entrySide
        }))
    );

    const modifyDetails = getPositions.reduce((acc, each) => {
      const { optionName, id, currentQty } = each;
      const parts = optionName.split(" ");
      const baseOptionName = parts[0];
      const type = parts[2] as "CE" | "PE";
      const name = baseOptionName.toLowerCase() + parts[1];

      const lotSizeObj = optionLotSize.find((lot) => lot.optionName === name);
      const priceObj = optionPrice.find(
        (price) => price.optionName === optionName
      );

      if (lotSizeObj && priceObj) {
        const price = priceObj.price;
        const lotSize = lotSizeObj.lotSize;
        let mtm = 0;

        if (each.entrySide === "SELL")
          mtm = (each.entryPrice - price) * (parseInt(currentQty) * lotSize);
        if (each.entrySide === "BUY")
          mtm = (price - each.entryPrice) * (parseInt(currentQty) * lotSize);

        acc.push({
          id,
          optionName,
          price,
          mtm,
          quantity: parseInt(currentQty),
          entrySide: each.entrySide as "SELL" | "BUY",
          type,
        });
      }

      return acc;
    }, [] as Position[]);
    setPositions(modifyDetails);
  }, [trades, optionPrice, optionLotSize]);

  const handleSort = (key: keyof Position) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedPositions = React.useMemo(() => {
    if (!sortConfig) return positions;

    return [...positions].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

      return 0;
    });
  }, [positions, sortConfig]);

  const getSortIcon = (columnKey: keyof Position) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown size={12} className="text-gray-500" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp size={12} className="text-blue-400" />
    ) : (
      <ArrowDown size={12} className="text-blue-400" />
    );
  };

  const totalMtm = positions.reduce((sum, pos) => sum + pos.mtm, 0);

  const handleSquareOffAll = () => {
    toast.warning("Do you want to Square off all active positions?", {
      action: {
        label: "Yes",
        onClick: () => handleSquareOffAction(),
      },
    });
  };

  const handleSquareOffAction = async () => {
    const auth = cookies.get("auth");
    const deleteReq = axios.get(API_URL + "/user/squareOffAll", {
      headers: { Authorization: "Bearer " + auth },
    });
    toast.promise(deleteReq, {
      loading: "Closing all Open Positions ....",
      success: async () => {
        return "Closed Successfully!";
      },
      error: "Error While Closing Positions.",
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border border-gray-700 rounded-lg">
      <div className="p-2 sm:p-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex justify-between items-center">
          <h3 className="text-sm sm:text-base font-semibold text-white">
            Live Positions
          </h3>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total MTM</p>
            <p
              className={`text-xs sm:text-sm font-semibold ${
                totalMtm >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {formatCurrency(totalMtm)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Fixed Header */}
        <div className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
          <div className="grid grid-cols-4 gap-1 p-2">
            <button
              onClick={() => handleSort("optionName")}
              className="flex items-center space-x-1 text-left hover:text-white transition-colors text-xs font-medium text-gray-300"
            >
              <span className="text-xs truncate">Option</span>
              {getSortIcon("optionName")}
            </button>
            <button
              onClick={() => handleSort("price")}
              className="flex items-center justify-end space-x-1 hover:text-white transition-colors text-xs font-medium text-gray-300"
            >
              <span className="text-xs">Price</span>
              {getSortIcon("price")}
            </button>
            <button
              onClick={() => handleSort("quantity")}
              className="flex items-center justify-end space-x-1 hover:text-white transition-colors text-xs font-medium text-gray-300"
            >
              <span className="text-xs">Qty</span>
              {getSortIcon("quantity")}
            </button>
            <button
              onClick={() => handleSort("mtm")}
              className="flex items-center justify-end space-x-1 hover:text-white transition-colors text-xs font-medium text-gray-300"
            >
              <span className="text-xs">MTM</span>
              {getSortIcon("mtm")}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-1 space-y-1">
            {sortedPositions.map((position) => (
              <div
                key={position.id}
                className="grid grid-cols-4 gap-1 p-2 bg-gray-800 rounded hover:bg-gray-750 transition-colors"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-white font-medium truncate">
                    {position.optionName}
                  </span>
                  <span
                    className={`text-xs ${
                      position.type === "CE" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {position.type}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-white font-medium">
                    {formatNumber(position.price)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-white">
                    {position.quantity}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-medium ${
                      position.mtm >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {formatCurrency(position.mtm)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-2 sm:p-3 border-t border-gray-700 flex-shrink-0">
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={handleSquareOffAll}
            className="flex items-center justify-center space-x-2 px-3 py-2 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
          >
            <span>Square Off All</span>
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button className="flex items-center justify-center space-x-1 px-2 py-2 text-orange-500 text-xs rounded transition-colors">
              <span className="truncate">Portfolio SL: Undefined</span>
            </button>
            <button className="flex items-center justify-center space-x-1 px-2 py-2 text-blue-500 text-xs rounded">
              <span className="truncate">Portfolio Trail: Undefined</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PositionTracker;
