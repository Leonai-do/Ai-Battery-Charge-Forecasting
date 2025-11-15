import React from 'react';
import { Settings } from '../types';

interface SettingsPanelProps {
    settings: Settings;
    onChange: (newSettings: Partial<Settings>) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange }) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ [e.target.name]: parseFloat(e.target.value) });
    };

    const inputClasses = "mt-1 block w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-md p-2 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500";
    
    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">System Settings</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="batteryCapacityAh" className="block text-sm font-medium text-gray-400">Battery Capacity (Ah)</label>
                    <input type="number" id="batteryCapacityAh" name="batteryCapacityAh" value={settings.batteryCapacityAh} onChange={handleInputChange} className={inputClasses} />
                </div>
                <div>
                    <label htmlFor="nominalVoltage" className="block text-sm font-medium text-gray-400">Nominal Voltage (V)</label>
                    <input type="number" id="nominalVoltage" name="nominalVoltage" value={settings.nominalVoltage} className={inputClasses} disabled />
                </div>
                <div>
                    <label htmlFor="upsRatedW" className="block text-sm font-medium text-gray-400">UPS Rated (W)</label>
                    <input type="number" id="upsRatedW" name="upsRatedW" value={settings.upsRatedW} onChange={handleInputChange} className={inputClasses} />
                </div>
                <div>
                    <label htmlFor="minVoltage" className="block text-sm font-medium text-gray-400">Min Discharge (V)</label>
                    <input type="number" id="minVoltage" name="minVoltage" value={settings.minVoltage} onChange={handleInputChange} className={inputClasses} step="0.1" />
                </div>
                <div>
                    <label htmlFor="chargeVoltageCutoff" className="block text-sm font-medium text-gray-400">Max Charge (V)</label>
                    <input type="number" id="chargeVoltageCutoff" name="chargeVoltageCutoff" value={settings.chargeVoltageCutoff} onChange={handleInputChange} className={inputClasses} step="0.1" />
                </div>
                <div>
                    <label htmlFor="batteryHealth" className="block text-sm font-medium text-gray-400">Battery Health (%)</label>
                    <input type="number" id="batteryHealth" name="batteryHealth" value={settings.batteryHealth} onChange={handleInputChange} className={inputClasses} min="0" max="100" />
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
