import { useCallback, useEffect, useState } from "react";
import cookies from "js-cookie";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import Header from "../components/Header";
import SideNav from "../components/SideNav";
import TradeTable from "../components/TradeTable";
import LoadingScreen from "../components/LoadingScreen";
import { jwtDecode } from "jwt-decode";
import { type Column } from "../components/TradeTable/ColumnManager";
import MarketDataComponent from "../components/marketData";
import GetValues from "../components/getValues";
import ResizablePanel from "../components/ResizablePanel";
import ChartContainer from "../components/Chart/ChartContainer";
import PositionTracker from "../components/PositionTracker/PositionTracker";
import DraggableBoxManager from "../components/DraggableBoxManager";
import DraggableBox from "../components/DraggableBox";
import {
  defaultDraggableColumns,
  type DraggableBoxColumn,
} from "../types/draggableBox";
import { useDataLoader } from "../hooks/useDataLoader";

import { API_URL } from "../config/config";
import useStore from "../store/store";

interface MyJwtPayload {
  updatePassword: boolean;
}

const defaultColumns: Column[] = [
  { id: "index", label: "Index", visible: true, width: "120px" },
  { id: "side", label: "Side", visible: true, width: "100px" },
  { id: "ltpSpot", label: "LTP Spot", visible: true, width: "100px" },
  { id: "legCount", label: "Leg Count", visible: true, width: "100px" },
  { id: "expiry", label: "Expiry", visible: true, width: "120px" },
  { id: "ltpRange", label: "LTP Range", visible: true, width: "100px" },
  { id: "lowestValue", label: "Lowest Value", visible: true, width: "120px" },
  { id: "entry", label: "Entry", visible: true, width: "100px" },
  { id: "qty", label: "Quantity", visible: true, width: "100px" },
  { id: "sl", label: "Stop Loss", visible: true, width: "100px" },
  { id: "target", label: "Target", visible: true, width: "100px" },
  {
    id: "entrySpot",
    label: "Entry Spot Price",
    visible: true,
    width: "140px",
  },
  { id: "mtm", label: "MTM", visible: true, width: "120px" },
  {
    id: "pointOfAdjustment",
    label: "Point of Adjustment",
    visible: true,
    width: "160px",
  },
  {
    id: "adjustmentUpperLimit",
    label: "Adjustment Upper Limit",
    visible: true,
    width: "180px",
  },
  {
    id: "adjustmentLowerLimit",
    label: "Adjustment Lower Limit",
    visible: true,
    width: "180px",
  },
  { id: "orderType", label: "Order Type", visible: true, width: "120px" },
  {
    id: "entryTriggered",
    label: "Entry Triggered",
    visible: true,
    width: "140px",
  },
  {
    id: "strategySl",
    label: "Strategy SL(in ₹)",
    visible: true,
    width: "120px",
  },
  {
    id: "strategyTrailing",
    label: "Strategy Trailing(in ₹)",
    visible: true,
    width: "140px",
  },
  { id: "exitPercentages", label: "Exit %", visible: true, width: "150px" },
];

