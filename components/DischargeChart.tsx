import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ProcessedLogEntry, ForecastLogEntry, Settings } from '../types';
import { voltageToSOC } from '../services/calculationService';

interface DischargeChartProps {
    dischargeLog: ProcessedLogEntry[];
    dischargeForecastLog: ForecastLogEntry[];
    settings: Settings;
}

type CombinedDataPoint = ProcessedLogEntry | ForecastLogEntry;

const DischargeChart: React.FC<DischargeChartProps> = ({ dischargeLog, dischargeForecastLog, settings }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [view, setView] = useState({ minTime: 0, maxTime: 0 });
    const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
    const [seriesVisibility, setSeriesVisibility] = useState({ voltage: true, ah: true });
    const panState = useRef({ isDragging: false, lastPanX: 0 });

    const allData = useMemo(() => [...dischargeLog, ...dischargeForecastLog], [dischargeLog, dischargeForecastLog]);
    const chartPadding = useMemo(() => ({ top: 40, right: 50, bottom: 40, left: 50 }), []);

    const baseView = useMemo(() => {
        if (allData.length === 0) {
            const now = Date.now();
            return { min: now - 3600 * 1000, max: now + 3600 * 1000 };
        }
        const minTime = allData[0].dt.getTime();
        const maxTime = allData[allData.length - 1].dt.getTime();
        const timeRange = maxTime - minTime;
        return {
            min: minTime - Math.max(timeRange * 0.1, 600000),
            max: maxTime + Math.max(timeRange * 0.2, 1800000),
        };
    }, [allData]);
    
    const voltageRange = useMemo(() => {
        if (allData.length === 0) return { min: 11, max: 14 };
        return {
            min: Math.floor(Math.min(settings.minVoltage - 0.5, ...allData.map(p => p.voltage)) - 0.2),
            max: Math.ceil(Math.max(...allData.map(p => p.voltage), 13.0) + 0.5),
        }
    }, [allData, settings.minVoltage]);

    const ahRange = useMemo(() => ({
        min: 0,
        max: settings.batteryCapacityAh * (settings.batteryHealth / 100),
    }), [settings.batteryCapacityAh, settings.batteryHealth]);

    const resetZoom = useCallback(() => {
        setView({ minTime: baseView.min, maxTime: baseView.max });
    }, [baseView]);

    useEffect(() => {
        resetZoom();
    }, [resetZoom]);
    
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const chartArea = {
            x: chartPadding.left,
            y: chartPadding.top,
            width: rect.width - chartPadding.left - chartPadding.right,
            height: rect.height - chartPadding.top - chartPadding.bottom,
        };

        const mapX = (time: number) => chartArea.x + ((time - view.minTime) / (view.maxTime - view.minTime)) * chartArea.width;
        const unmapX = (pixelX: number) => view.minTime + ((pixelX - chartArea.x) / chartArea.width) * (view.maxTime - view.minTime);
        const mapY_V = (v: number) => chartArea.y + chartArea.height - ((v - voltageRange.min) / (voltageRange.max - voltageRange.min)) * chartArea.height;
        const mapY_Ah = (ah: number) => chartArea.y + chartArea.height - ((ah - ahRange.min) / (ahRange.max - ahRange.min)) * chartArea.height;
        
        ctx.clearRect(0, 0, rect.width, rect.height);
        drawGridAndAxes(ctx, chartArea, view, voltageRange, ahRange, mapX, mapY_V, mapY_Ah);

        if (allData.length === 0) {
            ctx.fillStyle = '#9ca3af';
            ctx.textAlign = 'center';
            ctx.fillText("No discharge data to display.", rect.width / 2, rect.height / 2);
            return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(chartArea.x, chartArea.y, chartArea.width, chartArea.height);
        ctx.clip();
        
        if (seriesVisibility.voltage) {
            drawDataLines(ctx, dischargeLog, mapX, mapY_V, 2, false);
            drawDataLines(ctx, dischargeForecastLog, mapX, mapY_V, 2, true);
        }
        if (seriesVisibility.ah) {
            drawDataLines(ctx, allData, mapX, mapY_Ah, 1.5, false, '#3b82f6');
        }
        
        if (hoverPos && hoverPos.x > chartArea.x && hoverPos.x < chartArea.x + chartArea.width && allData.length > 0) {
            const timeAtMouse = unmapX(hoverPos.x);
            const nearestPoint = allData.reduce((prev, curr) => 
                Math.abs(curr.dt.getTime() - timeAtMouse) < Math.abs(prev.dt.getTime() - timeAtMouse) ? curr : prev
            );
            drawCrosshair(ctx, chartArea, mapX(nearestPoint.dt.getTime()));
            drawTooltip(ctx, chartArea, nearestPoint, mapX, mapY_V, mapY_Ah, seriesVisibility);
        }

        ctx.restore();
    }, [view, allData, voltageRange, ahRange, chartPadding, hoverPos, seriesVisibility, settings.batteryHealth, dischargeLog, dischargeForecastLog]);

    useEffect(() => {
        const handleResize = () => draw();
        window.addEventListener('resize', handleResize);
        draw();
        return () => window.removeEventListener('resize', handleResize);
    }, [draw]);

    const handleRefresh = useCallback(() => draw(), [draw]);
    
    const toggleSeries = useCallback((seriesKey: 'voltage' | 'ah') => {
        setSeriesVisibility(prev => ({ ...prev, [seriesKey]: !prev[seriesKey] }));
    }, []);

    const zoomAt = useCallback((pixelX: number, factor: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const chartAreaWidth = rect.width - chartPadding.left - chartPadding.right;

        const timeRange = view.maxTime - view.minTime;
        if (factor < 1 && timeRange < 60000) return; 
        
        const timeAtMouse = view.minTime + ((pixelX - chartPadding.left) / chartAreaWidth) * (view.maxTime - view.minTime);
        
        setView(prev => ({
            minTime: timeAtMouse - (timeAtMouse - prev.minTime) * factor,
            maxTime: timeAtMouse + (prev.maxTime - timeAtMouse) * factor,
        }));
    }, [view, chartPadding]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            zoomAt(e.clientX - rect.left, e.deltaY < 0 ? 0.8 : 1.2);
        };
        const handleMouseDown = (e: MouseEvent) => {
            panState.current = { isDragging: true, lastPanX: e.clientX };
            canvas.style.cursor = 'grabbing';
        };
        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            if (!panState.current.isDragging) return;
            const deltaX = e.clientX - panState.current.lastPanX;
            panState.current.lastPanX = e.clientX;
            const timeRange = view.maxTime - view.minTime;
            const timeDelta = (deltaX / (rect.width - chartPadding.left - chartPadding.right)) * timeRange;
            setView(prev => ({ minTime: prev.minTime - timeDelta, maxTime: prev.maxTime - timeDelta }));
        };
        const handleMouseUpOrLeave = () => {
            panState.current.isDragging = false;
            setHoverPos(null);
            canvas.style.cursor = 'grab';
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUpOrLeave);
        canvas.addEventListener('mouseleave', handleMouseUpOrLeave);

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUpOrLeave);
            canvas.removeEventListener('mouseleave', handleMouseUpOrLeave);
        };
    }, [view, zoomAt, chartPadding]);

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Discharge Analysis & Forecast</h2>
                <div className="flex space-x-2">
                    <button onClick={() => zoomAt(canvasRef.current!.getBoundingClientRect().width / 2, 1.2)} className="w-10 py-1 bg-gray-700 rounded hover:bg-gray-600">-</button>
                    <button onClick={() => zoomAt(canvasRef.current!.getBoundingClientRect().width / 2, 0.8)} className="w-10 py-1 bg-gray-700 rounded hover:bg-gray-600">+</button>
                    <button onClick={resetZoom} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600">Reset</button>
                    <button onClick={handleRefresh} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600">Refresh</button>
                </div>
            </div>
            <div className="p-4">
                <canvas ref={canvasRef} className="w-full cursor-grab active:cursor-grabbing aspect-[2/1]"></canvas>
            </div>
            <div className="p-4 border-t border-gray-700 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
                <LegendItem color="bg-red-500" label="V (Discharge)" isActive={seriesVisibility.voltage} onClick={() => toggleSeries('voltage')} />
                <LegendItem color="bg-yellow-500" label="V (Forecast)" isActive={seriesVisibility.voltage} onClick={() => toggleSeries('voltage')} />
                <LegendItem color="bg-blue-500" label="Ah Remaining" isActive={seriesVisibility.ah} onClick={() => toggleSeries('ah')} />
            </div>
        </div>
    );
};

