import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

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

interface CategorySummary {
    name: string;
    count: number;
    totalAmount: number;
    receipts: Receipt[];
    color: string;
}

// Mock data to use when API fails
const mockReceiptData: Receipt[] = [
    {
        _id: 'r1',
        vendor: 'Grocery Store',
        amount: 5600,
        currency: 'INR',
        receiptDate: '2025-04-10T12:00:00.000Z',
        category: 'Groceries',
        source: 'upload',
    },
    {
        _id: 'r2',
        vendor: 'Amazon',
        amount: 1899,
        currency: 'INR',
        receiptDate: '2025-04-15T14:30:00.000Z',
        category: 'Shopping',
        source: 'email',
    },
    {
        _id: 'r3',
        vendor: 'Movie Theatre',
        amount: 800,
        currency: 'INR',
        receiptDate: '2025-04-20T18:15:00.000Z',
        category: 'Entertainment',
        source: 'manual',
    },
    {
        _id: 'r4',
        vendor: 'Gas Station',
        amount: 1200,
        currency: 'INR',
        receiptDate: '2025-04-25T10:45:00.000Z',
        category: 'Transportation',
        source: 'upload',
    },
    {
        _id: 'r5',
        vendor: 'Electricity Bill',
        amount: 3500,
        currency: 'INR',
        receiptDate: '2025-05-01T09:20:00.000Z',
        category: 'Utilities',
        source: 'email',
    },
    {
        _id: 'r6',
        vendor: 'Restaurant',
        amount: 2300,
        currency: 'INR',
        receiptDate: '2025-05-05T19:30:00.000Z',
        category: 'Dining',
        source: 'manual',
    },
    {
        _id: 'r7',
        vendor: 'Grocery Store',
        amount: 4200,
        currency: 'INR',
        receiptDate: '2025-05-08T11:15:00.000Z',
        category: 'Groceries',
        source: 'upload',
    },
    {
        _id: 'r8',
        vendor: 'Mobile Bill',
        amount: 800,
        currency: 'INR',
        receiptDate: '2025-05-10T08:45:00.000Z',
        category: 'Utilities',
        source: 'email',
    }
];

