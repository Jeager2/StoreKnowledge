import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Theme {
  id: string;
  name: string;
  description: string;
  preview: string;
}

interface EditorSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  showLineNumbers: boolean;
  spellCheck: boolean;
  wordWrap: boolean;
  tabSize: number;
  autoSave: boolean;
  autoSaveInterval: number;
}

interface AppSettings {
  theme: string;
  sidebarCollapsed: boolean;
  defaultView: 'edit' | 'preview' | 'split';
  enableDataView: boolean;
  enableKanban: boolean;
  enableMermaid: boolean;
  enableLatex: boolean;
}

interface SettingsProps {
  onClose: () => void;
  onSettingsChange: (settings: { editor: EditorSettings, app: AppSettings }) => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'editor' | 'plugins'>('appearance');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<{ editor: EditorSettings, app: AppSettings }>({
    editor: {
      fontSize: 14,
      lineHeight: 1.5,
      fontFamily: 'Menlo, Monaco, Consolas, monospace',
      showLineNumbers: true,
      spellCheck: false,
      wordWrap: true,
      tabSize: 2,
      autoSave: true,
      autoSaveInterval: 30,
    },
    app: {
      theme: 'light',
      sidebarCollapsed: false,
      defaultView: 'split',
      enableDataView: true,
      enableKanban: true,
      enableMermaid: true,
      enableLatex: true,
    }
  });

