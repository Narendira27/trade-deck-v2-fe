import React, { useState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import useStore from "../store/store";

const DraggableBoxManager: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    expiry: "",
    index: "",
    ltpRange: "",
  });

  const { indexData, showDraggable, setDraggableData, setShowDraggable } =
    useStore();

  const handleAddBox = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.index && formData.expiry) {
      setDraggableData([
        {
          id: Date.now().toString(),
          index: formData.index,
          expiry: formData.expiry,
          ltpRange: formData.ltpRange,
        },
      ]);
      setFormData({
        expiry: "",
        index: "",
        ltpRange: "",
      });
      setShowForm(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-4 right-4 bg-blue-500 p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
      >
        <Plus size={24} />
      </button>
      <button
        onClick={() => setShowDraggable()}
        className="fixed bottom-4 right-20 bg-blue-500 p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
      >
        {showDraggable === true ? <Eye /> : <EyeOff />}
      </button>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-500 p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-semibold mb-4">Add Row</h3>
            <form onSubmit={handleAddBox}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Index
                  </label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.index}
                    onChange={(e) =>
                      setFormData({ ...formData, index: e.target.value })
                    }
                  >
                    <option value="" disabled hidden>
                      Select Index
                    </option>
                    {indexData.indices.length > 0
                      ? indexData.indices.map((each) => (
                          <option key={each} value={each.toUpperCase()}>
                            {each.toUpperCase()}
                          </option>
                        ))
                      : null}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Expiry
                  </label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.expiry}
                    onChange={(e) =>
                      setFormData({ ...formData, expiry: e.target.value })
                    }
                  >
                    <option value="" disabled hidden>
                      Select Expiry
                    </option>
                    {indexData.expiry[formData.index.toLowerCase()]?.length >
                      0 &&
                      indexData.expiry[formData.index.toLowerCase()].map(
                        (each) => (
                          <option key={each} value={each.toUpperCase()}>
                            {each.toUpperCase()}
                          </option>
                        )
                      )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    LTP Range
                  </label>
                  <input
                    type="number"
                    value={formData.ltpRange}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ltpRange: e.target.value,
                      })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Add Box
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraggableBoxManager;
