import React from 'react';

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
}

export const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let cumulative = 0;

  if (total === 0 || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">No data available for chart.</div>;
  }

  const chartSize = 180;
  const radius = chartSize / 2;
  const strokeWidth = 1;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-4">
      <svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`}>
        {data.map((item, index) => {
          const percentage = item.value / total;
          const angle = percentage * 360;
          const startAngle = cumulative * 360;
          cumulative += percentage;

          const x1 = radius + radius * Math.cos((startAngle * Math.PI) / 180);
          const y1 = radius + radius * Math.sin((startAngle * Math.PI) / 180);
          const x2 = radius + radius * Math.cos(((startAngle + angle) * Math.PI) / 180);
          const y2 = radius + radius * Math.sin(((startAngle + angle) * Math.PI) / 180);
          const largeArcFlag = angle > 180 ? 1 : 0;

          return (
            // FIX: Replaced the `title` prop with a nested <title> element to comply with SVG standards and TypeScript types for native tooltips.
            <path
              key={index}
              d={`M${radius},${radius} L${x1},${y1} A${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`}
              fill={item.color}
              stroke="#1f2937"
              strokeWidth={strokeWidth}
            >
              <title>{`${item.name}: ${item.value.toFixed(2)}%`}</title>
            </path>
          );
        })}
      </svg>
      <div className="text-sm text-gray-300 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium">{item.name}:</span>
            <span className="text-gray-400">{item.value.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