function Dashboard() {
  const { trades, setTrades, setOptionLotSize } = useStore();
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [draggableColumns, setDraggableColumns] = useState<
    DraggableBoxColumn[]
  >(defaultDraggableColumns);
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [isDashboardReady, setIsDashboardReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  const navigate = useNavigate();
  const { loadingState, loadAllData, resetRequestStates, isLoading, hasLoaded } = useDataLoader();

  // Periodic trade data updates (only after dashboard is ready)
  const updateTradeData = useCallback(() => {
    if (!isDashboardReady) return;

    const auth = cookies.get("auth");
    if (!auth) return;

    // Silent update without toast notifications
    axios
      .get(API_URL + "/user/tradeInfo", {
        headers: { Authorization: "Bearer " + auth },
      })
      .then((data) => {
        setTrades(data.data.data);
      })
      .catch((error) => {
        console.warn("Failed to update trade data:", error);
        // Don't show error toast for periodic updates
      });
  }, [isDashboardReady, setTrades]);

  // Initial authentication check
  useEffect(() => {
    const checkAuth = () => {
      const auth = cookies.get("auth");

      if (!auth) {
        navigate("/login");
        return;
      }

      try {
        const decoded = jwtDecode<MyJwtPayload>(auth);
        if (decoded.updatePassword === true) {
          navigate("/onboarding");
          return;
        }
      } catch {
        navigate("/login");
        return;
      }

      setAuthChecked(true);
    };

    checkAuth();
  }, [navigate]);

  // Load data only once after auth is checked
  useEffect(() => {
    if (!authChecked || hasLoaded || isLoading) return;

    const initializeData = async () => {
      console.log('Starting data initialization...');
      const success = await loadAllData();
      if (!success) {
        // If critical data loading fails, redirect to login
        navigate("/login");
      }
    };

    initializeData();
  }, [authChecked, hasLoaded, isLoading, loadAllData, navigate]);

  // Periodic data updates (only after initial loading is complete)
  useEffect(() => {
    if (!isDashboardReady) return;

    // Update trade data every 5 seconds
    const tradeInterval = setInterval(updateTradeData, 5000);

    // Load lot size data once after dashboard is ready (if not already loaded)
    const auth = cookies.get("auth");
    if (auth) {
      axios
        .get(API_URL + "/user/lotSize", {
          headers: { Authorization: "Bearer " + auth },
        })
        .then((data) => {
          setOptionLotSize(data.data.data);
        })
        .catch((error) => {
          console.warn("Failed to load lot size data:", error);
        });
    }

    return () => {
      clearInterval(tradeInterval);
    };
  }, [isDashboardReady, updateTradeData, setOptionLotSize]);

  const handleLoadingComplete = () => {
    // Additional validation before allowing dashboard interaction
    const criticalDataReady = 
      loadingState.chartDataReady && 
      loadingState.progress === 100 &&
      !loadingState.error;

    if (criticalDataReady) {
      setIsDashboardReady(true);
      toast.success("Dashboard ready! All systems operational.");
    } else {
      // If critical data isn't ready, show warning but still allow access
      setIsDashboardReady(true);
      toast.warning("Dashboard loaded with limited functionality. Some features may not work properly.");
    }
  };

  // Show loading screen during initial load or if dashboard isn't ready
  if (!authChecked || (!isDashboardReady && (isLoading || !hasLoaded))) {
    return (
      <LoadingScreen
        isVisible={true}
        onLoadingComplete={handleLoadingComplete}
        loadingState={loadingState}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      <Header
        columns={columns}
        onColumnsChange={setColumns}
        draggableColumns={draggableColumns}
        onDraggableColumnsChange={setDraggableColumns}
        onMenuToggle={() => setIsSideNavOpen(!isSideNavOpen)}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden relative">
          {/* Mobile Layout */}
          <div className="lg:hidden h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <TradeTable trades={trades} columns={columns} />
            </div>
            <div className="h-48 sm:h-64 border-t border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 h-full gap-1 p-1">
                <div className="bg-gray-900">
                  <ChartContainer />
                </div>
                <div className="bg-gray-900">
                  <PositionTracker />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:block h-full">
            <ResizablePanel
              direction="vertical"
              initialSize={30}
              minSize={5}
              maxSize={95}
            >
              {/* Top section - Trade Table */}
              <div className="h-full bg-gray-900 border-b border-gray-700">
                <TradeTable trades={trades} columns={columns} />
              </div>

              {/* Bottom section - Chart and Position Tracker */}
              <ResizablePanel
                direction="horizontal"
                initialSize={65}
                minSize={5}
                maxSize={95}
              >
                {/* Chart section */}
                <div className="h-full p-2">
                  <ChartContainer />
                </div>

                {/* Position Tracker section */}
                <div className="h-full p-2">
                  <PositionTracker />
                </div>
              </ResizablePanel>
            </ResizablePanel>
          </div>

          <DraggableBoxManager />
          <DraggableBox columns={draggableColumns} />

          {/* Only render market data components after dashboard is ready */}
          {isDashboardReady && (
            <>
              <MarketDataComponent />
              <GetValues />
            </>
          )}
        </main>

        <SideNav
          isOpen={isSideNavOpen}
          onToggle={() => setIsSideNavOpen(!isSideNavOpen)}
        />
      </div>
    </div>
  );
}

export default Dashboard;