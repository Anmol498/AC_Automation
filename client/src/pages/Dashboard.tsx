
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { API_BASE_URL } from '../constants';

const Dashboard: React.FC = () => {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const isTech = user?.role === 'technician';
        const statsArray = [];

        if (!isTech) {
          statsArray.push({ label: 'Total Customers', mobileLabel: 'Customers', value: data.customers || 0, icon: 'fa-users', color: 'bg-blue-500', trend: 'Live' });
        }

        statsArray.push(
          { label: isTech ? 'My Active Jobs' : 'Active Jobs', mobileLabel: 'Active', value: data.activeJobs || 0, icon: 'fa-screwdriver-wrench', color: 'bg-amber-500', trend: 'Ongoing' },
          { label: isTech ? 'My Completed Jobs' : 'Completed Jobs', mobileLabel: 'Done', value: data.completedJobs || 0, icon: 'fa-check-double', color: 'bg-emerald-500', trend: 'Lifetime' }
        );

        setStats(statsArray);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div className="p-10 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-blue-600"></i></div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Operations Overview</h2>
        <p className="text-slate-500">Real-time stats from your backend server.</p>
      </div>

      <div className={`grid gap-3 md:gap-6 ${stats?.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} sm:grid-cols-3 lg:grid-cols-4`}>
        {stats?.map((stat: any, idx: number) => (
          <div key={idx} className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className={`${stat.color} w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg shadow-current/20 shrink-0`}>
                <i className={`fa-solid ${stat.icon} text-sm md:text-xl`}></i>
              </div>
              <span className="hidden md:inline-block text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase ml-2 text-right">
                {stat.trend}
              </span>
            </div>
            <div className="mt-2 md:mt-4">
              <p className="hidden md:block text-slate-500 text-sm font-medium truncate" title={stat.label}>{stat.label}</p>
              <p className="md:hidden text-slate-500 text-[11px] leading-tight font-semibold truncate" title={stat.mobileLabel}>{stat.mobileLabel}</p>
              <h3 className="text-xl md:text-3xl font-black text-slate-800 mt-0.5 md:mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {user?.role !== 'technician' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/customers" className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 hover:border-blue-500 transition-all group">
                <i className="fa-solid fa-user-plus text-2xl text-slate-400 mb-2 group-hover:text-blue-500"></i>
                <span className="text-sm font-semibold text-slate-600 group-hover:text-blue-700">Add Customer</span>
              </Link>
              <Link to="/jobs" className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 hover:border-blue-500 transition-all group">
                <i className="fa-solid fa-circle-plus text-2xl text-slate-400 mb-2 group-hover:text-blue-500"></i>
                <span className="text-sm font-semibold text-slate-600 group-hover:text-blue-700">View Jobs</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
