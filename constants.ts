import { Settings, LogEntry } from './types';

// SoC Lookup Table: [Voltage, SoC %] - Updated based on user-provided flooded lead-acid chart.
export const VOLTAGE_SOC_MAP: [number, number][] = [
    [11.59, 0],   [11.63, 10],  [11.76, 20],  [11.87, 30],  [11.97, 40],
    [12.07, 50],  [12.18, 60],  [12.29, 70],  [12.41, 80],  [12.53, 90],
    [12.64, 100]
];


export const DEFAULT_SETTINGS: Settings = {
    batteryCapacityAh: 80,
    nominalVoltage: 12,
    upsRatedW: 500,
    minVoltage: 11.59, // Updated to match the 0% point from the new SOC map.
    batteryHealth: 100,
    chargeVoltageCutoff: 13.8,
};

// Updated with the latest data from the user's spreadsheet.
// Milliamps for discharge are calculated dynamically by the UI.
// A realistic charge current is used for the charging event.
export const DEFAULT_LOG_DATA: Omit<LogEntry, 'dt'>[] = [
    // Discharging phase from spreadsheet
    { date: "2025-11-15", time: "14:18", voltage: 12.62, watts: 36.9, inputVoltage: 0, milliamps: 0, charging: false },
    { date: "2025-11-15", time: "15:11", voltage: 12.49, watts: 36.6, inputVoltage: 0, milliamps: 0, charging: false },
    { date: "2025-11-15", time: "15:16", voltage: 12.48, watts: 36.6, inputVoltage: 0, milliamps: 0, charging: false },
    { date: "2025-11-15", time: "15:29", voltage: 12.46, watts: 36.6, inputVoltage: 0, milliamps: 0, charging: false },
    { date: "2025-11-15", time: "15:47", voltage: 12.42, watts: 36.9, inputVoltage: 0, milliamps: 0, charging: false },
    { date: "2025-11-15", time: "15:50", voltage: 12.41, watts: 36.9, inputVoltage: 0, milliamps: 0, charging: false },
    { date: "2025-11-15", time: "16:01", voltage: 12.38, watts: 36.9, inputVoltage: 0, milliamps: 0, charging: false },
    { date: "2025-11-15", time: "16:05", voltage: 12.37, watts: 36.9, inputVoltage: 0, milliamps: 0, charging: false },
    { date: "2025-11-15", time: "16:15", voltage: 12.34, watts: 36.9, inputVoltage: 0, milliamps: 0, charging: false },
    { date: "2025-11-15", time: "16:19", voltage: 12.33, watts: 36.9, inputVoltage: 0, milliamps: 0, charging: false },
    { date: "2025-11-15", time: "16:24", voltage: 12.30, watts: 36.9, inputVoltage: 0, milliamps: 0, charging: false },
    
    // Charging phase from spreadsheet
    { date: "2025-11-15", time: "16:46", voltage: 12.91, watts: 36.9, inputVoltage: 13.8, milliamps: 3500, charging: true },
];
