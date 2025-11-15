import React, { useState, useMemo, useCallback } from 'react';
import { Settings, LogEntry } from './types';
import { DEFAULT_LOG_DATA, DEFAULT_SETTINGS } from './constants';
import { calculateMetrics } from './services/calculationService';
import SettingsPanel from './components/SettingsPanel';
import StatusBar from './components/StatusBar';
import AISummary from './components/AISummary';
import DataLog from './components/DataLog';
import ChargeChart from './components/ChargeChart';
import DischargeChart from './components/DischargeChart';
import SoCReferenceChart from './components/SoCReferenceChart';

const App: React.FC = () => {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [logData, setLogData] = useState<LogEntry[]>(
        DEFAULT_LOG_DATA.map(d => ({...d, dt: new Date(`${d.date}T${d.time}`) }))
    );

    const sortedLogData = useMemo(() => 
        [...logData].sort((a, b) => a.dt.getTime() - b.dt.getTime()), 
    [logData]);

    const { processedLog, forecastLog, summary } = useMemo(
        () => calculateMetrics(sortedLogData, settings),
        [sortedLogData, settings]
    );

    const chargeLog = useMemo(() => processedLog.filter(p => p.charging), [processedLog]);
    const dischargeLog = useMemo(() => processedLog.filter(p => !p.charging), [processedLog]);
    
    const isForecastingCharge = useMemo(() => {
        if (processedLog.length === 0) return false;
        const lastRealPoint = processedLog[processedLog.length - 1];
        return lastRealPoint ? lastRealPoint.charging : false;
    }, [processedLog]);

    const handleSettingsChange = useCallback((newSettings: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    const handleAddRow = useCallback(() => {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].substring(0, 5);
        
        const newRow: LogEntry = {
            date, time, voltage: 12.0, watts: 0, 
            inputVoltage: 0, milliamps: 0, charging: false, dt: now
        };
        setLogData(prev => [...prev, newRow]);
    }, []);

    const handleDeleteRow = useCallback((index: number) => {
        setLogData(prev => {
            const objectToDelete = sortedLogData[index];
            return prev.filter(item => item !== objectToDelete);
        });
    }, [sortedLogData]);

    const handleLogUpdate = useCallback((index: number, updatedEntry: LogEntry) => {
        setLogData(prev => {
            const objectToUpdate = sortedLogData[index];
            return prev.map(item => item === objectToUpdate ? updatedEntry : item);
        });
    }, [sortedLogData]);

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-center text-gray-100">UPS Battery Runtime Forecaster</h1>
            </header>

            <main className="space-y-6">
                <SettingsPanel settings={settings} onChange={handleSettingsChange} />
                <StatusBar summary={summary} batteryHealth={settings.batteryHealth} />
                <AISummary 
                    processedLog={processedLog} 
                    summary={summary}
                    settings={settings}
                />
                <DataLog 
                    logData={sortedLogData}
                    processedLog={processedLog}
                    onAddRow={handleAddRow}
                    onDeleteRow={handleDeleteRow}
                    onUpdateRow={handleLogUpdate}
                />

                <SoCReferenceChart currentVoltage={summary.lastVoltage} currentSoC={summary.soc} />
                
                {dischargeLog.length > 0 && (
                    <DischargeChart 
                        dischargeLog={dischargeLog}
                        dischargeForecastLog={!isForecastingCharge ? forecastLog : []}
                        settings={settings}
                    />
                )}
                
                {chargeLog.length > 0 && (
                    <ChargeChart
                        chargeLog={chargeLog}
                        chargeForecastLog={isForecastingCharge ? forecastLog : []}
                        settings={settings}
                    />
                )}
            </main>
        </div>
    );
};

export default App;
