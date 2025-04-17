import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface Receipt {
    _id?: string;
    vendor?: string;
    amount?: number;
    currency?: string;
    receiptDate?: string;
    category?: string;
    source?: string;
    fileName?: string;
}

const AnalyticsPage: React.FC = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{"id":""}');
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    
    // Add new states for filtering and view options
    const [filterView, setFilterView] = useState<'all' | 'category' | 'vendor' | 'date'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'amount' | 'vendor'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const fetchAllReceipts = async () => {
        if (!user.id) return;
        try {
            setIsLoading(true);
            const response = await axiosInstance.get(`/api/receipts/all/${user.id}`);
            setReceipts(response.data.receipts || []);
        } catch (error: any) {
            console.error('Error fetching receipts:', error);
            setError('Failed to load receipts');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllReceipts();
    }, [user.id]);
    
    // Filter receipts by date range
    const filteredReceipts = useMemo(() => {
        if (dateRange === 'all') return receipts;
        
        const now = new Date();
        const cutoffDate = new Date();
        
        switch (dateRange) {
            case '7d':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                cutoffDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                cutoffDate.setDate(now.getDate() - 90);
                break;
            case '1y':
                cutoffDate.setFullYear(now.getFullYear() - 1);
                break;
        }
        
        return receipts.filter(receipt => {
            if (!receipt.receiptDate) return false;
            const receiptDate = new Date(receipt.receiptDate);
            return receiptDate >= cutoffDate;
        });
    }, [receipts, dateRange]);
    
    // Filter by selected category if any
    const categoryFilteredReceipts = useMemo(() => {
        if (!selectedCategory) return filteredReceipts;
        return filteredReceipts.filter(receipt => receipt.category === selectedCategory);
    }, [filteredReceipts, selectedCategory]);

    // Compute financial metrics
    const financialMetrics = useMemo(() => {
        const total = categoryFilteredReceipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
        
        // Get highest expense
        const highestExpense = [...categoryFilteredReceipts].sort((a, b) => 
            (b.amount || 0) - (a.amount || 0))[0];
            
        // Get most frequent vendor
        const vendorCounts = categoryFilteredReceipts.reduce((acc: Record<string, number>, receipt) => {
            const vendor = receipt.vendor || 'Unknown';
            acc[vendor] = (acc[vendor] || 0) + 1;
            return acc;
        }, {});
        
        let mostFrequentVendor = { name: 'None', count: 0 };
        Object.entries(vendorCounts).forEach(([vendor, count]) => {
            if (count > mostFrequentVendor.count) {
                mostFrequentVendor = { name: vendor, count };
            }
        });
        
        // Calculate average expense
        const average = categoryFilteredReceipts.length > 0 
            ? total / categoryFilteredReceipts.length
            : 0;
            
        // Calculate spending by source
        const spendingBySource = categoryFilteredReceipts.reduce((acc: Record<string, number>, receipt) => {
            const source = receipt.source || 'manual';
            acc[source] = (acc[source] || 0) + (receipt.amount || 0);
            return acc;
        }, {});
        
        // Monthly spending
        const monthlySpending: Record<string, number> = {};
        categoryFilteredReceipts.forEach(receipt => {
            if (!receipt.receiptDate) return;
            const date = new Date(receipt.receiptDate);
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlySpending[monthYear] = (monthlySpending[monthYear] || 0) + (receipt.amount || 0);
        });
        
        // Last 6 months
        const today = new Date();
        const last6Months = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(today);
            d.setMonth(today.getMonth() - i);
            const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            last6Months.unshift(monthYear);
        }
        
        const last6MonthsSpending = last6Months.map(monthYear => ({
            month: new Date(`${monthYear}-01`).toLocaleString('default', { month: 'short' }),
            amount: monthlySpending[monthYear] || 0
        }));
        
        return {
            total,
            average,
            highestExpense,
            mostFrequentVendor,
            spendingBySource,
            last6MonthsSpending,
            receiptCount: categoryFilteredReceipts.length
        };
    }, [categoryFilteredReceipts]);

    // Chart data calculations
    const { categoryLabels, categoryData, timeLabels, timeData, vendorLabels, vendorData } = useMemo(() => {
        const spendingByCategory = categoryFilteredReceipts.reduce((acc: Record<string, number>, receipt) => {
            const category = receipt.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + (receipt.amount || 0);
            return acc;
        }, {});

        const spendingOverTime = categoryFilteredReceipts.reduce((acc: Record<string, number>, receipt) => {
            if (!receipt.receiptDate) return acc;
            const date = new Date(receipt.receiptDate);
            // Group by week if date range is 30 days or less, month if longer
            let dateKey;
            if (dateRange === '7d') {
                dateKey = new Date(date).toLocaleDateString();
            } else if (dateRange === '30d') {
                // Group by week
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                dateKey = weekStart.toLocaleDateString();
            } else {
                // Group by month
                dateKey = date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
            }
            acc[dateKey] = (acc[dateKey] || 0) + (receipt.amount || 0);
            return acc;
        }, {});

        const spendingByVendor = categoryFilteredReceipts.reduce((acc: Record<string, number>, receipt) => {
            const vendor = receipt.vendor || 'Unknown';
            acc[vendor] = (acc[vendor] || 0) + (receipt.amount || 0);
            return acc;
        }, {});

        // Sort and slice data
        const sortedCategories = Object.entries(spendingByCategory)
            .sort(([, a], [, b]) => b - a);
        const sortedVendors = Object.entries(spendingByVendor)
            .sort(([, a], [, b]) => b - a);
            
        // Time data should be chronologically sorted
        const sortedTimeData = Object.entries(spendingOverTime)
            .sort(([dateA], [dateB]) => {
                return new Date(dateA).getTime() - new Date(dateB).getTime();
            });

        return {
            categoryLabels: sortedCategories.map(([label]) => label),
            categoryData: sortedCategories.map(([, value]) => value),
            timeLabels: sortedTimeData.map(([label]) => label),
            timeData: sortedTimeData.map(([, value]) => value),
            vendorLabels: sortedVendors.map(([label]) => label).slice(0, 5),
            vendorData: sortedVendors.map(([, value]) => value).slice(0, 5),
        };
    }, [categoryFilteredReceipts, dateRange]);

    // Color schemes
    const indigoShades = [
        '#6366F1', // indigo-500
        '#818CF8', // indigo-400
        '#A5B4FC', // indigo-300
        '#C7D2FE', // indigo-200
        '#E0E7FF',  // indigo-100
        '#a78bfa', // purple-400
        '#8b5cf6', // purple-500
        '#7c3aed', // purple-600
        '#4f46e5', // indigo-600
        '#4338ca'  // indigo-700
    ];

    // Get all unique categories for filter
    const allCategories = useMemo(() => {
        const categoriesSet = new Set<string>();
        receipts.forEach(receipt => {
            if (receipt.category) categoriesSet.add(receipt.category);
        });
        return Array.from(categoriesSet);
    }, [receipts]);

    // Chart configurations
    const pieChartData = useMemo(() => ({
        labels: categoryLabels.slice(0, 7),
        datasets: [{
            data: categoryData.slice(0, 7),
            backgroundColor: indigoShades.slice(0, 7),
            borderWidth: 0,
        }],
    }), [categoryLabels, categoryData]);

    const lineChartData = useMemo(() => ({
        labels: timeLabels,
        datasets: [{
            label: 'Spending',
            data: timeData,
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: '#6366F1',
        }],
    }), [timeLabels, timeData]);

    const barChartData = useMemo(() => ({
        labels: vendorLabels,
        datasets: [{
            label: 'Amount',
            data: vendorData,
            backgroundColor: indigoShades.slice(0, vendorLabels.length),
            borderRadius: 8,
            borderSkipped: false,
        }],
    }), [vendorLabels, vendorData]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: '#6B7280',
                    font: { size: 14 }
                }
            },
            tooltip: {
                backgroundColor: '#1F2937',
                titleFont: { size: 16 },
                bodyFont: { size: 14 },
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: (context: any) => {
                        const label = context.dataset.label || '';
                        const value = context.parsed || context.raw;
                        return `${label}: ₹${value.toLocaleString()}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: '#E5E7EB' },
                ticks: {
                    color: '#6B7280',
                    callback: (value: number | string) => `₹${value}`
                }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#6B7280' }
            }
        }
    };

    // Helper function to format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };
    
    // Sort table data
    const sortedReceipts = useMemo(() => {
        return [...categoryFilteredReceipts].sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = a.receiptDate ? new Date(a.receiptDate).getTime() : 0;
                const dateB = b.receiptDate ? new Date(b.receiptDate).getTime() : 0;
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            } else if (sortBy === 'amount') {
                const amountA = a.amount || 0;
                const amountB = b.amount || 0;
                return sortOrder === 'asc' ? amountA - amountB : amountB - amountA;
            } else { // vendor
                const vendorA = a.vendor || '';
                const vendorB = b.vendor || '';
                return sortOrder === 'asc' 
                    ? vendorA.localeCompare(vendorB)
                    : vendorB.localeCompare(vendorA);
            }
        });
    }, [categoryFilteredReceipts, sortBy, sortOrder]);

    return (
        <DashboardLayout onLogout={handleLogout} user={user}>
            <div className="bg-gradient-to-br from-gray-50 to-indigo-50/20 min-h-screen p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Financial Analytics</h1>
                            <p className="text-gray-600 mt-2">Comprehensive insights into your spending patterns</p>
                        </div>
                        
                        {/* Date range selector */}
                        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                            <button 
                                onClick={() => setDateRange('7d')}
                                className={`px-4 py-2 rounded-lg border ${
                                    dateRange === '7d' 
                                        ? 'bg-indigo-500 text-white border-indigo-500' 
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                7 Days
                            </button>
                            <button 
                                onClick={() => setDateRange('30d')}
                                className={`px-4 py-2 rounded-lg border ${
                                    dateRange === '30d' 
                                        ? 'bg-indigo-500 text-white border-indigo-500' 
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                30 Days
                            </button>
                            <button 
                                onClick={() => setDateRange('90d')}
                                className={`px-4 py-2 rounded-lg border ${
                                    dateRange === '90d' 
                                        ? 'bg-indigo-500 text-white border-indigo-500' 
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                90 Days
                            </button>
                            <button 
                                onClick={() => setDateRange('1y')}
                                className={`px-4 py-2 rounded-lg border ${
                                    dateRange === '1y' 
                                        ? 'bg-indigo-500 text-white border-indigo-500' 
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                1 Year
                            </button>
                            <button 
                                onClick={() => setDateRange('all')}
                                className={`px-4 py-2 rounded-lg border ${
                                    dateRange === 'all' 
                                        ? 'bg-indigo-500 text-white border-indigo-500' 
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                All Time
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-96">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                            <p className="mt-4 text-gray-600">Loading your financial insights...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 rounded-lg">
                            <p className="text-red-600">{error}</p>
                        </div>
                    ) : receipts.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                            <div className="mx-auto max-w-md">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <h3 className="mt-2 text-lg font-medium text-gray-900">No receipts found</h3>
                                <p className="mt-1 text-gray-500">Get started by uploading receipts or connecting your email.</p>
                                <div className="mt-6">
                                    <button
                                        onClick={() => navigate('/dashboard/receipts')}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                                    >
                                        Add Receipts
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Financial Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                                {/* Total Spending */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 col-span-1">
                                    <p className="text-sm font-medium text-gray-500">Total Spending</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-2">
                                        {formatCurrency(financialMetrics.total)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {dateRange === 'all' ? 'All time' : `Last ${
                                            dateRange === '7d' ? '7 days' : 
                                            dateRange === '30d' ? '30 days' : 
                                            dateRange === '90d' ? '90 days' : 'year'
                                        }`}
                                    </p>
                                </div>
                                
                                {/* Receipt Count */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 col-span-1">
                                    <p className="text-sm font-medium text-gray-500">Total Receipts</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-2">
                                        {financialMetrics.receiptCount}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Avg: {formatCurrency(financialMetrics.average)}
                                    </p>
                                </div>
                                
                                {/* Highest Expense */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 col-span-1">
                                    <p className="text-sm font-medium text-gray-500">Highest Expense</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-2">
                                        {financialMetrics.highestExpense 
                                            ? formatCurrency(financialMetrics.highestExpense.amount || 0)
                                            : 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 truncate">
                                        {financialMetrics.highestExpense?.vendor || 'No data'}
                                    </p>
                                </div>
                                
                                {/* Most Frequent Vendor */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 col-span-1 md:col-span-1 lg:col-span-2">
                                    <p className="text-sm font-medium text-gray-500">Most Frequent Vendor</p>
                                    <p className="text-xl font-bold text-gray-900 mt-2 truncate">
                                        {financialMetrics.mostFrequentVendor.name}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {financialMetrics.mostFrequentVendor.count} transactions
                                    </p>
                                </div>
                            </div>
                            
                            {/* Category Filter */}
                            <div className="mb-8 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">Filter by Category</h2>
                                    {selectedCategory && (
                                        <button 
                                            onClick={() => setSelectedCategory(null)}
                                            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                                        >
                                            <span>Clear filter</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {allCategories.map(category => (
                                        <button
                                            key={category}
                                            onClick={() => setSelectedCategory(
                                                selectedCategory === category ? null : category
                                            )}
                                            className={`px-4 py-2 rounded-lg border ${
                                                selectedCategory === category
                                                    ? 'bg-indigo-500 text-white border-indigo-500' 
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                    
                                    {allCategories.length === 0 && (
                                        <p className="text-gray-500">No categories available</p>
                                    )}
                                </div>
                            </div>

                            {/* Chart Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                {/* Pie Chart Card */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h2>
                                    <div className="h-80">
                                        <Pie
                                            data={pieChartData}
                                            options={{
                                                ...chartOptions,
                                                plugins: {
                                                    ...chartOptions.plugins,
                                                    title: {
                                                        display: false
                                                    }
                                                },
                                                scales: {} // Remove axes for pie chart
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Line Chart Card */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Spending Trend</h2>
                                    <div className="h-80">
                                        <Line
                                            data={lineChartData}
                                            options={{
                                                ...chartOptions,
                                                plugins: {
                                                    ...chartOptions.plugins,
                                                    title: {
                                                        display: false
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Monthly Trend */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">6 Month Spending Trend</h2>
                                <div className="flex items-end space-x-2 h-48">
                                    {financialMetrics.last6MonthsSpending.map((item, index) => {
                                        // Calculate max value to establish relative heights
                                        const maxAmount = Math.max(
                                            ...financialMetrics.last6MonthsSpending.map(i => i.amount)
                                        );
                                        const heightPercentage = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                                        
                                        return (
                                            <div key={index} className="flex flex-col items-center flex-1">
                                                <div className="w-full flex justify-center">
                                                    <div 
                                                        className="w-full max-w-[70px] bg-indigo-500 rounded-t-lg transition-all duration-300"
                                                        style={{ height: `${heightPercentage}%`, minHeight: item.amount > 0 ? '10px' : '0' }}
                                                    ></div>
                                                </div>
                                                <div className="text-xs font-medium mt-2 text-gray-600">
                                                    {item.month}
                                                </div>
                                                <div className="text-xs mt-1 text-gray-500">
                                                    {formatCurrency(item.amount)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* Top Vendors */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                                <h2 className="text-lg font-semibold text-gray-900 mb-6">Top Vendors</h2>
                                <div className="h-96">
                                    <Bar
                                        data={barChartData}
                                        options={{
                                            ...chartOptions,
                                            indexAxis: 'y' as const,
                                            plugins: {
                                                ...chartOptions.plugins,
                                                title: {
                                                    display: false
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Receipt Table */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900">Receipt Details</h2>
                                    
                                    <div className="flex space-x-2">
                                        {/* Sort Controls */}
                                        <select 
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'vendor')}
                                            className="border border-gray-300 rounded-md text-sm px-2 py-1"
                                        >
                                            <option value="date">Sort by Date</option>
                                            <option value="amount">Sort by Amount</option>
                                            <option value="vendor">Sort by Vendor</option>
                                        </select>
                                        
                                        <button 
                                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                            className="border border-gray-300 rounded-md p-1"
                                        >
                                            {sortOrder === 'asc' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-gray-500">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3">Date</th>
                                                <th scope="col" className="px-6 py-3">Vendor</th>
                                                <th scope="col" className="px-6 py-3">Category</th>
                                                <th scope="col" className="px-6 py-3">Amount</th>
                                                <th scope="col" className="px-6 py-3">Source</th>
                                                <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedReceipts.slice(0, 10).map((receipt, index) => (
                                                <tr key={receipt._id || index} className="bg-white border-b">
                                                    <td className="px-6 py-4">
                                                        {receipt.receiptDate 
                                                            ? new Date(receipt.receiptDate).toLocaleDateString() 
                                                            : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        {receipt.vendor || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {receipt.category || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium">
                                                        {receipt.amount ? formatCurrency(receipt.amount) : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                                            receipt.source === 'email' ? 'bg-blue-100 text-blue-800' :
                                                            receipt.source === 'upload' ? 'bg-green-100 text-green-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {receipt.source || 'Manual'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => navigate(`/dashboard/receipts/${receipt._id}`)}
                                                            className="font-medium text-indigo-600 hover:text-indigo-900"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    
                                    {sortedReceipts.length > 10 && (
                                        <div className="flex justify-center mt-4">
                                            <button
                                                onClick={() => navigate('/dashboard/receipts')}
                                                className="text-sm text-indigo-600 hover:text-indigo-800"
                                            >
                                                View All Receipts ({sortedReceipts.length})
                                            </button>
                                        </div>
                                    )}
                                    
                                    {sortedReceipts.length === 0 && (
                                        <p className="text-center py-4 text-gray-500">No receipts found for the selected filters</p>
                                    )}
                                </div>
                            </div>
                            
                            {/* Source Distribution */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Receipt Sources</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {Object.entries(financialMetrics.spendingBySource).map(([source, amount], index) => (
                                        <div key={index} className="border rounded-lg p-4">
                                            <div className="flex items-center">
                                                <div className={`rounded-full p-2 ${
                                                    source === 'email' ? 'bg-blue-100' :
                                                    source === 'upload' ? 'bg-green-100' :
                                                    source === 'gmail' ? 'bg-red-100' :
                                                    'bg-gray-100'
                                                }`}>
                                                    {source === 'email' && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                    {source === 'gmail' && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                                        </svg>
                                                    )}
                                                    {source === 'upload' && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                        </svg>
                                                    )}
                                                    {source === 'manual' && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <h3 className="text-sm font-medium text-gray-900 capitalize">{source}</h3>
                                                    <p className="text-lg font-bold text-gray-700">{formatCurrency(amount)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Export and Share Section */}
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
                                <div>
                                    <h2 className="text-xl font-bold">Export Your Data</h2>
                                    <p className="text-indigo-100">Download reports or share insights</p>
                                </div>
                                <div className="flex space-x-3">
                                    <button className="bg-white text-indigo-600 hover:bg-gray-100 px-4 py-2 rounded-lg flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        PDF Report
                                    </button>
                                    <button className="bg-white text-indigo-600 hover:bg-gray-100 px-4 py-2 rounded-lg flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        Excel Export
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AnalyticsPage;