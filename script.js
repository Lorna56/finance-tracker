const API_URL = "http://127.0.0.1:5000";
let financeChart;

document.addEventListener("DOMContentLoaded", () => {
  const typeSelect = document.getElementById("type");
  const categorySelect = document.getElementById("category");

  // Filter categories based on type
  typeSelect.addEventListener("change", () => {
    const selectedType = typeSelect.value;
    Array.from(categorySelect.options).forEach(option => {
      if (!option.value) return; // skip placeholder
      option.style.display = option.dataset.type === selectedType ? "block" : "none";
    });
    categorySelect.value = "";
  });

  loadTransactions();

  document.getElementById("transaction-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const description = document.getElementById("description").value;
    const type = typeSelect.value;
    const category = categorySelect.value;
    const amount = parseFloat(document.getElementById("amount").value);

    if (!category) {
      alert("Please select a category.");
      return;
    }

    await fetch(`${API_URL}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, category, amount, type })
    });

    document.getElementById("transaction-form").reset();
    // Reset category options based on default type
    typeSelect.dispatchEvent(new Event("change"));

    loadTransactions();
  });
});

async function loadTransactions() {
  const res = await fetch(`${API_URL}/transactions`);
  const data = await res.json();

  const table = document.getElementById("transactions-table");
  table.innerHTML = "";

  let incomeTotal = 0, expenseTotal = 0;
  data.forEach((tx) => {
    if (tx.type === "income") incomeTotal += tx.amount;
    else expenseTotal += tx.amount;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${tx.description}</td>
      <td>${tx.category}</td>
      <td>${tx.amount.toFixed(2)}</td>
      <td style="color:${tx.type === 'income' ? 'green' : 'red'};">
        ${tx.type === 'income' ? '💰 Income' : '💸 Expense'}
      </td>
      <td>${new Date(tx.date).toLocaleDateString()}</td>
    `;
    table.appendChild(row);
  });

  const balance = incomeTotal - expenseTotal;
  document.getElementById("income").textContent = incomeTotal.toFixed(2) + " USD";
  document.getElementById("expense").textContent = expenseTotal.toFixed(2) + " USD";
  document.getElementById("balance").textContent = balance.toFixed(2) + " USD";

  renderChart(incomeTotal, expenseTotal);
}

function renderChart(income, expense) {
  const ctx = document.getElementById("financeChart").getContext("2d");

  if (financeChart) financeChart.destroy();

  financeChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Income", "Expense"],
      datasets: [{
        label: "Finance Overview",
        data: [income, expense],
        backgroundColor: ["#43a047", "#e53935"]
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

// const API_URL = "http://127.0.0.1:5000";
// let financeChart;

// document.addEventListener("DOMContentLoaded", () => {
//   loadTransactions();

//   document.getElementById("transaction-form").addEventListener("submit", async (e) => {
//     e.preventDefault();

//     const description = document.getElementById("description").value;
//     const category = document.getElementById("category").value; // ✅ Added category
//     const amount = parseFloat(document.getElementById("amount").value);
//     const type = document.getElementById("type").value;

//     // Send POST request with all required fields
//     await fetch(`${API_URL}/transactions`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ description, category, amount, type })
//     });

//     // Reset form and reload transactions
//     document.getElementById("transaction-form").reset();
//     loadTransactions();
//   });
// });

// async function loadTransactions() {
//   const res = await fetch(`${API_URL}/transactions`);
//   const data = await res.json();

//   const table = document.getElementById("transactions-table");
//   table.innerHTML = "";

//   let incomeTotal = 0, expenseTotal = 0;
//   data.forEach((tx) => {
//     if (tx.type === "income") incomeTotal += tx.amount;
//     else expenseTotal += tx.amount;

//     const row = document.createElement("tr");
//     row.innerHTML = `
//       <td>${tx.description}</td>
//       <td>${tx.category}</td> <!-- ✅ Display category -->
//       <td>${tx.amount.toFixed(2)}</td>
//       <td style="color:${tx.type === 'income' ? 'green' : 'red'};">
//         ${tx.type === 'income' ? '💰 Income' : '💸 Expense'}
//       </td>
//       <td>${new Date(tx.date).toLocaleDateString()}</td>
//     `;
//     table.appendChild(row);
//   });

//   const balance = incomeTotal - expenseTotal;
//   document.getElementById("income").textContent = incomeTotal.toFixed(2) + " USD";
//   document.getElementById("expense").textContent = expenseTotal.toFixed(2) + " USD";
//   document.getElementById("balance").textContent = balance.toFixed(2) + " USD";

//   renderChart(incomeTotal, expenseTotal);
// }

// function renderChart(income, expense) {
//   const ctx = document.getElementById("financeChart").getContext("2d");

//   if (financeChart) financeChart.destroy();

//   financeChart = new Chart(ctx, {
//     type: "bar",
//     data: {
//       labels: ["Income", "Expense"],
//       datasets: [{
//         label: "Finance Overview",
//         data: [income, expense],
//         backgroundColor: ["#43a047", "#e53935"]
//       }]
//     },
//     options: {
//       responsive: true,
//       scales: { y: { beginAtZero: true } }
//     }
//   });
// }


// const API_URL = "http://127.0.0.1:5000";
// let financeChart;

// document.addEventListener("DOMContentLoaded", () => {
//   loadTransactions();

//   document.getElementById("transaction-form").addEventListener("submit", async (e) => {
//     e.preventDefault();

//     const description = document.getElementById("description").value;
//     const amount = parseFloat(document.getElementById("amount").value);
//     const type = document.getElementById("type").value;

//     await fetch(`${API_URL}/transactions`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ description, amount, type })
//     });

//     document.getElementById("transaction-form").reset();
//     loadTransactions();
//   });
// });

// async function loadTransactions() {
//   const res = await fetch(`${API_URL}/transactions`);
//   const data = await res.json();

//   const table = document.getElementById("transactions-table");
//   table.innerHTML = "";

//   let incomeTotal = 0, expenseTotal = 0;
//   data.forEach((tx) => {
//     if (tx.type === "income") incomeTotal += tx.amount;
//     else expenseTotal += tx.amount;

//     const row = document.createElement("tr");
//     row.innerHTML = `
//       <td>${tx.description}</td>
//       <td>${tx.amount.toFixed(2)}</td>
//       <td style="color:${tx.type === 'income' ? 'green' : 'red'};">
//         ${tx.type === 'income' ? '💰 Income' : '💸 Expense'}
//       </td>
//       <td>${new Date(tx.date).toLocaleDateString()}</td>
//     `;
//     table.appendChild(row);
//   });

//   const balance = incomeTotal - expenseTotal;
//   document.getElementById("income").textContent = incomeTotal.toFixed(2) + " USD";
//   document.getElementById("expense").textContent = expenseTotal.toFixed(2) + " USD";
//   document.getElementById("balance").textContent = balance.toFixed(2) + " USD";

//   renderChart(incomeTotal, expenseTotal);
// }

// function renderChart(income, expense) {
//   const ctx = document.getElementById("financeChart").getContext("2d");

//   if (financeChart) financeChart.destroy();

//   financeChart = new Chart(ctx, {
//     type: "bar",
//     data: {
//       labels: ["Income", "Expense"],
//       datasets: [{
//         label: "Finance Overview",
//         data: [income, expense],
//         backgroundColor: ["#43a047", "#e53935"]
//       }]
//     },
//     options: {
//       responsive: true,
//       scales: { y: { beginAtZero: true } }
//     }
//   });
// }
