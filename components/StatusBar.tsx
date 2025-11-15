import React from 'react';
import { Summary } from '../types';

interface StatusBarProps {
    summary: Summary;
    batteryHealth: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ summary, batteryHealth }) => {
    const formatHours = (hours: number): string => {
        if (!isFinite(hours) || hours <= 0) return "--:--:--";
        const totalSeconds = Math.floor(hours * 3600);
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const getSoCColor = (soc: number) => {
        if (soc > 60) return 'text-green-400';
        if (soc > 20) return 'text-yellow-400';
        return 'text-red-400';
    };

    const isCharging = summary.currentDraw < 0;
    
    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Live Calculations & Forecast</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div>
                    <span className="block text-sm font-medium text-gray-400">SoC (Health)</span>
                    <span className={`text-2xl font-bold ${getSoCColor(summary.soc)}`}>
                        {`${summary.soc.toFixed(1)}%`}
                        <span className="text-base font-medium text-gray-400 ml-1" title="Battery Health">({batteryHealth}%)</span>
                    </span>
                </div>
                <StatusItem label="Ah Remaining" value={`${summary.ahRemaining.toFixed(2)} Ah`} color="text-blue-400" />
                <StatusItem label={isCharging ? "Charge Current" : "Current Draw"} value={`${Math.abs(summary.currentDraw).toFixed(2)} A`} color={isCharging ? "text-green-400" : "text-yellow-400"} />
                <StatusItem label="Last Voltage" value={`${summary.lastVoltage.toFixed(2)} V`} />
                {isCharging ? (
                    <StatusItem label="Est. Time to Full" value={formatHours(summary.timeToFull)} color="text-green-400" />
                ) : (
                    <StatusItem label="Est. Runtime Left" value={formatHours(summary.runtime)} color="text-red-400" />
                )}
            </div>
        </div>
    );
};

interface StatusItemProps {
    label: string;
    value: string;
    color?: string;
}

const StatusItem: React.FC<StatusItemProps> = ({ label, value, color = 'text-gray-100' }) => (
    <div>
        <span className="block text-sm font-medium text-gray-400">{label}</span>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
);

export default StatusBar;
