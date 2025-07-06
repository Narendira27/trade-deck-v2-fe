import React, { useEffect, useState } from "react";
import { BarChart2, CheckCircle, Loader2, AlertCircle, Wifi, WifiOff, XCircle } from "lucide-react";

interface LoadingStep {
  id: string;
  label: string;
  status: "pending" | "loading" | "completed" | "error" | "warning";
  description: string;
  critical: boolean;
}

interface LoadingScreenProps {
  isVisible: boolean;
  onLoadingComplete: () => void;
  loadingState?: {
    progress: number;
    currentStep: string;
    chartDataReady: boolean;
    marketDataConnected: boolean;
    error: string | null;
  };
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isVisible,
  onLoadingComplete,
  loadingState,
}) => {
  const [steps, setSteps] = useState<LoadingStep[]>([
    {
      id: "auth",
      label: "Authenticating User",
      status: "pending",
      description: "Verifying your credentials and session",
      critical: true,
    },
    {
      id: "trades",
      label: "Loading Trade Data",
      status: "pending",
      description: "Fetching your active and historical trades",
      critical: true,
    },
    {
      id: "options",
      label: "Loading Option Data",
      status: "pending",
      description: "Fetching option chains and lot sizes",
      critical: true,
    },
    {
      id: "market",
      label: "Connecting to Market Data",
      status: "pending",
      description: "Establishing real-time market connections",
      critical: false,
    },
    {
      id: "charts",
      label: "Preparing Charts",
      status: "pending",
      description: "Setting up real-time chart data and connections",
      critical: true,
    },
  ]);

  const [allCriticalStepsComplete, setAllCriticalStepsComplete] = useState(false);
  const [showManualContinue, setShowManualContinue] = useState(false);

  // Update steps based on loading state
  useEffect(() => {
    if (!loadingState) return;

    const { progress, currentStep, chartDataReady, marketDataConnected, error } = loadingState;

    setSteps(prev => prev.map(step => {
      // Handle global error state
      if (error && step.status === "loading") {
        return { ...step, status: "error", description: `Error: ${error}` };
      }

      // Update based on progress
      if (progress >= 10 && step.id === "auth") {
        return { 
          ...step, 
          status: progress >= 25 ? "completed" : "loading",
          description: progress >= 25 ? "Authentication successful" : "Verifying credentials..."
        };
      }
      if (progress >= 25 && step.id === "trades") {
        return { 
          ...step, 
          status: progress >= 40 ? "completed" : "loading",
          description: progress >= 40 ? "Trade data loaded successfully" : "Loading trade information..."
        };
      }
      if (progress >= 40 && step.id === "options") {
        return { 
          ...step, 
          status: progress >= 70 ? "completed" : "loading",
          description: progress >= 70 ? "Option data loaded successfully" : "Loading option chains and lot sizes..."
        };
      }
      if (progress >= 70 && step.id === "market") {
        return { 
          ...step, 
          status: marketDataConnected ? "completed" : "warning",
          description: marketDataConnected 
            ? "Real-time market data connected successfully"
            : "Market data connection limited - some features may be affected"
        };
      }
      if (progress >= 85 && step.id === "charts") {
        return { 
          ...step, 
          status: chartDataReady ? "completed" : "loading",
          description: chartDataReady 
            ? "Charts ready with real-time data"
            : "Waiting for chart data to load..."
        };
      }

      return step;
    }));
  }, [loadingState]);

  // Check if all critical steps are complete
  useEffect(() => {
    const criticalSteps = steps.filter(step => step.critical);
    const completedCriticalSteps = criticalSteps.filter(step => 
      step.status === "completed"
    );
    
    const allComplete = completedCriticalSteps.length === criticalSteps.length;
    setAllCriticalStepsComplete(allComplete);

    // Auto-complete loading when all critical steps are done
    if (allComplete && loadingState?.progress === 100) {
      setTimeout(() => {
        onLoadingComplete();
      }, 1000);
    }

    // Show manual continue button if loading takes too long
    if (loadingState?.progress === 100 && !allComplete) {
      setTimeout(() => {
        setShowManualContinue(true);
      }, 3000);
    }
  }, [steps, loadingState?.progress, onLoadingComplete]);

  if (!isVisible) return null;

  const getStepIcon = (step: LoadingStep) => {
    switch (step.status) {
      case "loading":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-600" />;
    }
  };

  const getStepTextColor = (step: LoadingStep) => {
    switch (step.status) {
      case "loading":
        return "text-blue-400";
      case "completed":
        return "text-green-400";
      case "warning":
        return "text-yellow-400";
      case "error":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const hasErrors = steps.some(step => step.status === "error");
  const hasWarnings = steps.some(step => step.status === "warning");

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-500/10 p-4 rounded-full">
              <BarChart2 className="h-12 w-12 text-blue-500 animate-pulse" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome to TradeDeck
          </h1>
          <p className="text-gray-400">
            Setting up your trading environment...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Loading Progress</span>
            <span>{Math.round(loadingState?.progress || 0)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ease-out ${
                hasErrors 
                  ? "bg-gradient-to-r from-red-500 to-red-600" 
                  : hasWarnings
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                  : "bg-gradient-to-r from-blue-500 to-green-500"
              }`}
              style={{ width: `${loadingState?.progress || 0}%` }}
            />
          </div>
        </div>

        {/* Connection Status */}
        {loadingState && (
          <div className="mb-6 p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Market Data Connection:</span>
              <div className="flex items-center space-x-2">
                {loadingState.marketDataConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-green-400">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-yellow-500" />
                    <span className="text-yellow-400">Limited</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-400">Chart Data:</span>
              <div className="flex items-center space-x-2">
                {loadingState.chartDataReady ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-400">Ready</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    <span className="text-blue-400">Loading</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading Steps */}
        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-300 ${
                step.status === "loading"
                  ? "bg-blue-500/10 border border-blue-500/20"
                  : step.status === "completed"
                  ? "bg-green-500/10 border border-green-500/20"
                  : step.status === "warning"
                  ? "bg-yellow-500/10 border border-yellow-500/20"
                  : step.status === "error"
                  ? "bg-red-500/10 border border-red-500/20"
                  : "bg-gray-800/50"
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStepIcon(step)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className={`text-sm font-medium ${getStepTextColor(step)}`}>
                    {step.label}
                  </p>
                  {step.critical && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Current Step Indicator */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            {loadingState?.error ? (
              <span className="text-red-400">Error: {loadingState.error}</span>
            ) : allCriticalStepsComplete ? (
              <span className="text-green-400">All systems ready! Finalizing...</span>
            ) : (
              <span className="text-blue-400">{loadingState?.currentStep || "Initializing..."}</span>
            )}
          </p>
        </div>

        {/* Manual Continue Button */}
        {(allCriticalStepsComplete || showManualContinue) && loadingState?.progress === 100 && (
          <div className="mt-6 text-center">
            <button
              onClick={onLoadingComplete}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Continue to Dashboard
            </button>
            {showManualContinue && !allCriticalStepsComplete && (
              <p className="text-xs text-yellow-400 mt-2">
                Some features may have limited functionality
              </p>
            )}
          </div>
        )}

        {/* Animated Dots */}
        {!allCriticalStepsComplete && !showManualContinue && (
          <div className="flex justify-center mt-4 space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: "1s",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;