import React from 'react';
import { DataLogProps } from '../types';

const DataLog: React.FC<DataLogProps> = ({ logData, processedLog, onAddRow, onDeleteRow, onUpdateRow }) => {
    const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const entry = logData[index];
        
        let newValue: string | number | boolean = value;
        if (type === 'number') {
            newValue = parseFloat(value) || 0;
        } else if (name === 'charging') {
            newValue = value === 'true';
        }

        const updatedEntry = {
            ...entry,
            [name]: newValue,
        };

        if (name === 'date' || name === 'time') {
            updatedEntry.dt = new Date(`${updatedEntry.date}T${updatedEntry.time}`);
        }

        onUpdateRow(index, updatedEntry);
    };

    const tableInputClasses = "w-full bg-transparent border border-transparent rounded p-2 hover:border-gray-600 focus:bg-gray-900 focus:border-blue-500 focus:outline-none disabled:text-gray-400 disabled:hover:border-transparent";

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold">Data Log</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Voltage (V)</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Consumption (W)</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Input (V)</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" title="For discharge, this is calculated. For charging, enter your charger's current in mA.">
                                Charge Current (mA)
                            </th>
                            <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Charging</th>
                            <th className="p-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 md:divide-y-0 responsive-table">
                        {logData.map((row, index) => {
                            const processedEntry = processedLog.find(p => p.dt.getTime() === row.dt.getTime());
                            const isCharging = row.charging;
                            const currentDisplayValue = isCharging 
                                ? row.milliamps 
                                : (processedEntry ? Math.round(processedEntry.currentA * 1000) : 0);

                            return (
                                <tr key={index} className="hover:bg-gray-900/50">
                                    <td data-label="Date" className="p-1"><input type="date" name="date" value={row.date} onChange={e => handleInputChange(index, e)} className={tableInputClasses} /></td>
                                    <td data-label="Time" className="p-1"><input type="time" name="time" value={row.time} onChange={e => handleInputChange(index, e)} className={tableInputClasses} /></td>
                                    <td data-label="Voltage (V)" className="p-1"><input type="number" name="voltage" value={row.voltage} onChange={e => handleInputChange(index, e)} className={tableInputClasses} step="0.01" /></td>
                                    <td data-label="Consumption (W)" className="p-1"><input type="number" name="watts" value={row.watts} onChange={e => handleInputChange(index, e)} className={tableInputClasses} step="0.1" /></td>
                                    <td data-label="Input (V)" className="p-1"><input type="number" name="inputVoltage" value={row.inputVoltage} onChange={e => handleInputChange(index, e)} className={tableInputClasses} step="0.1" /></td>
                                    <td data-label="Charge Current (mA)" className="p-1">
                                        <input 
                                            type="number" 
                                            name="milliamps" 
                                            value={currentDisplayValue} 
                                            onChange={e => handleInputChange(index, e)} 
                                            className={tableInputClasses} 
                                            step="50"
                                            disabled={!isCharging}
                                            title={isCharging ? "Enter charge current in mA" : "Calculated discharge current"}
                                        />
                                    </td>
                                    <td data-label="Charging" className="p-1">
                                        <select name="charging" value={String(row.charging)} onChange={e => handleInputChange(index, e)} className={`${tableInputClasses} bg-gray-800`}>
                                            <option value="false">No</option>
                                            <option value="true">Yes</option>
                                        </select>
                                    </td>
                                    <td data-label="Actions" className="p-1 text-center md:text-center">
                                        <button onClick={() => onDeleteRow(index)} className="p-2 text-white bg-red-600 rounded hover:bg-red-700 transition-colors w-full md:w-auto">X</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="p-4 bg-gray-900 border-t border-gray-700">
                <button onClick={onAddRow} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">Add Row</button>
            </div>
        </div>
    );
};

export default DataLog;