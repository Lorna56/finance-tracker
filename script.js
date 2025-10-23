const API_URL = "http://127.0.0.1:5000";
let financeChart;

document.addEventListener("DOMContentLoaded", () => {
  const typeSelect = document.getElementById("type");
  const categorySelect = document.getElementById("category");

  // Filter categories based on type
  typeSelect.addEventListener("change", () => {
    const selectedType = typeSelect.value;
    Array.from(categorySelect.options).forEach(option => {
      if (!option.value) return;
      option.style.display = option.dataset.type === selectedType ? "block" : "none";
    });
    categorySelect.value = "";
  });

  typeSelect.dispatchEvent(new Event("change"));
  loadTransactions();

  // Add Transaction
  document.getElementById("transaction-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const description = document.getElementById("description").value.trim();
    const type = typeSelect.value;
    const category = categorySelect.value;
    const amount = parseFloat(document.getElementById("amount").value);

    if (!description || !category || isNaN(amount)) {
      showToast("Please fill in all fields correctly", "error");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, category, amount, type })
      });

      if (res.ok) {
        e.target.reset();
        typeSelect.dispatchEvent(new Event("change"));
        loadTransactions();
        showToast("Transaction added successfully");
      } else {
        const err = await res.text();
        showToast("Failed to add transaction: " + err, "error");
      }
    } catch (err) {
      showToast("Error connecting to server", "error");
    }
  });
});

