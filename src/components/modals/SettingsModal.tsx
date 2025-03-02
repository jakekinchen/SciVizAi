import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Switch } from '@headlessui/react';
import { useModels } from '../../hooks/useModels';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    selectedModel: string;
    useInteractiveMode: boolean;
    geometryModel?: string;
    animationModel?: string;
  };
  onSettingsChange: (settings: { 
    selectedModel: string; 
    useInteractiveMode: boolean;
    geometryModel?: string;
    animationModel?: string;
  }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings,
  onSettingsChange,
}) => {
  const { models, loading, error } = useModels();
  
  if (!isOpen) return null;

  const renderModelOptions = () => {
    if (loading) return <option>Loading models...</option>;
    if (error) return <option>Error loading models: {error}</option>;
    return models.map((model) => (
      <option key={model.name} value={model.name}>
        {model.display_name} ({model.provider})
      </option>
    ));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose} />

        <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-gray-800 rounded-lg shadow-xl">
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <h2 className="text-2xl font-semibold mb-6 text-white">Settings</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Global Model Selection
              </label>
              <select
                value={settings.selectedModel}
                onChange={(e) => onSettingsChange({ 
                  ...settings, 
                  selectedModel: e.target.value 
                })}
                className="w-full bg-gray-700 border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">-- Select a global model --</option>
                {renderModelOptions()}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                This model will be used for all agents unless overridden below.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Geometry Agent Model
              </label>
              <select
                value={settings.geometryModel || ""}
                onChange={(e) => onSettingsChange({ 
                  ...settings, 
                  geometryModel: e.target.value || undefined
                })}
                className="w-full bg-gray-700 border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">-- Use global model --</option>
                {renderModelOptions()}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Override the model used specifically for generating geometry.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Animation Agent Model
              </label>
              <select
                value={settings.animationModel || ""}
                onChange={(e) => onSettingsChange({ 
                  ...settings, 
                  animationModel: e.target.value || undefined
                })}
                className="w-full bg-gray-700 border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">-- Use global model --</option>
                {renderModelOptions()}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Override the model used specifically for generating animations.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">
                Use Interactive Mode
              </span>
              <Switch
                checked={settings.useInteractiveMode}
                onChange={(checked) => onSettingsChange({ 
                  ...settings, 
                  useInteractiveMode: checked 
                })}
                className={`${
                  settings.useInteractiveMode ? 'bg-blue-600' : 'bg-gray-600'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800`}
              >
                <span
                  className={`${
                    settings.useInteractiveMode ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 