export interface Settings {
    batteryCapacityAh: number;
    nominalVoltage: number;
    upsRatedW: number;
    minVoltage: number;
    batteryHealth: number;
    chargeVoltageCutoff: number;
}

export interface LogEntry {
    date: string;
    time: string;
    voltage: number;
    watts: number;
    inputVoltage: number;
    milliamps: number;
    charging: boolean;
    dt: Date;
}

export interface ProcessedLogEntry extends LogEntry {
    currentA: number;
    ahRem: number;
    soc: number;
    isForecast: boolean;
    hours: number;
    usedAh: number;
}

export interface ForecastLogEntry {
    dt: Date;
    voltage: number;
    ahRem: number;
    soc: number;
    currentA: number;
    charging: boolean;
    isForecast: true;
}

export interface Summary {
    soc: number;
    ahRemaining: number;
    currentDraw: number;
    lastVoltage: number;
    runtime: number; // in hours, for discharging
    timeToFull: number; // in hours, for charging
}

export interface DataLogProps {
    logData: LogEntry[];
    processedLog: ProcessedLogEntry[];
    onAddRow: () => void;
    onDeleteRow: (index: number) => void;
    onUpdateRow: (index: number, updatedEntry: LogEntry) => void;
}
