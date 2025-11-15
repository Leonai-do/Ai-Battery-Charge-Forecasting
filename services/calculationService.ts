import { LogEntry, Settings, ProcessedLogEntry, ForecastLogEntry, Summary } from '../types';
import { VOLTAGE_SOC_MAP } from '../constants';

export function voltageToSOC(voltage: number): number {
    if (voltage >= VOLTAGE_SOC_MAP[VOLTAGE_SOC_MAP.length - 1][0]) {
        return 100;
    }
    if (voltage <= VOLTAGE_SOC_MAP[0][0]) {
        return 0;
    }
    
    for (let i = 1; i < VOLTAGE_SOC_MAP.length; i++) {
        const [vHigh, socHigh] = VOLTAGE_SOC_MAP[i];
        if (voltage <= vHigh) {
            const [vLow, socLow] = VOLTAGE_SOC_MAP[i - 1];
            const percent = (voltage - vLow) / (vHigh - vLow);
            return socLow + percent * (socHigh - socLow);
        }
    }
    return 100; // Fallback
}

export function calculateMetrics(
    currentLogData: LogEntry[], 
    settings: Settings
): { processedLog: ProcessedLogEntry[], forecastLog: ForecastLogEntry[], summary: Summary } {
    
    const effectiveCapacityAh = settings.batteryCapacityAh * (settings.batteryHealth / 100);
    const processedLog: ProcessedLogEntry[] = [];
    let totalAhUsed = 0;
    let lastDt: Date | null = null;
    let firstRealVoltage: number | null = null;
    let lastRealLogPoint: ProcessedLogEntry | null = null;

    const sortedLogData = [...currentLogData].sort((a,b) => a.dt.getTime() - b.dt.getTime());

    for (const curr of sortedLogData) {
        if (curr.voltage <= 0) continue;
        
        if (firstRealVoltage === null) firstRealVoltage = curr.voltage;
        
        let currentA = curr.charging ? (curr.milliamps / 1000) * -1 : curr.watts / curr.voltage;
        let hours = lastDt ? (curr.dt.getTime() - lastDt.getTime()) / 3600000 : 0;
        if (hours < 0) hours = 0;

        let usedAh = currentA * hours;
        totalAhUsed += usedAh;
        
        if (totalAhUsed > effectiveCapacityAh) totalAhUsed = effectiveCapacityAh;
        if (totalAhUsed < 0) totalAhUsed = 0;

        const ahRem = effectiveCapacityAh - totalAhUsed;
        const soc = voltageToSOC(curr.voltage);
        
        const processedPoint: ProcessedLogEntry = { ...curr, currentA, ahRem, soc, isForecast: false, hours, usedAh };
        processedLog.push(processedPoint);
        lastDt = curr.dt;
        lastRealLogPoint = processedPoint;
    }

    const forecastLog: ForecastLogEntry[] = [];
    let summary: Summary = {
        soc: 0, ahRemaining: 0, currentDraw: 0, lastVoltage: 0, runtime: 0, timeToFull: 0
    };
    
    if (lastRealLogPoint) {
        let nextDt = new Date(lastRealLogPoint.dt.getTime());
        let currV = lastRealLogPoint.voltage;
        let currAh = lastRealLogPoint.ahRem;
        const forecastStepMinutes = 5;
        const forecastStepHours = forecastStepMinutes / 60;

        if (lastRealLogPoint.charging) {
            // --- Charging Forecast ---
            const chargePoints = processedLog.filter(p => p.charging);
            const totalAhGained = chargePoints.reduce((sum, p) => sum + Math.abs(p.usedAh), 0);
            const vStartCharge = chargePoints.length > 0 ? chargePoints[0].voltage : currV;
            const vGain = currV - vStartCharge;
            
            // Default gain if no data, assumes ~1.5V gain over a full charge cycle
            let vGainPerAh = (totalAhGained > 0.1 && vGain > 0) ? vGain / totalAhGained : 1.5 / effectiveCapacityAh;

            let chargeA = lastRealLogPoint.currentA; // Will be negative
            if (chargeA >= 0) chargeA = -1; // Default 1A charge if something is wrong

            while (currV < settings.chargeVoltageCutoff && currAh < effectiveCapacityAh && forecastLog.length < 576) { // 2 days max
                nextDt = new Date(nextDt.getTime() + forecastStepMinutes * 60 * 1000);
                const ahGainedThisStep = Math.abs(chargeA) * forecastStepHours;

                currAh += ahGainedThisStep;
                currV += vGainPerAh * ahGainedThisStep;

                if (currAh > effectiveCapacityAh) currAh = effectiveCapacityAh;
                if (currV > settings.chargeVoltageCutoff) currV = settings.chargeVoltageCutoff;

                forecastLog.push({
                    dt: nextDt, voltage: currV, ahRem: currAh, soc: voltageToSOC(currV),
                    currentA: chargeA, charging: true, isForecast: true
                });
            }
             summary.timeToFull = (chargeA !== 0) ? (effectiveCapacityAh - lastRealLogPoint.ahRem) / Math.abs(chargeA) : Infinity;
             summary.runtime = 0;

        } else {
            // --- Discharging Forecast ---
            const totalAhDischarged = processedLog.filter(p => !p.charging && p.currentA > 0).reduce((sum, p) => sum + p.usedAh, 0);
            const totalVDrop = firstRealVoltage ? (firstRealVoltage - lastRealLogPoint.voltage) : 0;
            let dropPerAh = (totalAhDischarged > 0.1 && totalVDrop > 0) ? totalVDrop / totalAhDischarged : 0.05;

            const dischargePoints = processedLog.filter(p => !p.charging && p.currentA > 0);
            let avgDrawA = dischargePoints.length > 0 ? dischargePoints.reduce((a, b) => a + b.currentA, 0) / dischargePoints.length : 1;
            let drawA = lastRealLogPoint.currentA || avgDrawA;
            if (drawA <= 0) drawA = 1;

            while (currV > settings.minVoltage && currAh > 0 && forecastLog.length < 288) { // 24 hours max
                nextDt = new Date(nextDt.getTime() + forecastStepMinutes * 60 * 1000);
                const ahUsedThisStep = drawA * forecastStepHours;
                
                currAh -= ahUsedThisStep;
                currV -= dropPerAh * ahUsedThisStep;
                
                if (currAh < 0) currAh = 0;
                if (currV < settings.minVoltage) currV = settings.minVoltage;
                
                forecastLog.push({
                    dt: nextDt, voltage: currV, ahRem: currAh, soc: voltageToSOC(currV),
                    currentA: drawA, charging: false, isForecast: true
                });
            }
            summary.runtime = (drawA > 0) ? (lastRealLogPoint.ahRem / drawA) : Infinity;
            summary.timeToFull = 0;
        }
        
        summary.soc = lastRealLogPoint.soc;
        summary.ahRemaining = lastRealLogPoint.ahRem;
        summary.currentDraw = lastRealLogPoint.currentA;
        summary.lastVoltage = lastRealLogPoint.voltage;
    }

    return { processedLog, forecastLog, summary };
}
