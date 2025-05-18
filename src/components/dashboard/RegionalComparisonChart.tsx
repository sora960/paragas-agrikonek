import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from "recharts";

interface RegionalMetric {
  region: string;
  [key: string]: string | number;
}

interface MetricDefinition {
  dataKey: string;
  color: string;
  name: string;
}

interface RegionalComparisonChartProps {
  title: string;
  description?: string;
  data: RegionalMetric[];
  metrics: MetricDefinition[];
  height?: number;
  layout?: 'vertical' | 'horizontal';
}

// Custom tick component for horizontal layout with angled text
const CustomizedXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        x={0} 
        y={0} 
        dy={16} 
        textAnchor="end" 
        fill="#666" 
        fontSize={12}
        transform="rotate(-45)"
      >
        {payload.value}
      </text>
    </g>
  );
};

export default function RegionalComparisonChart({
  title,
  description,
  data,
  metrics,
  height = 400,
  layout = 'horizontal'
}: RegionalComparisonChartProps) {
  // Determine if we should shorten region names for better display
  const shortenRegionNames = layout === 'horizontal' && data.some(d => d.region.length > 20);
  
  // Process data to shorten region names if needed
  const processedData = shortenRegionNames 
    ? data.map(d => ({
        ...d,
        shortRegion: d.region.split(' ').map(word => word.charAt(0)).join('')
      }))
    : data;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {layout === 'vertical' ? (
              <BarChart
                layout="vertical"
                data={processedData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 100, // More space on the left for region names
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="region" 
                  type="category" 
                  tick={{ fontSize: 12 }} 
                />
                <Tooltip />
                <Legend />
                {metrics.map((metric, index) => (
                  <Bar 
                    key={index} 
                    dataKey={metric.dataKey} 
                    name={metric.name} 
                    fill={metric.color} 
                    barSize={20} 
                  />
                ))}
              </BarChart>
            ) : (
              <BarChart
                data={processedData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 80, // More space at the bottom for rotated labels
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={shortenRegionNames ? "shortRegion" : "region"} 
                  height={70}
                  tick={<CustomizedXAxisTick />}
                />
                <YAxis />
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend />
                {metrics.map((metric, index) => (
                  <Bar 
                    key={index} 
                    dataKey={metric.dataKey} 
                    name={metric.name} 
                    fill={metric.color} 
                    barSize={20} 
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        {shortenRegionNames && (
          <div className="mt-2 text-xs text-muted-foreground">
            <p>Legend: {processedData.map(d => `${d.shortRegion} = ${d.region}`).join(', ')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 