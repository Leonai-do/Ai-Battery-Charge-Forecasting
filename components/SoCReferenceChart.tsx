import React, { useState } from 'react';
import { VOLTAGE_SOC_MAP } from '../constants';

interface SoCReferenceChartProps {
    currentVoltage: number;
    currentSoC: number;
}

const SoCReferenceChart: React.FC<SoCReferenceChartProps> = ({ currentVoltage, currentSoC }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getSoCColor = (capacity: number): string => {
        if (capacity > 40) return 'bg-green-600/50'; // Green zone
        if (capacity > 20) return 'bg-yellow-500/50'; // Yellow zone
        return 'bg-red-600/50'; // Red zone
    };
    
    const reversedMap = [...VOLTAGE_SOC_MAP].reverse();

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold">SoC Reference Chart (Flooded Lead-Acid)</h2>
            </div>
            <div className="p-4">
                {/* Current Status Row */}
                <div title="This is the last measured real-time status of your battery." className={`flex p-2 rounded-md font-semibold border-2 border-blue-400/80 ${getSoCColor(currentSoC)}`}>
                    <div className="w-1/3 text-left pl-2 my-auto">Current Status</div>
                    <div className="w-1/3 text-center font-mono text-lg">{currentVoltage > 0 ? `${currentVoltage.toFixed(2)}V` : '-- V'}</div>
                    <div className="w-1/3 text-center font-bold text-lg">{currentSoC > 0 ? `${currentSoC.toFixed(1)}%` : '-- %'}</div>
                </div>

                <button 
                    onClick={() => setIsExpanded(!isExpanded)} 
                    className="mt-4 w-full text-center text-blue-400 hover:text-blue-300 font-medium py-2 rounded-md hover:bg-gray-700/50 transition-colors"
                    aria-expanded={isExpanded}
                >
                    {isExpanded ? 'Hide' : 'Show'} Full Reference Chart
                </button>

                {isExpanded && (
                    <div className="mt-4 transition-all duration-300 ease-in-out">
                        <div className="flex bg-gray-700 p-2 rounded-t-md font-semibold">
                            <div className="w-1/2 text-center">Voltage</div>
                            <div className="w-1/2 text-center">Capacity</div>
                        </div>
                        <div className="space-y-1 mt-1">
                            {reversedMap.map(([voltage, capacity]) => (
                                <div key={voltage} className={`flex p-2 rounded-md ${getSoCColor(capacity)}`}>
                                    <div className="w-1/2 text-center font-mono">{voltage.toFixed(2)}V</div>
                                    <div className="w-1/2 text-center font-bold">{capacity}%</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SoCReferenceChart;
