import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AppContext';
import { API_BASE_URL } from '../constants';
import { Skeleton } from '../components/ui/Skeleton';
import { useRealtimeListener } from '../components/RealtimeProvider';
import CustomMonthPicker from '../components/CustomMonthPicker';

// Indian Rupee currency formatter helper
const formatIndianCurrency = (value: number) => {
  if (value === 0) return '₹0';
  if (value >= 10000000) { // >= 1 Crore
    const val = value / 10000000;
    return `₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}Cr`;
  }
  if (value >= 100000) { // >= 1 Lakh
    const val = value / 100000;
    return `₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}L`;
  }
  if (value >= 1000) {
    const val = value / 1000;
    return `₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}K`;
  }
  return `₹${value}`;
};

const labelToMonthValue = (label: string) => {
  if (!label) return '';
  const parts = label.split(' ');
  if (parts.length !== 2) return '';
  const monthStr = parts[0];
  const yearStr = parts[1];
  
  const monthMap: { [key: string]: string } = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  const mm = monthMap[monthStr];
  if (!mm) return '';
  const yyyy = `20${yearStr}`;
  return `${yyyy}-${mm}`;
};

const monthValueToLabel = (val: string) => {
  if (!val) return '';
  const parts = val.split('-');
  if (parts.length !== 2) return '';
  const yyyy = parts[0];
  const mm = parts[1];
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(mm, 10) - 1;
  const monthStr = monthNames[monthIdx];
  if (!monthStr) return '';
  const yy = yyyy.slice(2);
  return `${monthStr} ${yy}`;
};

