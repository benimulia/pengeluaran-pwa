// State
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

// DOM Elements
const form = document.getElementById('expense-form');
const totalExpensesEl = document.getElementById('total-expenses');
const expenseListEl = document.getElementById('expense-list');
const emptyStateEl = document.getElementById('empty-state');
const filterCategory = document.getElementById('filter-category');
const filterStart = document.getElementById('filter-start');
const filterEnd = document.getElementById('filter-end');
const chartContainer = document.getElementById('chart-container');
const ctx = document.getElementById('expenseChart').getContext('2d');
const btnExport = document.getElementById('btn-export');
const btnReset = document.getElementById('btn-reset');
const dateInput = document.getElementById('date');

let chartInstance = null;

// Format Currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

// Format Date
const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
};

// Set default date to today
const setDateToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
};

// Calculate Total
const calculateTotal = (filteredExpenses) => {
    const total = filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);
    totalExpensesEl.innerText = formatCurrency(total);
};

// Render Chart
const renderChart = (filteredExpenses) => {
    if (filteredExpenses.length === 0) {
        chartContainer.style.display = 'none';
        return;
    }
    chartContainer.style.display = 'block';

    const categoryTotals = {};
    filteredExpenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    const backgroundColors = [
        '#00e5ff', '#ff5252', '#bb86fc', '#03dac6', '#cf6679', 
        '#ffb300', '#4caf50', '#2196f3', '#9c27b0', '#ff9800'
    ];

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#fff', font: { family: 'Outfit', size: 12 } }
                }
            }
        }
    });
};

// Render List
const renderExpenses = () => {
    const filterCat = filterCategory.value;
    const start = filterStart.value;
    const end = filterEnd.value;

    expenseListEl.innerHTML = '';
    
    let filteredExpenses = expenses;
    if (filterCat !== 'Semua') {
        filteredExpenses = filteredExpenses.filter(exp => exp.category === filterCat);
    }
    if (start) {
        filteredExpenses = filteredExpenses.filter(exp => exp.date >= start);
    }
    if (end) {
        filteredExpenses = filteredExpenses.filter(exp => exp.date <= end);
    }

    // Sort by date descending (newest first), if same date then sort by timestamp
    filteredExpenses.sort((a, b) => {
        const dateDiff = new Date(b.date) - new Date(a.date);
        if (dateDiff === 0) {
            return b.timestamp - a.timestamp;
        }
        return dateDiff;
    });

    if (filteredExpenses.length === 0) {
        emptyStateEl.classList.remove('hidden');
    } else {
        emptyStateEl.classList.add('hidden');
        filteredExpenses.forEach(expense => {
            const item = document.createElement('div');
            item.className = 'expense-item';
            item.innerHTML = `
                <div class="item-info">
                    <div class="item-title">${expense.desc}</div>
                    <div class="item-meta">
                        <span>${formatDate(expense.date)}</span>
                        <span class="category-badge">${expense.category}</span>
                    </div>
                </div>
                <div class="item-amount">- ${formatCurrency(expense.amount)}</div>
                <button class="btn-delete" onclick="deleteExpense('${expense.id}')" title="Hapus">
                    &times;
                </button>
            `;
            expenseListEl.appendChild(item);
        });
    }

    // Calculate total based on what is filtered (so users can see total per category)
    calculateTotal(filteredExpenses);
    
    // Render Chart
    renderChart(filteredExpenses);
};

// Add Expense
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const newExpense = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        date: document.getElementById('date').value,
        category: document.getElementById('category').value,
        amount: parseFloat(document.getElementById('amount').value),
        desc: document.getElementById('desc').value,
        timestamp: Date.now() // to handle sorting if dates are the same
    };

    expenses.push(newExpense);
    saveData();
    renderExpenses();
    
    // Reset form but keep the date
    document.getElementById('category').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('desc').value = '';
});

// Delete Expense
window.deleteExpense = (id) => {
    if(confirm('Apakah Anda yakin ingin menghapus catatan ini?')) {
        expenses = expenses.filter(exp => exp.id !== id);
        saveData();
        renderExpenses();
    }
};

// Filter Change
filterCategory.addEventListener('change', renderExpenses);
filterStart.addEventListener('change', renderExpenses);
filterEnd.addEventListener('change', renderExpenses);

// Reset Data
btnReset.addEventListener('click', () => {
    if(expenses.length === 0) {
        alert('Data sudah kosong!');
        return;
    }
    
    if(confirm('PERINGATAN: Anda akan menghapus SEMUA data pengeluaran secara permanen. Apakah Anda yakin?')) {
        expenses = [];
        saveData();
        renderExpenses();
        alert('Seluruh data berhasil dihapus.');
    }
});

// Export CSV
btnExport.addEventListener('click', () => {
    if(expenses.length === 0) {
        alert('Tidak ada data untuk diekspor.');
        return;
    }

    const headers = ['Tanggal', 'Kategori', 'Keterangan', 'Nominal'];
    const csvRows = [headers.join(',')];

    // Sort by date ascending for CSV
    const sortedForCsv = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedForCsv.forEach(exp => {
        // Enclose description in quotes to handle commas
        const row = [
            exp.date,
            `"${exp.category}"`,
            `"${exp.desc}"`,
            exp.amount
        ];
        csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pengeluaran_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Save to LocalStorage
const saveData = () => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
};

// Initialize
setDateToToday();
renderExpenses();