  useEffect(() => {
    loadSettings();
    loadThemes();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadThemes = async () => {
    try {
      const response = await axios.get('/api/themes');
      setThemes(response.data);
    } catch (error) {
      console.error('Failed to load themes:', error);
    }
  };

  const handleSave = async () => {
    try {
      await axios.post('/api/settings', settings);
      onSettingsChange(settings);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const updateEditorSettings = (key: keyof EditorSettings, value: any) => {
    setSettings({
      ...settings,
      editor: {
        ...settings.editor,
        [key]: value
      }
    });
  };

  const updateAppSettings = (key: keyof AppSettings, value: any) => {
    setSettings({
      ...settings,
      app: {
        ...settings.app,
        [key]: value
      }
    });
  };

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Theme</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className={`border rounded-lg p-3 cursor-pointer transition-all ${
                settings.app.theme === theme.id
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => updateAppSettings('theme', theme.id)}
            >
              <div
                className="h-24 mb-2 rounded bg-cover bg-center"
                style={{ backgroundImage: `url(${theme.preview})` }}
              ></div>
              <div className="font-medium">{theme.name}</div>
              <div className="text-sm text-gray-500">{theme.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Interface</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="defaultView" className="font-medium">Default View</label>
            <select
              id="defaultView"
              value={settings.app.defaultView}
              onChange={(e) => updateAppSettings('defaultView', e.target.value)}
              className="rounded border-gray-300 shadow-sm"
            >
              <option value="edit">Edit</option>
              <option value="preview">Preview</option>
              <option value="split">Split</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">Sidebar Collapsed by Default</span>
            <input
              type="checkbox"
              checked={settings.app.sidebarCollapsed}
              onChange={(e) => updateAppSettings('sidebarCollapsed', e.target.checked)}
              className="rounded border-gray-300 shadow-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderEditorTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Text Editing</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="fontSize" className="font-medium">Font Size (px)</label>
            <div className="flex items-center">
              <input
                id="fontSize"
                type="range"
                min="10"
                max="24"
                value={settings.editor.fontSize}
                onChange={(e) => updateEditorSettings('fontSize', parseInt(e.target.value))}
                className="mr-2 w-32"
              />
              <span>{settings.editor.fontSize}px</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="lineHeight" className="font-medium">Line Height</label>
            <div className="flex items-center">
              <input
                id="lineHeight"
                type="range"
                min="1"
                max="2"
                step="0.1"
                value={settings.editor.lineHeight}
                onChange={(e) => updateEditorSettings('lineHeight', parseFloat(e.target.value))}
                className="mr-2 w-32"
              />
              <span>{settings.editor.lineHeight}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="fontFamily" className="font-medium">Font Family</label>
            <select
              id="fontFamily"
              value={settings.editor.fontFamily}
              onChange={(e) => updateEditorSettings('fontFamily', e.target.value)}
              className="rounded border-gray-300 shadow-sm"
            >
              <option value="Menlo, Monaco, Consolas, monospace">Menlo</option>
              <option value="'Fira Code', monospace">Fira Code</option>
              <option value="'Source Code Pro', monospace">Source Code Pro</option>
              <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
              <option value="'Courier New', monospace">Courier New</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">Show Line Numbers</span>
            <input
              type="checkbox"
              checked={settings.editor.showLineNumbers}
              onChange={(e) => updateEditorSettings('showLineNumbers', e.target.checked)}
              className="rounded border-gray-300 shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">Word Wrap</span>
            <input
              type="checkbox"
              checked={settings.editor.wordWrap}
              onChange={(e) => updateEditorSettings('wordWrap', e.target.checked)}
              className="rounded border-gray-300 shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">Spell Check</span>
            <input
              type="checkbox"
              checked={settings.editor.spellCheck}
              onChange={(e) => updateEditorSettings('spellCheck', e.target.checked)}
              className="rounded border-gray-300 shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="tabSize" className="font-medium">Tab Size</label>
            <select
              id="tabSize"
              value={settings.editor.tabSize}
              onChange={(e) => updateEditorSettings('tabSize', parseInt(e.target.value))}
              className="rounded border-gray-300 shadow-sm"
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="8">8 spaces</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Auto Save</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Enable Auto Save</span>
            <input
              type="checkbox"
              checked={settings.editor.autoSave}
              onChange={(e) => updateEditorSettings('autoSave', e.target.checked)}
              className="rounded border-gray-300 shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="autoSaveInterval" className="font-medium">Auto Save Interval (seconds)</label>
            <select
              id="autoSaveInterval"
              value={settings.editor.autoSaveInterval}
              onChange={(e) => updateEditorSettings('autoSaveInterval', parseInt(e.target.value))}
              disabled={!settings.editor.autoSave}
              className="rounded border-gray-300 shadow-sm"
            >
              <option value="10">10 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPluginsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Features</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">DataView</span>
              <p className="text-sm text-gray-500">Create dynamic tables from your data</p>
            </div>
            <input
              type="checkbox"
              checked={settings.app.enableDataView}
              onChange={(e) => updateAppSettings('enableDataView', e.target.checked)}
              className="rounded border-gray-300 shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Kanban Boards</span>
              <p className="text-sm text-gray-500">Visualize tasks in Kanban format</p>
            </div>
            <input
              type="checkbox"
              checked={settings.app.enableKanban}
              onChange={(e) => updateAppSettings('enableKanban', e.target.checked)}
              className="rounded border-gray-300 shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Mermaid Diagrams</span>
              <p className="text-sm text-gray-500">Create flow charts and diagrams</p>
            </div>
            <input
              type="checkbox"
              checked={settings.app.enableMermaid}
              onChange={(e) => updateAppSettings('enableMermaid', e.target.checked)}
              className="rounded border-gray-300 shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">LaTeX Support</span>
              <p className="text-sm text-gray-500">Render mathematical formulas</p>
            </div>
            <input
              type="checkbox"
              checked={settings.app.enableLatex}
              onChange={(e) => updateAppSettings('enableLatex', e.target.checked)}
              className="rounded border-gray-300 shadow-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-3xl mx-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Settings</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          &times;
        </button>
      </div>

      <div className="flex border-b">
        <div
          className={`px-6 py-3 cursor-pointer font-medium ${
            activeTab === 'appearance' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('appearance')}
        >
          Appearance
        </div>
        <div
          className={`px-6 py-3 cursor-pointer font-medium ${
            activeTab === 'editor' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('editor')}
        >
          Editor
        </div>
        <div
          className={`px-6 py-3 cursor-pointer font-medium ${
            activeTab === 'plugins' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('plugins')}
        >
          Plugins
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'appearance' && renderAppearanceTab()}
            {activeTab === 'editor' && renderEditorTab()}
            {activeTab === 'plugins' && renderPluginsTab()}
          </>
        )}
      </div>

      <div className="px-6 py-4 border-t flex justify-end space-x-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default Settings;