import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector
} from "recharts";
import { useState } from "react";

interface CategoryData {
  category: string;
  value: number;
}

interface DonutChartProps {
  title: string;
  description?: string;
  data: CategoryData[];
  colors?: string[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  activeIndex?: number;
}

// Custom active shape component for highlighting selected sector
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;

  return (
    <g>
      <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#333" fontSize={16}>
        {payload.category}
      </text>
      <text x={cx} y={cy} dy={10} textAnchor="middle" fill="#333" fontSize={24} fontWeight="bold">
        {value}
      </text>
      <text x={cx} y={cy} dy={30} textAnchor="middle" fill="#999" fontSize={14}>
        {`${(percent * 100).toFixed(2)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 15}
        fill={fill}
      />
    </g>
  );
};

// Default colors if none are provided
const DEFAULT_COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
  '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57'
];

export default function DonutChart({
  title,
  description,
  data,
  colors = DEFAULT_COLORS,
  height = 350,
  innerRadius = 60,
  outerRadius = 100
}: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  
  // Calculate total for percentage display
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Handle mouse enter on pie slice
  const handlePieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  // Handle mouse leave
  const handlePieLeave = () => {
    setActiveIndex(undefined);
  };

  // Format data for tooltip
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      
      return (
        <div className="bg-background border p-2 shadow-md rounded text-sm">
          <p className="font-medium">{data.category}</p>
          <p className="text-muted-foreground">Value: {data.value}</p>
          <p className="text-muted-foreground">Percentage: {percentage}%</p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                dataKey="value"
                onMouseEnter={handlePieEnter}
                onMouseLeave={handlePieLeave}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={customTooltip} />
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right"
                formatter={(value, entry, index) => {
                  const percentage = ((data[index].value / total) * 100).toFixed(1);
                  return `${value} (${percentage}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 