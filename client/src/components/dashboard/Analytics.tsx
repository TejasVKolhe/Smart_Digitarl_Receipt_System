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
}

const AnalyticsPage: React.FC = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{"id":""}');
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    // Chart data calculations
    const { categoryLabels, categoryData, timeLabels, timeData, vendorLabels, vendorData } = useMemo(() => {
        const spendingByCategory = receipts.reduce((acc: Record<string, number>, receipt) => {
            const category = receipt.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + (receipt.amount || 0);
            return acc;
        }, {});

        const spendingOverTime = receipts.reduce((acc: Record<string, number>, receipt) => {
            const date = receipt.receiptDate ? new Date(receipt.receiptDate).toLocaleDateString() : 'Unknown';
            acc[date] = (acc[date] || 0) + (receipt.amount || 0);
            return acc;
        }, {});

        const spendingByVendor = receipts.reduce((acc: Record<string, number>, receipt) => {
            const vendor = receipt.vendor || 'Unknown';
            acc[vendor] = (acc[vendor] || 0) + (receipt.amount || 0);
            return acc;
        }, {});

        // Sort and slice data
        const sortedCategories = Object.entries(spendingByCategory)
            .sort(([, a], [, b]) => b - a);
        const sortedVendors = Object.entries(spendingByVendor)
            .sort(([, a], [, b]) => b - a);

        return {
            categoryLabels: sortedCategories.map(([label]) => label),
            categoryData: sortedCategories.map(([, value]) => value),
            timeLabels: Object.keys(spendingOverTime),
            timeData: Object.values(spendingOverTime),
            vendorLabels: sortedVendors.map(([label]) => label).slice(0, 5),
            vendorData: sortedVendors.map(([, value]) => value).slice(0, 5),
        };
    }, [receipts]);

    // Color schemes
    const indigoShades = [
        '#6366F1', // indigo-500
        '#818CF8', // indigo-400
        '#A5B4FC', // indigo-300
        '#C7D2FE', // indigo-200
        '#E0E7FF'  // indigo-100
    ];

    // Chart configurations
    const pieChartData = useMemo(() => ({
        labels: categoryLabels.slice(0, 5),
        datasets: [{
            data: categoryData.slice(0, 5),
            backgroundColor: indigoShades,
            borderWidth: 0,
        }],
    }), [categoryLabels, categoryData]);

    const lineChartData = useMemo(() => ({
        labels: timeLabels.slice(-30),
        datasets: [{
            label: 'Spending',
            data: timeData.slice(-30),
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
            backgroundColor: indigoShades,
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

    return (
        <DashboardLayout onLogout={handleLogout} user={user}>
            <div className="bg-gradient-to-br from-gray-50 to-indigo-50/20 min-h-screen p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Spending Analytics</h1>
                        <p className="text-gray-600 mt-2">Visual insights into your spending patterns</p>
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
                                        onClick={() => navigate('/dashboard/upload')}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                                    >
                                        Upload Receipt
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Pie Chart Card */}
                            <div className="bg-white p-6 rounded-xl shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h2>
                                <div className="h-80">
                                    <Pie
                                        data={pieChartData}
                                        options={{
                                            ...chartOptions,
                                            plugins: {
                                                ...chartOptions.plugins,
                                                title: {
                                                    display: true,
                                                    text: 'Top Spending Categories',
                                                    color: '#111827',
                                                    font: { size: 18 }
                                                }
                                            },
                                            scales: {} // Remove axes for pie chart
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Line Chart Card */}
                            <div className="bg-white p-6 rounded-xl shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Spending Timeline</h2>
                                <div className="h-80">
                                    <Line
                                        data={lineChartData}
                                        options={{
                                            ...chartOptions,
                                            plugins: {
                                                ...chartOptions.plugins,
                                                title: {
                                                    display: true,
                                                    text: '30-Day Spending Trend',
                                                    color: '#111827',
                                                    font: { size: 18 }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Bar Chart Card */}
                            <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Vendors</h2>
                                <div className="h-96">
                                    <Bar
                                        data={barChartData}
                                        options={{
                                            ...chartOptions,
                                            plugins: {
                                                ...chartOptions.plugins,
                                                title: {
                                                    display: true,
                                                    text: 'Vendor Spending Distribution',
                                                    color: '#111827',
                                                    font: { size: 18 }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AnalyticsPage;