
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const data = [
  { value: 65, color: '#3b82f6' }, // Blue: Learned
  { value: 85, color: '#a855f7' }, // Purple: Accuracy
  { value: 45, color: '#f59e0b' }, // Orange: Streak
];

const HealthRings: React.FC = () => {
  return (
    <div className="w-24 h-24 relative flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <PieChart>
          {/* Ring 1 (Outer) */}
          <Pie
            data={[{ value: data[0].value }, { value: 100 - data[0].value }]}
            cx="50%"
            cy="50%"
            innerRadius={38}
            outerRadius={46}
            startAngle={90}
            endAngle={450}
            dataKey="value"
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={data[0].color} />
            <Cell fill="rgba(0,0,0,0.05)" />
          </Pie>
          {/* Ring 2 */}
          <Pie
            data={[{ value: data[1].value }, { value: 100 - data[1].value }]}
            cx="50%"
            cy="50%"
            innerRadius={28}
            outerRadius={36}
            startAngle={90}
            endAngle={450}
            dataKey="value"
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={data[1].color} />
            <Cell fill="rgba(0,0,0,0.05)" />
          </Pie>
          {/* Ring 3 (Inner) */}
          <Pie
            data={[{ value: data[2].value }, { value: 100 - data[2].value }]}
            cx="50%"
            cy="50%"
            innerRadius={18}
            outerRadius={26}
            startAngle={90}
            endAngle={450}
            dataKey="value"
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={data[2].color} />
            <Cell fill="rgba(0,0,0,0.05)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HealthRings;