const CategoriesPage: React.FC = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{"id":"","username":""}');
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [categories, setCategories] = useState<CategorySummary[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [newCategory, setNewCategory] = useState<{name: string, description: string, color: string}>({
        name: '',
        description: '',
        color: '#3B82F6' // Default blue color
    });
    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('all');
    const [useMockData, setUseMockData] = useState<boolean>(false);

    // Colors for categories
    const colorPalette = [
        '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE', '#E0E7FF',
        '#a78bfa', '#8b5cf6', '#7c3aed', '#4f46e5', '#4338ca',
        '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5',
        '#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7',
        '#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2',
    ];

    useEffect(() => {
        fetchAllReceipts();
    }, [user.id]);

    useEffect(() => {
        if (receipts.length > 0) {
            generateCategorySummaries();
        }
    }, [receipts, dateRange]);

    const fetchAllReceipts = async () => {
        if (!user.id && !useMockData) return;
        
        try {
            setLoading(true);
            
            try {
                // Try to fetch from API first
                const response = await axiosInstance.get(`/api/receipts/all/${user.id}`);
                setReceipts(response.data.receipts || []);
                setUseMockData(false);
                setError(null);
            } catch (err) {
                console.error('Error fetching receipts:', err);
                // If API call fails, use mock data and show a warning
                setReceipts(mockReceiptData);
                setUseMockData(true);
                setError("Using demo data - API connection failed. This is a preview only.");
            }
        } finally {
            setLoading(false);
        }
    };

    const generateCategorySummaries = () => {
        // Filter receipts by date range if needed
        let filteredReceipts = receipts;
        
        if (dateRange !== 'all') {
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
            
            filteredReceipts = receipts.filter(receipt => {
                if (!receipt.receiptDate) return false;
                const receiptDate = new Date(receipt.receiptDate);
                return receiptDate >= cutoffDate;
            });
        }

        // Group receipts by category
        const categoriesMap = new Map<string, CategorySummary>();
        
        filteredReceipts.forEach((receipt, index) => {
            const categoryName = receipt.category || 'Uncategorized';
            
            if (!categoriesMap.has(categoryName)) {
                categoriesMap.set(categoryName, {
                    name: categoryName,
                    count: 0,
                    totalAmount: 0,
                    receipts: [],
                    color: colorPalette[categoriesMap.size % colorPalette.length]
                });
            }
            
            const category = categoriesMap.get(categoryName)!;
            category.count++;
            category.totalAmount += receipt.amount || 0;
            category.receipts.push(receipt);
        });
        
        // Convert map to array and sort by total amount
        const categoriesArray = Array.from(categoriesMap.values())
            .sort((a, b) => b.totalAmount - a.totalAmount);
        
        setCategories(categoriesArray);
    };

    const handleCategoryClick = (categoryName: string) => {
        if (selectedCategory === categoryName) {
            setSelectedCategory(null);
        } else {
            setSelectedCategory(categoryName);
        }
    };

    const handleAddManualCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (useMockData) {
            // In mock mode, just add a fake receipt with the new category
            const newReceipt: Receipt = {
                _id: `mock-${Date.now()}`,
                vendor: 'New Category Demo',
                amount: 0,
                category: newCategory.name,
                receiptDate: new Date().toISOString(),
                source: 'manual'
            };
            
            setReceipts([...receipts, newReceipt]);
            setNewCategory({ name: '', description: '', color: '#3B82F6' });
            setIsAdding(false);
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            
            // Create a new receipt with this category
            await axiosInstance.post('/api/receipts', {
                vendor: 'Manual Category Creation',
                amount: 0,
                category: newCategory.name,
                receiptDate: new Date().toISOString(),
                description: newCategory.description,
                currency: 'INR'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Reset form and fetch updated receipts
            setNewCategory({ name: '', description: '', color: '#3B82F6' });
            setIsAdding(false);
            fetchAllReceipts();
        } catch (err) {
            setError('Failed to add category. Please try again.');
            console.error('Error adding category:', err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };
    
    // Chart data
    const chartData = {
        labels: categories.map(c => c.name),
        datasets: [
            {
                data: categories.map(c => c.totalAmount),
                backgroundColor: categories.map(c => c.color),
                borderWidth: 0,
            },
        ],
    };
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    font: { size: 12 }
                }
            }
        }
    };

    // Get selected category data
    const selectedCategoryData = selectedCategory 
        ? categories.find(c => c.name === selectedCategory) 
        : null;

    return (
        <DashboardLayout onLogout={handleLogout} user={user}>
            <div className="bg-white/90 backdrop-blur-sm shadow rounded-lg p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Receipt Categories</h1>
                        <p className="text-gray-600">Organize and analyze your spending by categories</p>
                    </div>
                    
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
                
                {error && (
                    <div className={`mb-4 p-3 rounded-md ${useMockData ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                        <p className="mt-2 text-gray-600">Loading categories...</p>
                    </div>
                ) : receipts.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <p className="mt-2 text-gray-600">No receipts found</p>
                        <button 
                            onClick={() => navigate('/dashboard/receipts')}
                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Add your first receipt
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Left Column: Categories List */}
                            <div className="lg:w-3/5">
                                <div className="mb-6 flex justify-between items-center">
                                    <h2 className="text-lg font-semibold text-gray-900">Categories Overview</h2>
                                    <button 
                                        onClick={() => setIsAdding(!isAdding)}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                                    >
                                        {isAdding ? 'Cancel' : 'Add Category'}
                                    </button>
                                </div>

                                {isAdding && (
                                    <form onSubmit={handleAddManualCategory} className="mb-6 p-4 border rounded-md bg-gray-50">
                                        <h2 className="text-lg font-medium mb-3">Add New Category</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                                <input
                                                    type="text"
                                                    value={newCategory.name}
                                                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                                <input
                                                    type="color"
                                                    value={newCategory.color}
                                                    onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                                                    className="w-full h-10 px-1 py-1 border rounded-md"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                                <textarea
                                                    value={newCategory.description}
                                                    onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    rows={2}
                                                ></textarea>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                type="submit"
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                                            >
                                                Save Category
                                            </button>
                                        </div>
                                    </form>
                                )}

                                <div className="grid grid-cols-1 gap-4">
                                    {categories.map(category => (
                                        <div 
                                            key={category.name} 
                                            className={`border rounded-md shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                                                selectedCategory === category.name ? 'border-indigo-500 bg-indigo-50' : ''
                                            }`}
                                            style={{ borderLeft: `4px solid ${category.color}` }}
                                            onClick={() => handleCategoryClick(category.name)}
                                        >
                                            <div className="p-4">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                                                    <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                                        {category.count} {category.count === 1 ? 'receipt' : 'receipts'}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex justify-between items-center">
                                                    <div className="text-sm text-gray-600">
                                                        {formatCurrency(category.totalAmount)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {Math.round((category.totalAmount / categories.reduce((sum, c) => sum + c.totalAmount, 0)) * 100)}% of total
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Right Column: Chart & Details */}
                            <div className="lg:w-2/5">
                                <div className="sticky top-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h2>
                                    <div className="bg-white p-4 border rounded-lg shadow-sm mb-6">
                                        <div style={{ height: '300px' }}>
                                            {categories.length > 0 ? (
                                                <Pie data={chartData} options={chartOptions} />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-500">
                                                    No category data available
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {selectedCategoryData && (
                                        <div className="bg-white p-4 border rounded-lg shadow-sm">
                                            <h3 className="font-medium text-lg mb-3 flex items-center">
                                                <span className="h-4 w-4 rounded-full mr-2" style={{ backgroundColor: selectedCategoryData.color }}></span>
                                                {selectedCategoryData.name} Details
                                            </h3>
                                            
                                            <div className="mb-4">
                                                <div className="flex justify-between py-2 border-b">
                                                    <span className="text-gray-600">Total Amount</span>
                                                    <span className="font-medium">{formatCurrency(selectedCategoryData.totalAmount)}</span>
                                                </div>
                                                <div className="flex justify-between py-2 border-b">
                                                    <span className="text-gray-600">Receipt Count</span>
                                                    <span className="font-medium">{selectedCategoryData.count}</span>
                                                </div>
                                                <div className="flex justify-between py-2 border-b">
                                                    <span className="text-gray-600">Average per Receipt</span>
                                                    <span className="font-medium">
                                                        {formatCurrency(selectedCategoryData.totalAmount / selectedCategoryData.count)}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <h4 className="font-medium mb-2">Recent Receipts</h4>
                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                {selectedCategoryData.receipts
                                                    .slice(0, 5)
                                                    .map((receipt, idx) => (
                                                    <div key={idx} className="p-2 bg-gray-50 rounded-md">
                                                        <div className="flex justify-between">
                                                            <span className="font-medium">{receipt.vendor || 'Unknown'}</span>
                                                            <span>{formatCurrency(receipt.amount || 0)}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {receipt.receiptDate ? new Date(receipt.receiptDate).toLocaleDateString() : 'Unknown date'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {selectedCategoryData.receipts.length > 0 && !useMockData && (
                                                <button 
                                                    className="w-full mt-3 py-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                                    onClick={() => navigate('/dashboard/receipts', { 
                                                        state: { categoryFilter: selectedCategoryData.name } 
                                                    })}
                                                >
                                                    View all receipts in this category
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
};

export default CategoriesPage;