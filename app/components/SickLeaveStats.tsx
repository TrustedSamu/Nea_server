import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface SickLeaveStatsProps {
  data: {
    name: string;
    value: number;
    total?: number;  // Make total optional
  }[];
  title: string;
  isDarkMode?: boolean;
}

export default function SickLeaveStats({ data, title, isDarkMode = false }: SickLeaveStatsProps) {
  const formatTooltip = (value: number) => `${value} Krankmeldungen`;

  return (
    <div className={`rounded-2xl shadow-lg p-6 relative overflow-hidden border transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-[#2a2a2a]/60 backdrop-blur-sm border-[#333333]' 
        : 'bg-gradient-to-br from-white to-orange-50 border-orange-100'
    }`}>
      <h3 className={`text-xl mb-4 transition-colors duration-300 ${
        isDarkMode ? 'text-orange-400' : 'text-orange-800'
      }`} style={{ fontFamily: 'Kalam, cursive' }}>
        {title}
      </h3>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isDarkMode ? '#333333' : '#f0f0f0'} 
            />
            <XAxis 
              dataKey="name" 
              stroke={isDarkMode ? '#fb923c' : '#9a3412'} 
              style={{ fontFamily: 'Kalam, cursive' }}
            />
            <YAxis 
              stroke={isDarkMode ? '#fb923c' : '#9a3412'} 
              style={{ fontFamily: 'Kalam, cursive' }}
            />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: isDarkMode ? '#2a2a2a' : 'white',
                border: `1px solid ${isDarkMode ? '#333333' : '#fed7aa'}`,
                borderRadius: '0.5rem',
                fontFamily: 'Kalam, cursive',
              }}
              labelStyle={{
                color: isDarkMode ? '#fb923c' : '#9a3412',
                fontFamily: 'Kalam, cursive',
              }}
            />
            <Bar 
              name="Krankmeldungen" 
              dataKey="value" 
              fill="#f97316" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 