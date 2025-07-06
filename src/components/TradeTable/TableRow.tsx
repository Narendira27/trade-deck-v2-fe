import React, { useState, useEffect, useMemo } from "react";
import { Edit, Trash2, Play, X, Shield, Check } from "lucide-react";
import { type Trade } from "../../types/trade";
import { type Column } from "./ColumnManager";
import { formatCurrency, formatNumber } from "../../utils/formatters";
import useStore from "../../store/store";
import cookies from "js-cookie";
import { API_URL } from "../../config/config";
import axios from "axios";
import { toast } from "sonner";
import getTradeData from "../../utils/getTradeData";

interface TableRowProps {
  trade: Trade;
  columns: Column[];
  onDeleteOrder: () => void;
  onCancelOrder: () => void;
  onClosePartial: (percent: number) => void;
  onHedge: () => void;
}

interface OrderFormData {
  entry: number;
  qty: number;
  sl: number;
  target: number;
  slPoints: number;
  tpPoints: number;
  orderType: "LIMIT" | "MARKET";
}

interface EditFormData {
  pointOfAdjustment: number;
  pointOfAdjustmentUpperLimit: number;
  pointOfAdjustmentLowerLimit: number;
  entryPrice: number;
  takeProfitPoints: number;
  takeProfitPremium: number;
  stopLossPoints: number;
  stopLossPremium: number;
  strategySl: number;
  strategyTrailing: number;
}