// 1. Revenue Collected Line Chart Component
const RevenueLineChart: React.FC<{ data: any[], isDark: boolean }> = ({ data, isDark }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const w = entry.contentRect.width || 600;
        setWidth(w);
        setIsMobile(w < 500);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-slate-400 dark:text-zinc-500">
        No revenue data available
      </div>
    );
  }

  // Dimension configurations
  const height = 240;
  const paddingLeft = isMobile ? 50 : 65;
  const paddingRight = isMobile ? 15 : 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  
  const maxVal = Math.max(...data.map(d => d.collected || 0), 100000);
  
  // Calculate a rounded ceiling to give chart spacing at the top
  let roundedCeiling = 100000;
  if (maxVal > 10000000) {
    roundedCeiling = Math.ceil((maxVal * 1.1) / 10000000) * 10000000;
  } else if (maxVal > 1000000) {
    roundedCeiling = Math.ceil((maxVal * 1.1) / 1000000) * 1000000;
  } else if (maxVal > 100000) {
    roundedCeiling = Math.ceil((maxVal * 1.1) / 100000) * 100000;
  } else {
    roundedCeiling = Math.ceil((maxVal * 1.1) / 10000) * 10000;
  }

  const xScale = (index: number) => {
    if (data.length === 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + index * (chartWidth / (data.length - 1));
  };
  const yScale = (val: number) => paddingTop + chartHeight - (val / roundedCeiling) * chartHeight;
  const yZero = paddingTop + chartHeight;

  // Generate coordinate points
  const points = data.map((d, i) => ({
    x: xScale(i),
    y: yScale(d.collected || 0),
    collected: d.collected || 0,
    label: d.label
  }));

  // Line path representation
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  // Area path representation (closed path at bottom zero line)
  const areaPath = data.length > 1 
    ? `${linePath} L ${points[points.length - 1].x} ${yZero} L ${points[0].x} ${yZero} Z` 
    : '';

  // Draw 5 grid line ticks
  const yTicks = Array.from({ length: 5 }).map((_, i) => {
    const val = roundedCeiling - i * (roundedCeiling / 4);
    return {
      val,
      y: yScale(val),
      label: formatIndianCurrency(val)
    };
  });

  return (
    <div ref={containerRef} className="relative w-full h-[240px]">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" className="overflow-visible select-none">
        <defs>
          <linearGradient id="revenue-line-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2554E8" stopOpacity={isDark ? 0.35 : 0.18} />
            <stop offset="100%" stopColor="#2554E8" stopOpacity={0} />
          </linearGradient>
        </defs>
        
        {/* Horizontal Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line 
              x1={paddingLeft} 
              y1={tick.y} 
              x2={width - paddingRight} 
              y2={tick.y} 
              stroke={isDark ? "#23252a" : "#f1f5f9"} 
              strokeWidth={1}
              strokeDasharray={i === 4 ? "0" : "4 4"}
            />
            <text 
              x={paddingLeft - 12} 
              y={tick.y} 
              textAnchor="end" 
              alignmentBaseline="middle"
              className="text-[10px] font-semibold fill-slate-400 dark:fill-zinc-500"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* X Axis Labels */}
        {data.map((d, i) => (
          <text 
            key={i}
            x={xScale(i)} 
            y={yZero + 20} 
            textAnchor="middle"
            className="text-[10px] font-semibold fill-slate-400 dark:fill-zinc-500"
          >
            {d.label}
          </text>
        ))}

        {/* Area segment */}
        <path d={areaPath} fill="url(#revenue-line-grad)" />

        {/* Outer Stroke line */}
        <path 
          d={linePath} 
          fill="none" 
          stroke="#2554E8" 
          strokeWidth={3} 
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Guides & interactive nodes */}
        {points.map((p, i) => (
          <g key={i}>
            {hoveredIdx === i && (
              <line 
                x1={p.x} 
                y1={paddingTop} 
                x2={p.x} 
                y2={yZero} 
                stroke="#2554E8" 
                strokeWidth={1.5} 
                strokeDasharray="3 3"
                className="opacity-50"
              />
            )}
            
            <circle 
              cx={p.x} 
              cy={p.y} 
              r={hoveredIdx === i ? 6.5 : 4} 
              fill="#2554E8" 
              stroke={isDark ? "#0f1011" : "#ffffff"} 
              strokeWidth={hoveredIdx === i ? 2.5 : 2}
              className="transition-all duration-150"
            />

            {/* Hit area for hovering */}
            <rect 
              x={data.length > 1 
                ? p.x - (chartWidth / (data.length - 1)) / 2 
                : paddingLeft}
              y={paddingTop} 
              width={data.length > 1 
                ? chartWidth / (data.length - 1) 
                : chartWidth}
              height={chartHeight} 
              fill="transparent" 
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          </g>
        ))}
      </svg>

      {/* Hover tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div 
          className="absolute z-10 p-3 rounded-xl shadow-xl border text-xs pointer-events-none transition-all duration-200"
          style={{
            left: `${points[hoveredIdx].x}px`,
            top: `${points[hoveredIdx].y - 12}px`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: isDark ? '#141517' : '#ffffff',
            borderColor: isDark ? '#23252a' : '#e2e8f0',
            color: isDark ? '#f4f4f5' : '#1e293b',
          }}
        >
          <div className="font-semibold text-slate-400 dark:text-zinc-500 mb-0.5">
            {points[hoveredIdx].label}
          </div>
          <div className="font-bold text-sm text-blue-600 dark:text-blue-400">
            Collected: ₹{points[hoveredIdx].collected.toLocaleString('en-IN')}
          </div>
        </div>
      )}
    </div>
  );
};

// 2. Estimated Revenue Stacked Bar Chart Component
const EstimatedRevenueBarChart: React.FC<{ data: any[], isDark: boolean }> = ({ data, isDark }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const w = entry.contentRect.width || 600;
        setWidth(w);
        setIsMobile(w < 500);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-slate-400 dark:text-zinc-500">
        No estimated revenue data available
      </div>
    );
  }

  // Dimension configurations
  const height = 240;
  const paddingLeft = isMobile ? 50 : 65;
  const paddingRight = isMobile ? 15 : 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  
  const maxVal = Math.max(...data.map(d => (d.received || 0) + (d.outstanding || 0)), 100000);
  
  // Calculate a rounded ceiling to give chart spacing at top
  let roundedCeiling = 100000;
  if (maxVal > 10000000) {
    roundedCeiling = Math.ceil((maxVal * 1.1) / 10000000) * 10000000;
  } else if (maxVal > 1000000) {
    roundedCeiling = Math.ceil((maxVal * 1.1) / 1000000) * 1000000;
  } else if (maxVal > 100000) {
    roundedCeiling = Math.ceil((maxVal * 1.1) / 100000) * 100000;
  } else {
    roundedCeiling = Math.ceil((maxVal * 1.1) / 10000) * 10000;
  }

  const xScale = (index: number) => {
    if (data.length === 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + index * (chartWidth / (data.length - 1));
  };
  const yScale = (val: number) => paddingTop + chartHeight - (val / roundedCeiling) * chartHeight;
  const yZero = paddingTop + chartHeight;

  // Draw 5 grid line ticks
  const yTicks = Array.from({ length: 5 }).map((_, i) => {
    const val = roundedCeiling - i * (roundedCeiling / 4);
    return {
      val,
      y: yScale(val),
      label: formatIndianCurrency(val)
    };
  });

  const barWidth = isMobile ? 14 : 22;

  return (
    <div ref={containerRef} className="relative w-full h-[240px]">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" className="overflow-visible select-none">
        {/* Horizontal Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line 
              x1={paddingLeft} 
              y1={tick.y} 
              x2={width - paddingRight} 
              y2={tick.y} 
              stroke={isDark ? "#23252a" : "#f1f5f9"} 
              strokeWidth={1}
              strokeDasharray={i === 4 ? "0" : "4 4"}
            />
            <text 
              x={paddingLeft - 12} 
              y={tick.y} 
              textAnchor="end" 
              alignmentBaseline="middle"
              className="text-[10px] font-semibold fill-slate-400 dark:fill-zinc-500"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* X Axis Labels */}
        {data.map((d, i) => (
          <text 
            key={i}
            x={xScale(i)} 
            y={yZero + 20} 
            textAnchor="middle"
            className="text-[10px] font-semibold fill-slate-400 dark:fill-zinc-500"
          >
            {d.label}
          </text>
        ))}

        {/* Columns Stacked bars */}
        {data.map((d, i) => {
          const rec = d.received || 0;
          const out = d.outstanding || 0;
          const colX = xScale(i);
          
          // Green received segment height
          const hRec = (rec / roundedCeiling) * chartHeight;
          const yRec = yZero - hRec;
          
          // Red outstanding segment height
          const hOut = (out / roundedCeiling) * chartHeight;
          const yOut = yRec - hOut;
          
          const isHovered = hoveredIdx === i;

          return (
            <g key={i}>
              {/* Received (Green) Bar */}
              {rec > 0 && (
                <rect 
                  x={colX - barWidth / 2} 
                  y={yRec} 
                  width={barWidth} 
                  height={hRec} 
                  fill="#10B981" 
                  className="transition-all duration-200"
                  opacity={isHovered ? 0.95 : 0.85}
                />
              )}

              {/* Outstanding (Red) Bar */}
              {out > 0 && (
                <rect 
                  x={colX - barWidth / 2} 
                  y={yOut} 
                  width={barWidth} 
                  height={hOut} 
                  fill="#EF4444" 
                  className="transition-all duration-200"
                  opacity={isHovered ? 0.95 : 0.85}
                />
              )}

              {/* Hitbox rectangle covering entire vertical chart height */}
              <rect 
                x={data.length > 1 
                  ? colX - (chartWidth / (data.length - 1)) / 2 
                  : paddingLeft}
                y={paddingTop} 
                width={data.length > 1 
                  ? chartWidth / (data.length - 1) 
                  : chartWidth}
                height={chartHeight} 
                fill="transparent" 
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            </g>
          );
        })}
      </svg>

      {/* Hover breakdown tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div 
          className="absolute z-10 p-3 rounded-xl shadow-xl border text-xs pointer-events-none transition-all duration-200"
          style={{
            left: `${xScale(hoveredIdx)}px`,
            top: `${Math.min(
              yScale(data[hoveredIdx].received || 0), 
              yScale((data[hoveredIdx].received || 0) + (data[hoveredIdx].outstanding || 0))
            ) - 12}px`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: isDark ? '#141517' : '#ffffff',
            borderColor: isDark ? '#23252a' : '#e2e8f0',
            color: isDark ? '#f4f4f5' : '#1e293b',
            minWidth: '140px'
          }}
        >
          <div className="font-semibold text-slate-400 dark:text-zinc-500 mb-1">
            {data[hoveredIdx].label}
          </div>
          <div className="font-semibold text-emerald-500 flex justify-between gap-4">
            <span>Received:</span>
            <span>₹{(data[hoveredIdx].received || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="font-semibold text-rose-500 flex justify-between gap-4">
            <span>Outstanding:</span>
            <span>₹{(data[hoveredIdx].outstanding || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="border-t border-slate-200 dark:border-zinc-700 my-1"></div>
          <div className="font-bold flex justify-between gap-4">
            <span>Total:</span>
            <span>₹{((data[hoveredIdx].received || 0) + (data[hoveredIdx].outstanding || 0)).toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { token, user } = useAuth();
  const { isDark = false } = useOutletContext<{ isDark?: boolean }>() || {};
  const [stats, setStats] = useState<any>(null);
  const [revenueStats, setRevenueStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Chart range selection states
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  const minMonthValue = useMemo(() => {
    return revenueStats.length > 0 ? labelToMonthValue(revenueStats[0].label) : '';
  }, [revenueStats]);

  const maxMonthValue = useMemo(() => {
    return revenueStats.length > 0 ? labelToMonthValue(revenueStats[revenueStats.length - 1].label) : '';
  }, [revenueStats]);

  // Synchronize range options on data load
  useEffect(() => {
    if (revenueStats && revenueStats.length > 0) {
      const labels = revenueStats.map(d => d.label);
      if (!startMonth || !labels.includes(startMonth)) {
        setStartMonth(labels[0]);
      }
      if (!endMonth || !labels.includes(endMonth)) {
        setEndMonth(labels[labels.length - 1]);
      }
    }
  }, [revenueStats]);

  // Compute filtered datasets
  const filteredRevenueData = useMemo(() => {
    if (!revenueStats || revenueStats.length === 0) return [];
    const startIdx = revenueStats.findIndex(d => d.label === startMonth);
    const endIdx = revenueStats.findIndex(d => d.label === endMonth);
    if (startIdx === -1 || endIdx === -1) return revenueStats;
    const actualStart = Math.min(startIdx, endIdx);
    const actualEnd = Math.max(startIdx, endIdx);
    return revenueStats.slice(actualStart, actualEnd + 1);
  }, [revenueStats, startMonth, endMonth]);

  const filteredEstData = useMemo(() => {
    if (!revenueStats || revenueStats.length === 0) return [];
    const startIdx = revenueStats.findIndex(d => d.label === startMonth);
    const endIdx = revenueStats.findIndex(d => d.label === endMonth);
    if (startIdx === -1 || endIdx === -1) return revenueStats;
    const actualStart = Math.min(startIdx, endIdx);
    const actualEnd = Math.max(startIdx, endIdx);
    return revenueStats.slice(actualStart, actualEnd + 1);
  }, [revenueStats, startMonth, endMonth]);

  const fetchStats = useCallback(() => {
    fetch(`${API_BASE_URL}/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const isTech = user?.role === 'technician';
        const statsArray = [];

        if (!isTech) {
          const systemUsers = data.userCounts
            ? (data.userCounts.admin || 0) + (data.userCounts.superadmin || 0) + (data.userCounts.technician || 0)
            : 0;
          const userSubtext = data.userCounts
            ? `Staff: ${data.userCounts.technician || 0} • Admin: ${data.userCounts.admin || 0} • Super: ${data.userCounts.superadmin || 0}`
            : '';

          statsArray.push(
            { label: 'Total Customers', mobileLabel: 'Customers', value: data.customers || 0, icon: 'fa-users', color: 'bg-blue-500', trend: '' },
            { label: 'Active Jobs', mobileLabel: 'Active', value: data.activeJobs || 0, icon: 'fa-screwdriver-wrench', color: 'bg-amber-500', trend: 'Ongoing' },
            { label: 'Completed Jobs', mobileLabel: 'Done', value: data.completedJobs || 0, icon: 'fa-check-double', color: 'bg-emerald-500', trend: 'Lifetime' },
            { label: 'System Users', mobileLabel: 'Users', value: systemUsers, icon: 'fa-user-shield', color: 'bg-rose-500', trend: '', subtext: userSubtext }
          );
          setRevenueStats(data.revenueStats || []);
        } else {
          statsArray.push(
            { label: 'My Active Jobs', mobileLabel: 'Active', value: data.activeJobs || 0, icon: 'fa-screwdriver-wrench', color: 'bg-amber-500', trend: 'Ongoing' },
            { label: 'My Completed Jobs', mobileLabel: 'Done', value: data.completedJobs || 0, icon: 'fa-check-double', color: 'bg-emerald-500', trend: 'Lifetime' }
          );
        }

        setStats(statsArray);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
        setLoading(false);
      });
  }, [token, user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useRealtimeListener('jobs', fetchStats);
  useRealtimeListener('customers', fetchStats);
  useRealtimeListener('inventory', fetchStats);

  if (loading) {
    return (
      <div className="space-y-8 page-content">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: user?.role === 'technician' ? 2 : 4 }).map((_, i) => (
            <div key={i} className={`${isDark ? 'bg-card-dark border-border-dark' : 'bg-card-light border-border-light'} p-3 md:p-4 rounded-xl border shadow-sm space-y-3`}>
              <Skeleton className="h-8 w-8 md:h-9 md:w-9 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 md:w-20" />
                <Skeleton className="h-5 w-8 md:h-6 md:w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* Charts skeleton */}
        {user?.role !== 'technician' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <div className={`${isDark ? 'bg-card-dark border-border-dark' : 'bg-card-light border-border-light'} p-6 rounded-2xl border shadow-sm h-[320px] flex flex-col justify-between`}>
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-[180px] w-full mt-4 rounded-lg animate-pulse" />
            </div>
            <div className={`${isDark ? 'bg-card-dark border-border-dark' : 'bg-card-light border-border-light'} p-6 rounded-2xl border shadow-sm h-[320px] flex flex-col justify-between`}>
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-[180px] w-full mt-4 rounded-lg animate-pulse" />
            </div>
          </div>
        )}
      </div>
    );
  }

  const isTech = user?.role === 'technician';

  return (
    <div className="space-y-8 page-content">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 animate-fade-in">Dashboard</h2>
      </div>

      {/* Cards Metric Grid */}
      <div className={`grid gap-4 md:gap-6 grid-cols-2 ${isTech ? 'lg:grid-cols-2' : 'sm:grid-cols-3 lg:grid-cols-4'}`}>
        {stats?.map((stat: any, idx: number) => {
          let iconBg = 'bg-blue-50/70 dark:bg-blue-950/30';
          let iconColor = 'text-blue-600 dark:text-blue-400';
          let trendBg = '';
          let trendColor = '';

          if (stat.color === 'bg-amber-500') {
            iconBg = 'bg-amber-50/70 dark:bg-amber-950/30';
            iconColor = 'text-amber-600 dark:text-amber-400';
            trendBg = 'bg-amber-50/70 dark:bg-amber-950/30';
            trendColor = 'text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30';
          } else if (stat.color === 'bg-emerald-500') {
            iconBg = 'bg-emerald-50/70 dark:bg-emerald-950/30';
            iconColor = 'text-emerald-600 dark:text-emerald-400';
            trendBg = 'bg-emerald-50/70 dark:bg-emerald-950/30';
            trendColor = 'text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30';
          } else if (stat.color === 'bg-rose-500') {
            iconBg = 'bg-rose-50/70 dark:bg-rose-950/30';
            iconColor = 'text-rose-600 dark:text-rose-400';
          }

          return (
            <div 
              key={idx} 
              className={`p-3 md:p-4 rounded-xl border transition-all duration-300 ${
                isDark 
                  ? 'bg-card-dark border-border-dark text-zinc-100 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
                  : 'bg-card-light border-border-light text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)]'
              } flex flex-col justify-between`}
            >
              <div className="flex items-start justify-between">
                <div className={`${iconBg} w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center ${iconColor} shrink-0`}>
                  <i className={`fa-solid ${stat.icon} text-sm md:text-base`}></i>
                </div>
                {stat.trend && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ml-2 text-right ${trendColor} ${trendBg}`}>
                    {stat.trend}
                  </span>
                )}
              </div>
              
              <div className="mt-3 md:mt-4">
                <p className="hidden md:block text-slate-400 dark:text-zinc-500 text-[10px] md:text-xs font-semibold tracking-wide truncate" title={stat.label}>
                  {stat.label}
                </p>
                <p className="md:hidden text-slate-400 dark:text-zinc-500 text-[9px] leading-tight font-semibold truncate" title={stat.mobileLabel}>
                  {stat.mobileLabel}
                </p>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-zinc-100 mt-0.5 leading-none">
                  {stat.value}
                </h3>
                {stat.subtext && (
                  <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-zinc-500 mt-1.5 font-medium leading-none">
                    {stat.subtext}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unified Date Range Selector - Below 4 metric cards, above charts */}
      {!isTech && revenueStats.length > 0 && (
        <div className="flex justify-end pr-1 mb-2">
          <div className="flex items-center gap-2">
            <CustomMonthPicker
              value={labelToMonthValue(startMonth)}
              min={minMonthValue}
              max={maxMonthValue}
              isDark={isDark}
              onChange={(val) => {
                const label = monthValueToLabel(val);
                if (label) {
                  setStartMonth(label);
                  const sIdx = revenueStats.findIndex(d => d.label === label);
                  const eIdx = revenueStats.findIndex(d => d.label === endMonth);
                  if (sIdx > eIdx) setEndMonth(label);
                }
              }}
              align="right"
            />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>to</span>
            <CustomMonthPicker
              value={labelToMonthValue(endMonth)}
              min={minMonthValue}
              max={maxMonthValue}
              isDark={isDark}
              onChange={(val) => {
                const label = monthValueToLabel(val);
                if (label) {
                  setEndMonth(label);
                  const eIdx = revenueStats.findIndex(d => d.label === label);
                  const sIdx = revenueStats.findIndex(d => d.label === startMonth);
                  if (eIdx < sIdx) setStartMonth(label);
                }
              }}
              align="right"
            />
          </div>
        </div>
      )}

      {/* Visual Graphs section */}
      {!isTech && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Revenue Collected Line Chart Card */}
          <div className={`p-6 rounded-2xl border ${
            isDark 
              ? 'bg-card-dark border-border-dark text-zinc-100 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
              : 'bg-card-light border-border-light text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)]'
          } flex flex-col`}>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Revenue Collected</h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500">Actual payments received per month</p>
            </div>
            <div className="w-full flex items-center justify-center">
              <RevenueLineChart data={filteredRevenueData} isDark={isDark} />
            </div>
          </div>

          {/* Estimated Revenue Stacked Bar Chart Card */}
          <div className={`p-6 rounded-2xl border ${
            isDark 
              ? 'bg-card-dark border-border-dark text-zinc-100 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
              : 'bg-card-light border-border-light text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)]'
          } flex flex-col`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Estimated Revenue</h3>
                <p className="text-xs text-slate-400 dark:text-zinc-500">Outstanding & received contracts</p>
              </div>
              
              <div className="flex items-center gap-3 text-[10px] md:text-xs font-bold">
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Received
                </span>
                <span className="flex items-center gap-1.5 text-rose-500">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Outstanding
                </span>
              </div>
            </div>
            <div className="w-full flex items-center justify-center">
              <EstimatedRevenueBarChart data={filteredEstData} isDark={isDark} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