const LegendItem: React.FC<{ color: string, label: string, isActive: boolean, onClick: () => void }> = ({ color, label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center transition-opacity duration-200 ${!isActive ? 'opacity-40' : ''}`}>
        <span className={`w-3 h-3 rounded-full mr-2 ${color}`}></span>
        {label}
    </button>
);

function drawGridAndAxes(ctx: CanvasRenderingContext2D, chartArea: any, view: any, vRange: any, ahRange: any, mapX: any, mapY_V: any, mapY_Ah: any) {
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
        const v = vRange.min + i * (vRange.max - vRange.min) / 5;
        const y = mapY_V(v);
        ctx.fillText(v.toFixed(1), chartArea.x - 8, y);
        ctx.beginPath();
        ctx.moveTo(chartArea.x, y);
        ctx.lineTo(chartArea.x + chartArea.width, y);
        ctx.stroke();
    }
    ctx.fillText("V", chartArea.x, chartArea.y - 15);

    ctx.textAlign = 'left';
    for (let i = 0; i <= 5; i++) {
        const ah = ahRange.min + i * (ahRange.max - ahRange.min) / 5;
        const y = mapY_Ah(ah);
        ctx.fillText(ah.toFixed(1), chartArea.x + chartArea.width + 8, y);
    }
    ctx.fillText("Ah", chartArea.x + chartArea.width, chartArea.y - 15);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const timeTicks = Math.max(2, Math.floor(chartArea.width / 100));
    const timeRange = view.maxTime - view.minTime;
    const showDate = timeRange > 24 * 3600 * 1000;

    for (let i = 0; i <= timeTicks; i++) {
        const t = view.minTime + i * timeRange / timeTicks;
        const x = mapX(t);
        const date = new Date(t);
        const label = showDate 
            ? date.toLocaleDateString([], { month: 'short', day: 'numeric' })
            : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ctx.fillText(label, x, chartArea.y + chartArea.height + 8);
    }
}

function drawDataLines(ctx: CanvasRenderingContext2D, data: CombinedDataPoint[], mapX: (t: number) => number, yMapper: (v: number) => number, lineWidth: number, dashed = false, forceColor?: string) {
    if (data.length < 2) return;
    
    ctx.lineWidth = lineWidth;
    
    for (let i = 0; i < data.length - 1; i++) {
        const p1 = data[i];
        const p2 = data[i+1];
        
        let color = forceColor;
        if (!color) {
            color = p1.isForecast ? '#eab308' : '#ef4444'; // yellow-500 (forecast), red-500 (discharge)
        }
        ctx.strokeStyle = color;

        if (dashed) ctx.setLineDash([5, 5]);
        else ctx.setLineDash([]);
        
        const yValue1 = forceColor ? p1.ahRem : p1.voltage;
        const yValue2 = forceColor ? p2.ahRem : p2.voltage;

        ctx.beginPath();
        ctx.moveTo(mapX(p1.dt.getTime()), yMapper(yValue1));
        ctx.lineTo(mapX(p2.dt.getTime()), yMapper(yValue2));
        ctx.stroke();
    }
    
    ctx.setLineDash([]);
}

function drawCrosshair(ctx: CanvasRenderingContext2D, chartArea: any, x: number) {
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, chartArea.y);
    ctx.lineTo(x, chartArea.y + chartArea.height);
    ctx.stroke();
}

function drawTooltip(ctx: CanvasRenderingContext2D, chartArea: any, point: CombinedDataPoint, mapX: any, mapY_V: any, mapY_Ah: any, seriesVisibility: { voltage: boolean, ah: boolean }) {
    const x = mapX(point.dt.getTime());
    
    if (seriesVisibility.voltage) {
        const yV = mapY_V(point.voltage);
        ctx.fillStyle = point.isForecast ? '#eab308' : '#ef4444';
        ctx.beginPath();
        ctx.arc(x, yV, 4, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    if (seriesVisibility.ah) {
        const yAh = mapY_Ah(point.ahRem);
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, yAh, 4, 0, 2 * Math.PI);
        ctx.fill();
    }

    const lines = [
        `Time: ${point.dt.toLocaleString()}`,
        `Voltage: ${point.voltage.toFixed(2)}V`,
        `Ah Rem: ${point.ahRem.toFixed(2)}Ah`,
        `SoC: ${voltageToSOC(point.voltage).toFixed(1)}%`,
        `Load: ${('watts' in point) ? point.watts.toFixed(1) : 'N/A'}W`,
    ];

    ctx.font = '12px sans-serif';
    const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const lineHeight = 16;
    const boxWidth = textWidth + 16;
    const boxHeight = lines.length * lineHeight + 8;

    let boxX = x + 15;
    if (boxX + boxWidth > chartArea.x + chartArea.width) {
        boxX = x - boxWidth - 15;
    }
    let boxY = chartArea.y + 10;
    
    ctx.fillStyle = 'rgba(17, 24, 39, 0.85)';
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(boxX, boxY, boxWidth, boxHeight);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f3f4f6';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
        ctx.fillText(line, boxX + 8, boxY + 4 + i * lineHeight);
    });
}

export default DischargeChart;