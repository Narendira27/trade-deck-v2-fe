import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";
import cookies from "js-cookie";
import { toast } from "sonner";
import Spinner from "../spinner";

interface KeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface KeyData {
  apiKey: string;
  secretKey: string;
  keyType: "marketdata" | "interactive";
}

interface SavedKey {
  id: string;
  apiKey: string;
  apiSecret: string;
  keyName: string;
  keyType: "marketdata" | "interactive";
  createdAt: string;
}

const KeyModal: React.FC<KeyModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<KeyData>({
    apiKey: "",
    secretKey: "",
    keyType: "interactive",
  });

  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>("key-1");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
    }
  }, [isOpen]);

  const fetchKeys = async () => {
    const auth = cookies.get("auth");
    try {
      const response = await axios.get(`${API_URL}/user/keys`, {
        headers: {
          Authorization: `Bearer ${auth}`,
        },
      });
      setSavedKeys(response.data.keys);
      setFormData({
        apiKey: response.data.keys[0].apiKey,
        secretKey: response.data.keys[0].apiSecret,
        keyType: "interactive",
      });
      setLoading(false);
    } catch {
      toast.error("Failed to fetch saved keys");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = cookies.get("auth");

    const keyRequest = axios.put(
      `${API_URL}/user/keys?keyName=${selectedKeyId}`,
      { apiKey: formData.apiKey, apiSecret: formData.secretKey },
      {
        headers: {
          Authorization: `Bearer ${auth}`,
          "Content-Type": "application/json",
        },
      }
    );

    toast.promise(keyRequest, {
      loading: "Adding API Key...",
      success: () => {
        fetchKeys();
        setFormData({
          apiKey: "",
          secretKey: "",
          keyType: "interactive",
        });
        setSelectedKeyId("key-1");
        return "API Key added successfully!";
      },
      error: "Failed to add API Key. Please try again.",
    });
  };

  const handleKeyCardClick = (keyNum: number) => {
    const keyId = `key-${keyNum}`;
    setSelectedKeyId(keyId);
    const getKeyType = keyNum === 1 ? "interactive" : "marketdata";
    const getId = keyNum - 1;
    setFormData({
      apiKey: savedKeys[getId].apiKey,
      secretKey: savedKeys[getId].apiSecret,
      keyType: getKeyType,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-400  rounded-lg p-6 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">API Keys</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        {loading === false ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[1, 2, 3].map((keyNum) => {
                const keyId = `key-${keyNum}`;
                const key = savedKeys.find((k) => k.keyName === keyId);
                const isSelected = selectedKeyId === keyId;

                return (
                  <div
                    key={keyNum}
                    className={`bg-gray-700 p-4 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => handleKeyCardClick(keyNum)}
                  >
                    <p className="text-white text-lg mb-2">
                      {keyNum === 1 ? "Interactive Key" : "MarketData Key"}
                    </p>
                    {key ? (
                      <p className="text-sm text-gray-400">key configured</p>
                    ) : (
                      <p className="text-sm text-gray-400">No key configured</p>
                    )}
                  </div>
                );
              })}
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Key Type
                </label>
                <select
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-not-allowed"
                  value={formData.keyType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      keyType: e.target.value as "marketdata" | "interactive",
                    })
                  }
                  disabled
                >
                  <option value="marketdata">Market Data</option>
                  <option value="interactive">Interactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  value={formData.apiKey}
                  onChange={(e) =>
                    setFormData({ ...formData, apiKey: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Secret Key
                </label>
                <input
                  type="password"
                  value={formData.secretKey}
                  onChange={(e) =>
                    setFormData({ ...formData, secretKey: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  {selectedKeyId ? "Update Key" : "Add Key"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="h-40">
            <Spinner />
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyModal;
