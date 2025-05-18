import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface DataPoint {
  [key: string]: string | number;
}

interface DataSeries {
  dataKey: string;
  color: string;
  name?: string;
}

interface MultiLineChartProps {
  title: string;
  description?: string;
  data: DataPoint[];
  series: DataSeries[];
  xAxisDataKey: string;
  height?: number;
  legendPosition?: 'top' | 'bottom' | 'right' | 'left';
}

export default function MultiLineChart({
  title,
  description,
  data,
  series,
  xAxisDataKey,
  height = 300,
  legendPosition = 'bottom'
}: MultiLineChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisDataKey} />
              <YAxis />
              <Tooltip />
              <Legend layout={legendPosition === 'left' || legendPosition === 'right' ? 'vertical' : 'horizontal'} 
                     verticalAlign={legendPosition === 'top' ? 'top' : 'bottom'}
                     align={legendPosition === 'right' ? 'right' : legendPosition === 'left' ? 'left' : 'center'} />
              {series.map((s, index) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={s.dataKey}
                  stroke={s.color}
                  name={s.name || s.dataKey}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 