// Load and render transactions
async function loadTransactions() {
  try {
    const res = await fetch(`${API_URL}/transactions`);
    const data = await res.json();

    const table = document.getElementById("transactions-table");
    table.innerHTML = "";

    let incomeTotal = 0, expenseTotal = 0;

    data.forEach((tx) => {
      if (tx.type === "income") incomeTotal += tx.amount;
      else expenseTotal += tx.amount;

      const row = document.createElement("tr");
      row.style.transition = "opacity 0.5s ease";

      row.innerHTML = `
        <td>${tx.description}</td>
        <td>${tx.category}</td>
        <td>${tx.amount.toFixed(2)}</td>
        <td style="color:${tx.type === 'income' ? 'green' : 'red'}; font-weight: bold;">
          ${tx.type === 'income' ? '💰 Income' : '💸 Expense'}
        </td>
        <td>${new Date(tx.date).toLocaleDateString()}</td>
        <td class="actions">
          <button class="action-btn view-btn" data-id="${tx.id}" title="View">
            <span style="color:green; font-size: 18px;">👁</span>
          </button>
          <button class="action-btn edit-btn" data-id="${tx.id}" title="Edit">
            <span style="color:blue; font-size: 18px;">✏️</span>
          </button>
          <button class="action-btn delete-btn" data-id="${tx.id}" title="Delete">
            <span style="color:red; font-size: 18px;">🗑️</span>
          </button>
        </td>
      `;
      table.appendChild(row);
    });

    // DELETE transaction
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const tx = data.find(t => t.id == id);
        showDeleteConfirmation(tx);
      });
    });

    // VIEW transaction
    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const tx = data.find(t => t.id == id);
        showModal(`
          <h2>Transaction Details</h2>
          <p><strong>Description:</strong> ${tx.description}</p>
          <p><strong>Category:</strong> ${tx.category}</p>
          <p><strong>Amount:</strong> ${tx.amount.toFixed(2)} USD</p>
          <p><strong>Type:</strong> ${tx.type}</p>
          <p><strong>Date:</strong> ${new Date(tx.date).toLocaleString()}</p>
          <button onclick="closeModal()">Close</button>
        `);
      });
    });

    // EDIT transaction
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const tx = data.find(t => t.id == id);
        if (!tx) return;

        showModal(`
          <h2>Edit Transaction</h2>
          <form id="edit-form">
            <label>Description</label>
            <input type="text" id="edit-description" value="${tx.description}" required />
            
            <label>Category</label>
            <input type="text" id="edit-category" value="${tx.category}" required />
            
            <label>Amount</label>
            <input type="number" id="edit-amount" value="${tx.amount}" min="0.01" required />
            
            <label>Type</label>
            <select id="edit-type" required>
              <option value="income" ${tx.type === "income" ? "selected" : ""}>Income</option>
              <option value="expense" ${tx.type === "expense" ? "selected" : ""}>Expense</option>
            </select>
            
            <div style="margin-top:15px; display:flex; justify-content:space-between;">
              <button type="submit">Save Changes</button>
              <button type="button" onclick="closeModal()">Cancel</button>
            </div>
          </form>
        `);

        document.getElementById("edit-form").addEventListener("submit", async (e) => {
          e.preventDefault();

          const updatedData = {
            description: document.getElementById("edit-description").value,
            category: document.getElementById("edit-category").value,
            amount: parseFloat(document.getElementById("edit-amount").value),
            type: document.getElementById("edit-type").value
          };

          try {
            const res = await fetch(`${API_URL}/transactions/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedData)
            });

            if (res.ok) {
              closeModal();
              loadTransactions();
              showToast("Transaction updated successfully");
            } else {
              const err = await res.text();
              showToast("Failed to update transaction: " + err, "error");
            }
          } catch {
            showToast("Error connecting to server", "error");
          }
        });
      });
    });

    // Summary update
    const balance = incomeTotal - expenseTotal;
    document.getElementById("income").textContent = incomeTotal.toFixed(2) + " USD";
    document.getElementById("expense").textContent = expenseTotal.toFixed(2) + " USD";
    document.getElementById("balance").textContent = balance.toFixed(2) + " USD";

    renderChart(incomeTotal, expenseTotal);
  } catch {
    showToast("Failed to load transactions", "error");
  }
}

// Chart rendering
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
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// Helper: create modal dynamically
function showModal(contentHTML) {
  closeModal();
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-btn" onclick="closeModal()">&times;</span>
      ${contentHTML}
    </div>
  `;
  document.body.appendChild(modal);
}

// Delete confirmation modal
function showDeleteConfirmation(transaction) {
  closeDeleteModal();

  const modal = document.createElement("div");
  modal.className = "modal delete-modal";
  modal.innerHTML = `
    <div class="modal-content delete-modal-content">
      <div class="delete-modal-header">
        <span class="delete-icon">⚠️</span>
        <h2>Delete Transaction</h2>
      </div>
      <div class="delete-modal-body">
        <p>Are you sure you want to delete this transaction?</p>
        <div class="transaction-preview" style="text-align:left; margin:10px 0; padding:10px; border:1px solid #eee; border-radius:5px;">
          <p><strong>Description:</strong> ${transaction.description}</p>
          <p><strong>Category:</strong> ${transaction.category}</p>
          <p><strong>Amount:</strong> <span style="color:${transaction.type === 'income' ? 'green' : 'red'}">${transaction.amount.toFixed(2)} USD</span></p>
          <p><strong>Type:</strong> ${transaction.type}</p>
          <p><strong>Date:</strong> ${new Date(transaction.date).toLocaleDateString()}</p>
        </div>
        <p class="warning-text">This action cannot be undone.</p>
      </div>
      <div class="delete-modal-footer">
        <button class="cancel-btn">Cancel</button>
        <button class="confirm-delete-btn">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector(".cancel-btn").addEventListener("click", closeDeleteModal);
  modal.querySelector(".confirm-delete-btn").addEventListener("click", async () => {
    await confirmDelete(transaction.id);
  });
}

// Close delete modal
function closeDeleteModal() {
  const modal = document.querySelector(".delete-modal");
  if (modal) modal.remove();
}

// Confirm delete action
async function confirmDelete(id) {
  try {
    const res = await fetch(`${API_URL}/transactions/${id}`, { method: "DELETE" });
    if (res.ok) {
      closeDeleteModal();
      loadTransactions();
      showToast("Transaction deleted successfully");
    } else {
      const err = await res.text();
      showToast("Failed to delete transaction: " + err, "error");
    }
  } catch {
    showToast("Error connecting to server", "error");
  }
}

function closeModal() {
  const modal = document.querySelector(".modal");
  if (modal) modal.remove();
}

// Toast notification
function showToast(message, type = "success", duration = 3000) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  if (type === "error") toast.style.backgroundColor = "#d32f2f";
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 50);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}


// const API_URL = "http://127.0.0.1:5000";
// let financeChart;

// document.addEventListener("DOMContentLoaded", () => {
//   const typeSelect = document.getElementById("type");
//   const categorySelect = document.getElementById("category");

//   // Filter categories based on type
//   typeSelect.addEventListener("change", () => {
//     const selectedType = typeSelect.value;
//     Array.from(categorySelect.options).forEach(option => {
//       if (!option.value) return;
//       option.style.display = option.dataset.type === selectedType ? "block" : "none";
//     });
//     categorySelect.value = "";
//   });

//   typeSelect.dispatchEvent(new Event("change"));
//   loadTransactions();

//   // Add Transaction
//   document.getElementById("transaction-form").addEventListener("submit", async (e) => {
//     e.preventDefault();

//     const description = document.getElementById("description").value.trim();
//     const type = typeSelect.value;
//     const category = categorySelect.value;
//     const amount = parseFloat(document.getElementById("amount").value);

//     if (!description || !category || isNaN(amount)) {
//       alert("Please fill in all fields correctly.");
//       return;
//     }

//     await fetch(`${API_URL}/transactions`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ description, category, amount, type })
//     });

//     e.target.reset();
//     typeSelect.dispatchEvent(new Event("change"));
//     loadTransactions();
//   });
// });

// // Load and render transactions
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
//     row.style.transition = "opacity 0.5s ease";

//     row.innerHTML = `
//       <td>${tx.description}</td>
//       <td>${tx.category}</td>
//       <td>${tx.amount.toFixed(2)}</td>
//       <td style="color:${tx.type === 'income' ? 'green' : 'red'}; font-weight: bold;">
//         ${tx.type === 'income' ? '💰 Income' : '💸 Expense'}
//       </td>
//       <td>${new Date(tx.date).toLocaleDateString()}</td>
//       <td class="actions">
//         <button class="action-btn view-btn" data-id="${tx.id}" title="View">
//           <span style="color:green; font-size: 18px;">👁</span>
//         </button>
//         <button class="action-btn edit-btn" data-id="${tx.id}" title="Edit">
//           <span style="color:blue; font-size: 18px;">✏️</span>
//         </button>
//         <button class="action-btn delete-btn" data-id="${tx.id}" title="Delete">
//           <span style="color:red; font-size: 18px;">🗑️</span>
//         </button>
//       </td>
//     `;
//     table.appendChild(row);
//   });

//   // DELETE transaction
//   document.querySelectorAll(".delete-btn").forEach(btn => {
//     btn.addEventListener("click", async () => {
//       const id = btn.dataset.id;
//       const tx = data.find(t => t.id == id);
//       showDeleteConfirmation(tx);
//     });
//   });

//   // VIEW transaction
//   document.querySelectorAll(".view-btn").forEach(btn => {
//     btn.addEventListener("click", async () => {
//       const id = btn.dataset.id;
//       const tx = data.find(t => t.id == id);
//       showModal(`
//         <h2>Transaction Details</h2>
//         <p><strong>Description:</strong> ${tx.description}</p>
//         <p><strong>Category:</strong> ${tx.category}</p>
//         <p><strong>Amount:</strong> ${tx.amount.toFixed(2)} USD</p>
//         <p><strong>Type:</strong> ${tx.type}</p>
//         <p><strong>Date:</strong> ${new Date(tx.date).toLocaleString()}</p>
//         <button onclick="closeModal()">Close</button>
//       `);
//     });
//   });

//   // EDIT transaction
//   document.querySelectorAll(".edit-btn").forEach(btn => {
//     btn.addEventListener("click", async () => {
//       const id = btn.dataset.id;
//       const tx = data.find(t => t.id == id);
//       if (!tx) return;

//       showModal(`
//         <h2>Edit Transaction</h2>
//         <form id="edit-form">
//           <label>Description</label>
//           <input type="text" id="edit-description" value="${tx.description}" required />
          
//           <label>Category</label>
//           <input type="text" id="edit-category" value="${tx.category}" required />
          
//           <label>Amount</label>
//           <input type="number" id="edit-amount" value="${tx.amount}" min="0.01" required />
          
//           <label>Type</label>
//           <select id="edit-type" required>
//             <option value="income" ${tx.type === "income" ? "selected" : ""}>Income</option>
//             <option value="expense" ${tx.type === "expense" ? "selected" : ""}>Expense</option>
//           </select>
          
//           <div style="margin-top:15px; display:flex; justify-content:space-between;">
//             <button type="submit">Save Changes</button>
//             <button type="button" onclick="closeModal()">Cancel</button>
//           </div>
//         </form>
//       `);

//       document.getElementById("edit-form").addEventListener("submit", async (e) => {
//         e.preventDefault();

//         const updatedData = {
//           description: document.getElementById("edit-description").value,
//           category: document.getElementById("edit-category").value,
//           amount: parseFloat(document.getElementById("edit-amount").value),
//           type: document.getElementById("edit-type").value
//         };

//         await fetch(`${API_URL}/transactions/${id}`, {
//           method: "PUT",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(updatedData)
//         });

//         closeModal();
//         loadTransactions();
//       });
//     });
//   });

//   // Summary update
//   const balance = incomeTotal - expenseTotal;
//   document.getElementById("income").textContent = incomeTotal.toFixed(2) + " USD";
//   document.getElementById("expense").textContent = expenseTotal.toFixed(2) + " USD";
//   document.getElementById("balance").textContent = balance.toFixed(2) + " USD";

//   renderChart(incomeTotal, expenseTotal);
// }

// // Chart rendering
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
//     options: { responsive: true, scales: { y: { beginAtZero: true } } }
//   });
// }

// // Helper: create modal dynamically
// function showModal(contentHTML) {
//   closeModal();
//   const modal = document.createElement("div");
//   modal.className = "modal";
//   modal.innerHTML = `
//     <div class="modal-content">
//       <span class="close-btn" onclick="closeModal()">&times;</span>
//       ${contentHTML}
//     </div>
//   `;
//   document.body.appendChild(modal);
// }

// // Delete confirmation modal
// function showDeleteConfirmation(transaction) {
//   closeDeleteModal();

//   const modal = document.createElement("div");
//   modal.className = "modal delete-modal";
//   modal.innerHTML = `
//     <div class="modal-content delete-modal-content">
//       <div class="delete-modal-header">
//         <span class="delete-icon">⚠️</span>
//         <h2>Delete Transaction</h2>
//       </div>
//       <div class="delete-modal-body">
//         <p>Are you sure you want to delete this transaction?</p>
//         <div class="transaction-preview" style="text-align:left; margin:10px 0; padding:10px; border:1px solid #eee; border-radius:5px;">
//           <p><strong>Description:</strong> ${transaction.description}</p>
//           <p><strong>Category:</strong> ${transaction.category}</p>
//           <p><strong>Amount:</strong> <span style="color:${transaction.type === 'income' ? 'green' : 'red'}">${transaction.amount.toFixed(2)} USD</span></p>
//           <p><strong>Type:</strong> ${transaction.type}</p>
//           <p><strong>Date:</strong> ${new Date(transaction.date).toLocaleDateString()}</p>
//         </div>
//         <p class="warning-text">This action cannot be undone.</p>
//       </div>
//       <div class="delete-modal-footer">
//         <button class="cancel-btn">Cancel</button>
//         <button class="confirm-delete-btn">Delete</button>
//       </div>
//     </div>
//   `;
//   document.body.appendChild(modal);

//   modal.querySelector(".cancel-btn").addEventListener("click", closeDeleteModal);
//   modal.querySelector(".confirm-delete-btn").addEventListener("click", async () => {
//     await confirmDelete(transaction.id);
//   });
// }

// // Close delete modal
// function closeDeleteModal() {
//   const modal = document.querySelector(".delete-modal");
//   if (modal) modal.remove();
// }

// // Confirm delete action
// async function confirmDelete(id) {
//   const row = document.querySelector(`tr:has(.delete-btn[data-id="${id}"])`);
  
//   if (row) {
//     row.style.opacity = 0;
//     setTimeout(async () => {
//       await fetch(`${API_URL}/transactions/${id}`, { method: "DELETE" });
//       closeDeleteModal();
//       loadTransactions();
//     }, 400);
//   } else {
//     await fetch(`${API_URL}/transactions/${id}`, { method: "DELETE" });
//     closeDeleteModal();
//     loadTransactions();
//   }
// }

// function closeModal() {
//   const modal = document.querySelector(".modal");
//   if (modal) modal.remove();
// }



// const API_URL = "http://127.0.0.1:5000";
// let financeChart;

// document.addEventListener("DOMContentLoaded", () => {
//   const typeSelect = document.getElementById("type");
//   const categorySelect = document.getElementById("category");

//   // Filter categories based on type
//   typeSelect.addEventListener("change", () => {
//     const selectedType = typeSelect.value;
//     Array.from(categorySelect.options).forEach(option => {
//       if (!option.value) return;
//       option.style.display = option.dataset.type === selectedType ? "block" : "none";
//     });
//     categorySelect.value = "";
//   });

//   typeSelect.dispatchEvent(new Event("change"));
//   loadTransactions();

//   // Add Transaction
//   document.getElementById("transaction-form").addEventListener("submit", async (e) => {
//     e.preventDefault();

//     const description = document.getElementById("description").value.trim();
//     const type = typeSelect.value;
//     const category = categorySelect.value;
//     const amount = parseFloat(document.getElementById("amount").value);

//     if (!description || !category || isNaN(amount)) {
//       alert("Please fill in all fields correctly.");
//       return;
//     }

//     await fetch(`${API_URL}/transactions`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ description, category, amount, type })
//     });

//     e.target.reset();
//     typeSelect.dispatchEvent(new Event("change"));
//     loadTransactions();
//   });
// });

// // Load and render transactions
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
//     row.style.transition = "opacity 0.5s ease";

//     // Using emoji icons directly for reliability
//     row.innerHTML = `
//       <td>${tx.description}</td>
//       <td>${tx.category}</td>
//       <td>${tx.amount.toFixed(2)}</td>
//       <td style="color:${tx.type === 'income' ? 'green' : 'red'}; font-weight: bold;">
//         ${tx.type === 'income' ? '💰 Income' : '💸 Expense'}
//       </td>
//       <td>${new Date(tx.date).toLocaleDateString()}</td>
//       <td class="actions">
//         <button class="action-btn view-btn" data-id="${tx.id}" title="View">
//           <span style="color:green; font-size: 18px;">👁</span>
//         </button>
//         <button class="action-btn edit-btn" data-id="${tx.id}" title="Edit">
//           <span style="color:blue; font-size: 18px;">✏️</span>
//         </button>
//         <button class="action-btn delete-btn" data-id="${tx.id}" title="Delete">
//           <span style="color:red; font-size: 18px;">🗑️</span>
//         </button>
//       </td>
//     `;
//     table.appendChild(row);
//   });

//   // DELETE transaction - this is the key part
//   document.querySelectorAll(".delete-btn").forEach(btn => {
//     btn.addEventListener("click", async () => {
//       const id = btn.dataset.id;
//       const tx = data.find(t => t.id == id);
//       const row = btn.closest("tr");
      
//       // Show custom delete confirmation modal instead of the basic confirm()
//       showDeleteConfirmation(tx, row);
//     });
//   });

//   // VIEW transaction
//   document.querySelectorAll(".view-btn").forEach(btn => {
//     btn.addEventListener("click", async () => {
//       const id = btn.dataset.id;
//       const tx = data.find(t => t.id == id);
//       showModal(`
//         <h2>Transaction Details</h2>
//         <p><strong>Description:</strong> ${tx.description}</p>
//         <p><strong>Category:</strong> ${tx.category}</p>
//         <p><strong>Amount:</strong> ${tx.amount.toFixed(2)} USD</p>
//         <p><strong>Type:</strong> ${tx.type}</p>
//         <p><strong>Date:</strong> ${new Date(tx.date).toLocaleString()}</p>
//         <button onclick="closeModal()">Close</button>
//       `);
//     });
//   });

//   // EDIT transaction
//   document.querySelectorAll(".edit-btn").forEach(btn => {
//     btn.addEventListener("click", async () => {
//       const id = btn.dataset.id;
//       const tx = data.find(t => t.id == id);
//       if (!tx) return;

//       showModal(`
//         <h2>Edit Transaction</h2>
//         <form id="edit-form">
//           <label>Description</label>
//           <input type="text" id="edit-description" value="${tx.description}" required />
          
//           <label>Category</label>
//           <input type="text" id="edit-category" value="${tx.category}" required />
          
//           <label>Amount</label>
//           <input type="number" id="edit-amount" value="${tx.amount}" min="0.01" required />
          
//           <label>Type</label>
//           <select id="edit-type" required>
//             <option value="income" ${tx.type === "income" ? "selected" : ""}>Income</option>
//             <option value="expense" ${tx.type === "expense" ? "selected" : ""}>Expense</option>
//           </select>
          
//           <div style="margin-top:15px; display:flex; justify-content:space-between;">
//             <button type="submit">Save Changes</button>
//             <button type="button" onclick="closeModal()">Cancel</button>
//           </div>
//         </form>
//       `);

//       document.getElementById("edit-form").addEventListener("submit", async (e) => {
//         e.preventDefault();

//         const updatedData = {
//           description: document.getElementById("edit-description").value,
//           category: document.getElementById("edit-category").value,
//           amount: parseFloat(document.getElementById("edit-amount").value),
//           type: document.getElementById("edit-type").value
//         };

//         await fetch(`${API_URL}/transactions/${id}`, {
//           method: "PUT",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(updatedData)
//         });

//         closeModal();
//         loadTransactions();
//       });
//     });
//   });

//   // Summary update
//   const balance = incomeTotal - expenseTotal;
//   document.getElementById("income").textContent = incomeTotal.toFixed(2) + " USD";
//   document.getElementById("expense").textContent = expenseTotal.toFixed(2) + " USD";
//   document.getElementById("balance").textContent = balance.toFixed(2) + " USD";

//   renderChart(incomeTotal, expenseTotal);
// }

// // Chart rendering
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
//     options: { responsive: true, scales: { y: { beginAtZero: true } } }
//   });
// }

// // Helper: create modal dynamically
// function showModal(contentHTML) {
//   const modal = document.createElement("div");
//   modal.className = "modal";
//   modal.innerHTML = `
//     <div class="modal-content">
//       <span class="close-btn" onclick="closeModal()">&times;</span>
//       ${contentHTML}
//     </div>
//   `;
//   document.body.appendChild(modal);
// }

// // Delete confirmation modal - this is the key function
// function showDeleteConfirmation(transaction, rowElement) {
//   console.log("Showing delete confirmation"); // Debug log
  
//   const modal = document.createElement("div");
//   modal.className = "modal delete-modal";
//   modal.innerHTML = `
//     <div class="modal-content delete-modal-content">
//       <div class="delete-modal-header">
//         <span class="delete-icon">⚠️</span>
//         <h2>Delete Transaction</h2>
//       </div>
//       <div class="delete-modal-body">
//         <p>Are you sure you want to delete this transaction?</p>
//         <div class="transaction-preview">
//           <p><strong>Description:</strong> ${transaction.description}</p>
//           <p><strong>Category:</strong> ${transaction.category}</p>
//           <p><strong>Amount:</strong> <span style="color:${transaction.type === 'income' ? 'green' : 'red'}">${transaction.amount.toFixed(2)} USD</span></p>
//           <p><strong>Type:</strong> ${transaction.type}</p>
//           <p><strong>Date:</strong> ${new Date(transaction.date).toLocaleDateString()}</p>
//         </div>
//         <p class="warning-text">This action cannot be undone.</p>
//       </div>
//       <div class="delete-modal-footer">
//         <button class="cancel-btn" onclick="closeDeleteModal()">Cancel</button>
//         <button class="confirm-delete-btn" onclick="confirmDelete('${transaction.id}')">Delete</button>
//       </div>
//     </div>
//   `;
//   document.body.appendChild(modal);
// }

// // Close delete modal
// function closeDeleteModal() {
//   const modal = document.querySelector(".delete-modal");
//   if (modal) modal.remove();
// }

// // Confirm delete action
// async function confirmDelete(id) {
//   console.log("Confirming delete for ID:", id); // Debug log
  
//   // Find the row element
//   const row = document.querySelector(`tr:has(.delete-btn[data-id="${id}"])`);
  
//   if (row) {
//     row.style.opacity = 0;
//     setTimeout(async () => {
//       await fetch(`${API_URL}/transactions/${id}`, { method: "DELETE" });
//       closeDeleteModal();
//       loadTransactions();
//     }, 400);
//   } else {
//     // Fallback if row element reference is lost
//     await fetch(`${API_URL}/transactions/${id}`, { method: "DELETE" });
//     closeDeleteModal();
//     loadTransactions();
//   }
// }

// function closeModal() {
//   const modal = document.querySelector(".modal");
//   if (modal) modal.remove();
// }
