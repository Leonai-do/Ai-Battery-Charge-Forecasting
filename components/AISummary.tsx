import React, { useState, useCallback } from 'react';
import { getGeminiSummary } from '../services/geminiService';
import { ProcessedLogEntry, Settings, Summary } from '../types';

interface AISummaryProps {
    processedLog: ProcessedLogEntry[];
    summary: Summary;
    settings: Settings;
}

const Spinner: React.FC = () => (
    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" role="status">
        <span className="sr-only">Loading...</span>
    </div>
);

const AISummary: React.FC<AISummaryProps> = ({ processedLog, summary, settings }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState('');

    const handleGenerateSummary = useCallback(async () => {
        if (processedLog.length === 0) {
            setResult("No data to analyze. Please add log entries first.");
            return;
        }
        
        setIsLoading(true);
        setResult('');
        try {
            const summaryText = await getGeminiSummary(processedLog, summary, settings);
            setResult(summaryText);
        } catch (error) {
            console.error(error);
            setResult('An error occurred while generating the summary.');
        } finally {
            setIsLoading(false);
        }
    }, [processedLog, summary, settings]);

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">✨ AI Event Summary</h2>
            <div className="space-y-3">
                <button 
                    onClick={handleGenerateSummary} 
                    disabled={isLoading} 
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? <><Spinner /> Generating...</> : 'Generate Summary'}
                </button>
                {result && (
                    <textarea 
                        value={result} 
                        readOnly 
                        className="w-full h-32 p-2 rounded-md bg-gray-900 border border-gray-600 text-gray-300"
                    />
                )}
            </div>
        </div>
    );
};

export default AISummary;
