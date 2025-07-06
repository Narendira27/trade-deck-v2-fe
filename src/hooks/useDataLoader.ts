import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import cookies from "js-cookie";
import { toast } from "sonner";
import { API_URL, SOCKET_MAIN, SOCKET_FE } from "../config/config";
import useStore from "../store/store";

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  progress: number;
  currentStep: string;
  chartDataReady: boolean;
  marketDataConnected: boolean;
}

interface RequestState {
  [key: string]: {
    status: 'pending' | 'loading' | 'success' | 'failed';
    attempts: number;
    lastAttempt: number;
    data?: any;
    error?: string;
  };
}

export const useDataLoader = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    progress: 0,
    currentStep: "",
    chartDataReady: false,
    marketDataConnected: false,
  });

  const requestStateRef = useRef<RequestState>({});
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  
  const { setTrades, setIndexData, setOptionLotSize, trades, optionValues } = useStore();

  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000; // 2 seconds

  const makeRequest = async (
    key: string,
    requestFn: () => Promise<any>,
    maxRetries: number = MAX_RETRIES
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    const state = requestStateRef.current[key];
    
    // If already successful, return cached data
    if (state?.status === 'success') {
      return { success: true, data: state.data };
    }

    // If currently loading, wait for it to complete
    if (state?.status === 'loading') {
      return new Promise((resolve) => {
        const checkStatus = () => {
          const currentState = requestStateRef.current[key];
          if (currentState?.status === 'success') {
            resolve({ success: true, data: currentState.data });
          } else if (currentState?.status === 'failed') {
            resolve({ success: false, error: currentState.error });
          } else {
            setTimeout(checkStatus, 100);
          }
        };
        checkStatus();
      });
    }

    // If failed and max retries reached, don't retry
    if (state?.status === 'failed' && state.attempts >= maxRetries) {
      return { success: false, error: state.error };
    }

    // If failed but can retry, check if enough time has passed
    if (state?.status === 'failed' && state.attempts < maxRetries) {
      const timeSinceLastAttempt = Date.now() - state.lastAttempt;
      if (timeSinceLastAttempt < RETRY_DELAY) {
        return { success: false, error: state.error };
      }
    }

    // Initialize or update request state
    const attempts = (state?.attempts || 0) + 1;
    requestStateRef.current[key] = {
      status: 'loading',
      attempts,
      lastAttempt: Date.now(),
    };

    try {
      const data = await requestFn();
      requestStateRef.current[key] = {
        status: 'success',
        attempts,
        lastAttempt: Date.now(),
        data,
      };
      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Request failed';
      requestStateRef.current[key] = {
        status: 'failed',
        attempts,
        lastAttempt: Date.now(),
        error: errorMessage,
      };
      return { success: false, error: errorMessage };
    }
  };

  const checkSocketHealth = async (socketUrl: string, key: string): Promise<boolean> => {
    const result = await makeRequest(
      key,
      async () => {
        const response = await fetch(`${socketUrl}/health`);
        if (!response.ok) throw new Error('Health check failed');
        const health = await response.json();
        if (!health.brokerWSConnected || !health.redisConnected) {
          throw new Error('Socket services not ready');
        }
        return health;
      },
      1 // Only try once for health checks
    );
    return result.success;
  };

  const waitForChartData = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 30; // 15 seconds max wait
      
      const checkData = () => {
        attempts++;
        
        // Check if we have trades and at least some option values
        const hasTradeData = Array.isArray(trades) && trades.length > 0;
        const hasOptionData = Array.isArray(optionValues) && optionValues.length > 0;
        
        if (hasTradeData && hasOptionData) {
          setLoadingState(prev => ({ ...prev, chartDataReady: true }));
          resolve(true);
          return;
        }
        
        if (attempts >= maxAttempts) {
          // Even if we don't have perfect data, allow the dashboard to load
          setLoadingState(prev => ({ ...prev, chartDataReady: true }));
          resolve(true);
          return;
        }
        
        setTimeout(checkData, 500);
      };
      
      checkData();
    });
  }, [trades, optionValues]);

  const loadAllData = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current || hasLoadedRef.current) {
      console.log('Data loading already in progress or completed');
      return hasLoadedRef.current;
    }

    isLoadingRef.current = true;
    
    // Reset request states for a fresh load only if this is the first load
    if (!hasLoadedRef.current) {
      requestStateRef.current = {};
    }
    
    setLoadingState({ 
      isLoading: true, 
      error: null, 
      progress: 0, 
      currentStep: "Authenticating User",
      chartDataReady: false,
      marketDataConnected: false,
    });

    try {
      const auth = cookies.get("auth");
      if (!auth) {
        throw new Error("No authentication token found");
      }

      const headers = { Authorization: `Bearer ${auth}` };

      // Step 1: Verify authentication
      setLoadingState(prev => ({ 
        ...prev, 
        progress: 10, 
        currentStep: "Verifying authentication..." 
      }));
      
      const authResult = await makeRequest(
        'auth-verify',
        () => axios.get(`${API_URL}/auth/verify`, { headers })
      );

      if (!authResult.success) {
        throw new Error(authResult.error || 'Authentication failed');
      }

      // Step 2: Load trade data
      setLoadingState(prev => ({ 
        ...prev, 
        progress: 25, 
        currentStep: "Loading Trade Data" 
      }));
      
      const tradesResult = await makeRequest(
        'trade-data',
        () => axios.get(`${API_URL}/user/tradeInfo`, { headers })
      );

      if (tradesResult.success) {
        // Ensure trades data is always an array
        const tradesData = tradesResult.data.data;
        const validTradesData = Array.isArray(tradesData) ? tradesData : [];
        setTrades(validTradesData);
      } else {
        console.warn('Failed to load trade data:', tradesResult.error);
        // Continue with empty trades - not critical for initial load
        setTrades([]);
      }

      // Step 3: Load option data
      setLoadingState(prev => ({ 
        ...prev, 
        progress: 40, 
        currentStep: "Loading Option Data" 
      }));
      
      const optionResult = await makeRequest(
        'option-data',
        () => axios.get(`${API_URL}/user/optionData`, { headers })
      );

      if (optionResult.success) {
        setIndexData(optionResult.data.data);
      } else {
        console.warn('Failed to load option data:', optionResult.error);
        // Set empty data structure
        setIndexData({ indices: [], expiry: {} });
      }

      // Step 4: Load lot sizes
      setLoadingState(prev => ({ 
        ...prev, 
        progress: 55, 
        currentStep: "Loading Lot Size Data" 
      }));
      
      const lotSizeResult = await makeRequest(
        'lot-size-data',
        () => axios.get(`${API_URL}/user/lotSize`, { headers })
      );

      if (lotSizeResult.success) {
        // Ensure lot size data is always an array
        const lotSizeData = lotSizeResult.data.data;
        const validLotSizeData = Array.isArray(lotSizeData) ? lotSizeData : [];
        setOptionLotSize(validLotSizeData);
      } else {
        console.warn('Failed to load lot size data:', lotSizeResult.error);
        setOptionLotSize([]);
      }

      // Step 5: Check market data connections (non-critical)
      setLoadingState(prev => ({ 
        ...prev, 
        progress: 70, 
        currentStep: "Connecting to Market Data" 
      }));
      
      const [mainSocketHealthy, feSocketHealthy] = await Promise.all([
        checkSocketHealth(SOCKET_MAIN, 'main-socket-health'),
        checkSocketHealth(SOCKET_FE, 'fe-socket-health')
      ]);

      const marketDataConnected = mainSocketHealthy && feSocketHealthy;
      setLoadingState(prev => ({ ...prev, marketDataConnected }));

      if (!marketDataConnected) {
        console.warn('Market data connection issues detected');
        toast.warning("Market data connection limited. Some features may not work properly.");
      }

      // Step 6: Wait for initial chart data
      setLoadingState(prev => ({ 
        ...prev, 
        progress: 85, 
        currentStep: "Preparing Charts" 
      }));
      
      // Give some time for socket connections to establish and initial data to flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Wait for chart data to be ready
      await waitForChartData();

      // Step 7: Final validation
      setLoadingState(prev => ({ 
        ...prev, 
        progress: 100, 
        currentStep: "Finalizing setup..." 
      }));
      
      await new Promise(resolve => setTimeout(resolve, 500));

      setLoadingState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: null, 
        progress: 100,
        currentStep: "Ready!"
      }));
      
      hasLoadedRef.current = true;
      isLoadingRef.current = false;
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to load data";
      setLoadingState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage, 
        progress: 0,
        currentStep: "Error occurred",
        chartDataReady: false,
        marketDataConnected: false,
      }));
      console.error('Data loading failed:', errorMessage);
      isLoadingRef.current = false;
      return false;
    }
  }, []); // Remove all dependencies to prevent recreation

  // Cleanup function to reset request states
  const resetRequestStates = useCallback(() => {
    requestStateRef.current = {};
    hasLoadedRef.current = false;
    isLoadingRef.current = false;
  }, []);

  return {
    loadingState,
    loadAllData,
    resetRequestStates,
    isLoading: isLoadingRef.current,
    hasLoaded: hasLoadedRef.current,
  };
};