const TableRow: React.FC<TableRowProps> = ({
  trade,
  columns,
  onDeleteOrder,
  onCancelOrder,
  onClosePartial,
  onHedge,
}) => {
  const [getindexPrice, setGetindexPrice] = useState(0);
  const [lowestValue, setLowestValue] = useState(0);
  const [mtm, setMtm] = useState(0);
  const [isPlaceOrderMode, setIsPlaceOrderMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const { indexPrice, optionValues, optionLotSize, optionPrice, setTrades } =
    useStore();

  // Place Order Form State
  const [orderFormData, setOrderFormData] = useState<OrderFormData>({
    entry: trade.entryPrice || 0,
    qty: trade.qty || 0,
    sl: trade.stopLossPremium || 0,
    target: trade.takeProfitPremium || 0,
    slPoints: trade.stopLossPoints || 0,
    tpPoints: trade.takeProfitPoints || 0,
    orderType: "LIMIT",
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState<EditFormData>({
    pointOfAdjustment: trade.pointOfAdjustment || 0,
    pointOfAdjustmentUpperLimit: trade.pointOfAdjustmentUpperLimit || 0,
    pointOfAdjustmentLowerLimit: trade.pointOfAdjustmentLowerLimit || 0,
    entryPrice: trade.entryPrice || 0,
    takeProfitPoints: trade.takeProfitPoints || 0,
    takeProfitPremium: trade.takeProfitPremium || 0,
    stopLossPoints: trade.stopLossPoints || 0,
    stopLossPremium: trade.stopLossPremium || 0,
    strategySl: 0,
    strategyTrailing: 0,
  });

  const [enablePremium, setEnablePremium] = useState(false);
  const [enablePremiumTp, setEnablePremiumTP] = useState(false);
  const [enableStrategySl, setEnableStrategySl] = useState(false);
  const [enableStrategyTrailing, setEnableStrategyTrailing] = useState(false);

  // Memoize the index price to prevent unnecessary updates
  const currentIndexPrice = useMemo(() => {
    return indexPrice.find((each) => each.name === trade.indexName);
  }, [indexPrice, trade.indexName]);

  // Memoize the option values to prevent unnecessary updates
  const currentOptionValue = useMemo(() => {
    if (!optionValues) return null;
    return optionValues.find((each) => each.id === trade.id);
  }, [optionValues, trade.id]);

  const calculateMtm = useMemo(() => {
    if (!trade) return 0;

    const lotSizeObj = optionLotSize.find(
      (lot) =>
        lot.optionName.toLowerCase() ===
        (trade.indexName + trade.expiry).toLowerCase()
    );

    const lotSize = lotSizeObj?.lotSize ?? 1;

    const totalMtm = trade.liveTradePositions.reduce((acc, position) => {
      const priceObj = optionPrice.find(
        (price) => price.optionName === position.optionName
      );

      const currentPrice = priceObj?.price ?? 0;
      const entryPrice = position.entryPrice ?? 0;
      const quantity = parseInt(position.currentQty) ?? 0;

      let mtm = 0;

      if (trade.entrySide === "SELL") {
        mtm = (entryPrice - currentPrice) * (lotSize * quantity);
      } else if (trade.entrySide === "BUY") {
        console.log();
        mtm = (currentPrice - entryPrice) * (lotSize * quantity);
      }

      return acc + mtm;
    }, 0);

    const filterActiveTrades = trade.liveTradePositions.filter(
      (each) => each.closed === false
    );

    if (filterActiveTrades.length === 0) return 0;

    return totalMtm;
  }, [trade, optionLotSize, optionPrice]);

  useEffect(() => {
    if (calculateMtm) {
      setMtm(calculateMtm);
    }
  }, [calculateMtm]);

  useEffect(() => {
    if (currentIndexPrice && currentIndexPrice.price !== getindexPrice) {
      setGetindexPrice(currentIndexPrice.price);
    }
  }, [currentIndexPrice, getindexPrice]);

  useEffect(() => {
    if (currentOptionValue) {
      setLowestValue(currentOptionValue.lowestCombinedPremium);
    }
  }, [currentOptionValue, lowestValue]);

  const getLotSizeInfo = () => {
    const lotData = optionLotSize.find(
      (each) =>
        each.optionName === `${trade?.indexName.toLowerCase()}${trade?.expiry}`
    );
    return lotData?.lotSize;
  };

  const handlePlaceOrder = () => {
    setIsPlaceOrderMode(true);
    setIsEditMode(false);
  };

  const handleEdit = () => {
    setIsEditMode(true);
    setIsPlaceOrderMode(false);
    // Initialize edit form with current trade data
    setEditFormData({
      pointOfAdjustment: trade.pointOfAdjustment || 0,
      pointOfAdjustmentUpperLimit: trade.pointOfAdjustmentUpperLimit || 0,
      pointOfAdjustmentLowerLimit: trade.pointOfAdjustmentLowerLimit || 0,
      entryPrice: trade.entryPrice || 0,
      takeProfitPoints: trade.takeProfitPoints || 0,
      takeProfitPremium: trade.takeProfitPremium || 0,
      stopLossPoints: trade.stopLossPoints || 0,
      stopLossPremium: trade.stopLossPremium || 0,
      strategySl: 0,
      strategyTrailing: 0,
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setIsPlaceOrderMode(false);
  };

  const submitPlaceOrder = async () => {
    if (!orderFormData.entry && orderFormData.orderType === "LIMIT") {
      toast.warning("Entry price is required");
      return;
    }

    if (!orderFormData.qty) {
      toast.warning("Qty is required");
      return;
    }

    if (orderFormData.sl === 0 && orderFormData.slPoints === 0) {
      toast.warning("SL is required");
      return;
    }

    if (orderFormData.target === 0 && orderFormData.tpPoints === 0) {
      toast.warning("TP is required");
      return;
    }

    const DATA: any = {
      entryType: orderFormData.orderType,
      entryPrice: orderFormData.entry,
      qty: orderFormData.qty,
      currentQty: orderFormData.qty,
    };

    if (orderFormData.orderType === "LIMIT") {
      DATA.stopLossPremium = orderFormData.sl;
      DATA.takeProfitPremium = orderFormData.target;
      if (trade.entrySide === "SELL") {
        DATA.stopLossPoints = orderFormData.sl - orderFormData.entry;
        DATA.takeProfitPoints = orderFormData.entry - orderFormData.target;
      }
      if (trade.entrySide === "BUY") {
        DATA.stopLossPoints = orderFormData.entry - orderFormData.sl;
        DATA.takeProfitPoints = orderFormData.target - orderFormData.entry;
      }
    }

    if (orderFormData.orderType === "MARKET") {
      if (orderFormData.slPoints) DATA.stopLossPoints = orderFormData.slPoints;
      if (orderFormData.tpPoints)
        DATA.takeProfitPoints = orderFormData.tpPoints;
    }

    if (trade?.entrySide === "SELL" && orderFormData.orderType === "LIMIT") {
      if (orderFormData.sl <= orderFormData.entry) {
        toast.error("SL price should be greater than the limit price");
        return;
      }
      if (orderFormData.target >= orderFormData.entry) {
        toast.error("TP price should be less than the limit price");
        return;
      }
    }

    if (trade?.entrySide === "BUY" && orderFormData.orderType === "LIMIT") {
      if (orderFormData.sl >= orderFormData.entry) {
        toast.error("SL price should be less than the limit price");
        return;
      }
      if (orderFormData.target <= orderFormData.entry) {
        toast.error("TP price should be greater than the limit price");
        return;
      }
    }

    const auth = cookies.get("auth");
    const reqPromise = axios.put(
      API_URL + "/user/tradeInfo?id=" + trade.id,
      DATA,
      {
        headers: { Authorization: "Bearer " + auth },
      }
    );

    toast.promise(reqPromise, {
      loading: "Placing Order...",
      success: async () => {
        const result = await getTradeData();
        if (result.status === "ok") {
          setTrades(result.tradeInfo);
        }
        setIsPlaceOrderMode(false);
        return "Order Placed Successfully";
      },
      error: "Cannot Place Order",
    });
  };

  const submitEdit = async () => {
    if (trade.entryType === "UNDEFINED") {
      toast.error("Cannot Edit Trade Before placing order!");
      return;
    }

    if (trade?.entrySide === "BUY") {
      if (editFormData.stopLossPremium >= editFormData.entryPrice) {
        toast.error("Stop Loss should be less than entry price for BUY!");
        return;
      }
      if (editFormData.takeProfitPremium <= editFormData.entryPrice) {
        toast.error("Take Profit should be greater than entry price for BUY!");
        return;
      }
    }

    if (trade?.entrySide === "SELL") {
      if (editFormData.stopLossPremium <= editFormData.entryPrice) {
        toast.error("Stop Loss should be greater than entry price for SELL!");
        return;
      }
      if (editFormData.takeProfitPremium >= editFormData.entryPrice) {
        toast.error("Take Profit should be less than entry price for SELL!");
        return;
      }
    }

    const auth = cookies.get("auth");
    const reqPromise = axios.put(
      API_URL + "/user/tradeInfo?id=" + trade.id,
      {
        pointOfAdjustment: editFormData.pointOfAdjustment,
        pointOfAdjustmentUpperLimit: editFormData.pointOfAdjustmentUpperLimit,
        pointOfAdjustmentLowerLimit: editFormData.pointOfAdjustmentLowerLimit,
        entryPrice: editFormData.entryPrice,
        takeProfitPremium: editFormData.takeProfitPremium,
        takeProfitPoints: editFormData.takeProfitPoints,
        stopLossPoints: editFormData.stopLossPoints,
        stopLossPremium: editFormData.stopLossPremium,
      },
      {
        headers: { Authorization: "Bearer " + auth },
      }
    );

    toast.promise(reqPromise, {
      loading: "Updating Order...",
      success: async () => {
        const result = await getTradeData();
        if (result.status === "ok") {
          setTrades(result.tradeInfo);
        }
        setIsEditMode(false);
        return "Updated Successfully";
      },
      error: "Cannot Update Order",
    });
  };

  const updateTpSl = async () => {
    let data;
    if (orderFormData.orderType === "LIMIT") {
      data = {
        stopLossPremium: orderFormData.sl,
        takeProfitPremium: orderFormData.target,
      };
    }
    if (orderFormData.orderType === "MARKET") {
      data = {
        stopLossPoints: orderFormData.slPoints,
        takeProfitPoints: orderFormData.tpPoints,
      };
    }
    const auth = cookies.get("auth");
    const reqPromise = axios.put(
      API_URL + "/user/tradeInfo?id=" + trade.id,
      data,
      {
        headers: { Authorization: "Bearer " + auth },
      }
    );
    toast.promise(reqPromise, {
      loading: "Updating TP & SL...",
      success: async () => {
        const result = await getTradeData();
        if (result.status === "ok") {
          setTrades(result.tradeInfo);
        }
        return "Updated SL and TP";
      },
      error: "Cannot update SL & TP",
    });
  };

  const getCellValue = (columnId: string) => {
    // If in place order mode, show form inputs for relevant fields
    if (isPlaceOrderMode && trade.entryType === "UNDEFINED") {
      switch (columnId) {
        case "entry":
          return orderFormData.orderType === "LIMIT" ? (
            <input
              type="number"
              value={orderFormData.entry}
              onChange={(e) =>
                setOrderFormData({
                  ...orderFormData,
                  entry: parseFloat(e.target.value) || 0,
                })
              }
              className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="Entry"
            />
          ) : (
            "-"
          );
        case "qty":
          return (
            <div className="flex flex-col">
              <span className="text-xs mb-1 text-gray-400">
                Lot: {getLotSizeInfo()}
              </span>
              <input
                type="number"
                value={orderFormData.qty}
                onChange={(e) =>
                  setOrderFormData({
                    ...orderFormData,
                    qty: parseInt(e.target.value) || 0,
                  })
                }
                className="w-16 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white mb-1"
                placeholder="Qty"
              />
            </div>
          );
        case "sl":
          return orderFormData.orderType === "LIMIT" ? (
            <div className="flex flex-col">
              <span className="text-xs mb-1 text-gray-400">(In Premium)</span>
              <input
                type="number"
                value={orderFormData.sl}
                onChange={(e) =>
                  setOrderFormData({
                    ...orderFormData,
                    sl: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="SL"
              />
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-xs mb-1 text-gray-400">(In Points)</span>

              <input
                type="number"
                value={orderFormData.slPoints}
                onChange={(e) =>
                  setOrderFormData({
                    ...orderFormData,
                    slPoints: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="SL Points"
              />
            </div>
          );
        case "target":
          return orderFormData.orderType === "LIMIT" ? (
            <div className="flex flex-col">
              <span className="text-xs mb-1 text-gray-400">(In Premium)</span>
              <input
                type="number"
                value={orderFormData.target}
                onChange={(e) =>
                  setOrderFormData({
                    ...orderFormData,
                    target: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="Target"
              />
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-xs mb-1 text-gray-400">(In Points)</span>
              <input
                type="number"
                value={orderFormData.tpPoints}
                onChange={(e) =>
                  setOrderFormData({
                    ...orderFormData,
                    tpPoints: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="TP Points"
              />
            </div>
          );
        case "orderType":
          return (
            <div className="flex flex-col space-y-1">
              <label className="flex items-center text-xs">
                <input
                  type="radio"
                  name={`orderType-${trade.id}`}
                  value="LIMIT"
                  checked={orderFormData.orderType === "LIMIT"}
                  onChange={() =>
                    setOrderFormData({ ...orderFormData, orderType: "LIMIT" })
                  }
                  className="mr-1"
                />
                Limit
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="radio"
                  name={`orderType-${trade.id}`}
                  value="MARKET"
                  checked={orderFormData.orderType === "MARKET"}
                  onChange={() =>
                    setOrderFormData({ ...orderFormData, orderType: "MARKET" })
                  }
                  className="mr-1"
                />
                Market
              </label>
            </div>
          );
      }
    }

    // If in edit mode, show form inputs for relevant fields
    if (isEditMode && trade.entryType !== "UNDEFINED") {
      switch (columnId) {
        case "entry":
          return (
            <input
              type="number"
              value={editFormData.entryPrice}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  entryPrice: parseFloat(e.target.value) || 0,
                })
              }
              disabled={trade.entryTriggered}
              className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="Entry"
            />
          );
        case "sl":
          return (
            <div className="flex flex-col space-y-1">
              <input
                type="number"
                value={editFormData.stopLossPoints}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    stopLossPoints: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="SL Points"
              />
              <input
                type="number"
                value={editFormData.stopLossPremium}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    stopLossPremium: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={!enablePremium}
                className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="SL Premium"
              />
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={enablePremium}
                  onChange={() => setEnablePremium(!enablePremium)}
                  className="mr-1"
                />
                Premium
              </label>
            </div>
          );
        case "target":
          return (
            <div className="flex flex-col space-y-1">
              <input
                type="number"
                value={editFormData.takeProfitPoints}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    takeProfitPoints: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="TP Points"
              />
              <input
                type="number"
                value={editFormData.takeProfitPremium}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    takeProfitPremium: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={!enablePremiumTp}
                className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="TP Premium"
              />
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={enablePremiumTp}
                  onChange={() => setEnablePremiumTP(!enablePremiumTp)}
                  className="mr-1"
                />
                Premium
              </label>
            </div>
          );
        case "pointOfAdjustment":
          return (
            <input
              type="number"
              value={editFormData.pointOfAdjustment}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  pointOfAdjustment: parseFloat(e.target.value) || 0,
                })
              }
              className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="POA"
            />
          );
        case "adjustmentUpperLimit":
          return (
            <input
              type="number"
              value={editFormData.pointOfAdjustmentUpperLimit}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  pointOfAdjustmentUpperLimit: parseFloat(e.target.value) || 0,
                })
              }
              className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="Upper"
            />
          );
        case "adjustmentLowerLimit":
          return (
            <input
              type="number"
              value={editFormData.pointOfAdjustmentLowerLimit}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  pointOfAdjustmentLowerLimit: parseFloat(e.target.value) || 0,
                })
              }
              className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="Lower"
            />
          );
        case "strategySl":
          return (
            <div className="flex flex-col space-y-1">
              <input
                type="number"
                value={editFormData.strategySl}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    strategySl: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={!enableStrategySl}
                className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="Strategy SL"
              />
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={enableStrategySl}
                  onChange={() => setEnableStrategySl(!enableStrategySl)}
                  className="mr-1"
                />
                Enable
              </label>
            </div>
          );
        case "strategyTrailing":
          return (
            <div className="flex flex-col space-y-1">
              <input
                type="number"
                value={editFormData.strategyTrailing}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    strategyTrailing: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={!enableStrategyTrailing}
                className="w-20 px-1 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="Strategy Trail"
              />
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={enableStrategyTrailing}
                  onChange={() =>
                    setEnableStrategyTrailing(!enableStrategyTrailing)
                  }
                  className="mr-1"
                />
                Enable
              </label>
            </div>
          );
      }
    }

    // Default display values
    switch (columnId) {
      case "index":
        return trade.indexName;
      case "side":
        return trade.entrySide;
      case "ltpSpot":
        return formatNumber(getindexPrice);
      case "legCount":
        return trade.legCount;
      case "expiry":
        return trade.expiry;
      case "ltpRange":
        return formatNumber(trade.ltpRange);
      case "lowestValue":
        return formatNumber(lowestValue) || formatNumber(0);
      case "entry":
        return trade.entryPrice ? formatNumber(trade.entryPrice) : "-";
      case "qty":
        return trade.qty || "-";
      case "sl":
        return trade.stopLossPremium
          ? formatNumber(trade.stopLossPremium)
          : "-";
      case "target":
        return trade.takeProfitPremium
          ? formatNumber(trade.takeProfitPremium)
          : "-";
      case "entrySpot":
        return formatNumber(trade.entrySpotPrice);
      case "mtm":
        return formatCurrency(mtm);
      case "pointOfAdjustment":
        return trade.pointOfAdjustment
          ? formatNumber(trade.pointOfAdjustment)
          : "-";
      case "adjustmentUpperLimit":
        return trade.pointOfAdjustmentUpperLimit
          ? formatNumber(trade.pointOfAdjustmentUpperLimit)
          : "-";
      case "adjustmentLowerLimit":
        return trade.pointOfAdjustmentLowerLimit
          ? formatNumber(trade.pointOfAdjustmentLowerLimit)
          : "-";
      case "orderType":
        return trade.entryType;
      case "entryTriggered":
        return trade.entryTriggered ? "Yes" : "No";
      case "strategySl":
        return trade.strategySl ? formatNumber(trade.strategySl) : "-";
      case "strategyTrailing":
        return trade.strategyTrailing
          ? formatNumber(trade.strategyTrailing)
          : "-";
      case "exitPercentages":
        if (!trade.alive) return "-";
        return (
          <div className="flex space-x-1">
            <button
              onClick={() => onClosePartial(25)}
              className="px-1 py-0.5 text-xs bg-gray-700 rounded hover:bg-gray-600"
            >
              25%
            </button>
            <button
              onClick={() => onClosePartial(50)}
              className="px-1 py-0.5 text-xs bg-gray-700 rounded hover:bg-gray-600"
            >
              50%
            </button>
            <button
              onClick={() => onClosePartial(100)}
              className="px-1 py-0.5 text-xs bg-gray-700 rounded hover:bg-gray-600"
            >
              100%
            </button>
          </div>
        );
      default:
        return "-";
    }
  };

  const getCellClassName = (columnId: string) => {
    const baseClass =
      "px-3 py-2 text-xs leading-normal border-b border-gray-800";

    switch (columnId) {
      case "sl":
        return `${baseClass} text-red-400`;
      case "target":
        return `${baseClass} text-green-400`;
      case "mtm":
        return `${mtm} ${baseClass} ${
          mtm > 0 ? "text-green-400" : mtm < 0 ? "text-red-400" : "text-white"
        }`;
      case "strategySl":
        return `${baseClass} text-red-400 `;
      case "strategyTrailing":
        return `${baseClass} text-green-400 `;
      default:
        return `${baseClass} text-white`;
    }
  };

  return (
    <tr
      className={`hover:bg-gray-800/50 transition-colors ${
        isPlaceOrderMode || isEditMode ? "bg-gray-800/30" : ""
      }`}
    >
      <td className="px-2 py-2 text-xs font-medium text-white border-b border-gray-800">
        {trade.alive && (
          <div className="flex space-x-1">
            {isPlaceOrderMode ? (
              <>
                <button
                  onClick={submitPlaceOrder}
                  className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  title="Submit Order"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={updateTpSl}
                  className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="Set TP & SL"
                >
                  <Play size={12} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  title="Cancel"
                >
                  <X size={12} />
                </button>
              </>
            ) : isEditMode ? (
              <>
                <button
                  onClick={submitEdit}
                  className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  title="Save Changes"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  title="Cancel"
                >
                  <X size={12} />
                </button>
              </>
            ) : trade.entryType === "UNDEFINED" ? (
              <>
                <button
                  onClick={handlePlaceOrder}
                  className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="Place Order"
                >
                  <Play size={12} />
                </button>
                <button
                  onClick={handleEdit}
                  className="p-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                  title="Edit"
                >
                  <Edit size={12} />
                </button>
                <button
                  onClick={onHedge}
                  className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                  title="Hedge"
                >
                  <Shield size={12} />
                </button>
                <button
                  onClick={onDeleteOrder}
                  className="p-1 bg-red-500/80 text-white rounded hover:bg-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </>
            ) : (
              <>
                {trade.entryTriggered === false &&
                trade.entryType === "LIMIT" ? (
                  <>
                    <button
                      onClick={onCancelOrder}
                      className="p-1 bg-red-500/80 rounded hover:bg-red-400 transition-colors"
                      title="Cancel Order"
                    >
                      <X size={12} />
                    </button>
                    <button
                      onClick={handleEdit}
                      className="p-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                      title="Edit"
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      onClick={onHedge}
                      className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                      title="Hedge"
                    >
                      <Shield size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEdit}
                      className="p-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                      title="Edit"
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      onClick={onHedge}
                      className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                      title="Hedge"
                    >
                      <Shield size={12} />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </td>
      {columns
        .filter((col) => col.visible)
        .map((column) => (
          <td key={column.id} className={getCellClassName(column.id)}>
            {getCellValue(column.id)}
          </td>
        ))}
    </tr>
  );
};

export default TableRow;
