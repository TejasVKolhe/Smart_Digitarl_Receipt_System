import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: string;
  color: 'indigo' | 'purple' | 'blue';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, change, color }) => {
  const getGradient = () => {
    switch (color) {
      case 'purple':
        return 'from-purple-500 to-purple-600';
      case 'blue':
        return 'from-blue-500 to-blue-600';
      default:
        return 'from-indigo-500 to-indigo-600';
    }
  };
  
  return (
    <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-3xl p-6 border border-white/20 transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center">
        <div className={`flex-shrink-0 h-14 w-14 rounded-full bg-gradient-to-r ${getGradient()} flex items-center justify-center shadow-lg text-white`}>
          {icon}
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <div className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
          <span className="font-medium">{change}</span> from last month
        </div>
      </div>
    </div>
  );
};

export default StatCard;
