// =========================================================================
// BẾP GỌN AI - CLIENT-SIDE LOGIC & REAL PRODUCTION SUITE
// Bản quyền & Phát triển bởi: LocTM (https://ltmprofile.pages.dev/)
// =========================================================================

let state = {
  menu: [],
  cart: [],
  orders: [],
  inventory: [],
  reviews: [],
  currentMode: 'customer',
  activeCustomerTab: 'menu',
  activeAdminTab: 'forecast',
  selectedRating: 5,
  lastForecastData: null,
  charts: {
    forecast: null,
    sentiment: null,
    breakEven: null
  }
};

// -------------------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadLocalCart();
  fetchDynamicPricing();
  fetchMenu();
  fetchReviews();
  loadAdminOrders();
  loadInventory();
  runDemandForecast();
  runFinancialSimulation();
  loadSentimentAnalysis();

  if (window.lucide) {
    lucide.createIcons();
  }
});

function refreshIcons() {
  setTimeout(() => {
    if (window.lucide) lucide.createIcons();
  }, 50);
}

// -------------------------------------------------------------------------
// VIEW MODE SWITCHING (Customer vs Kitchen Admin)
// -------------------------------------------------------------------------
function switchViewMode(mode) {
  state.currentMode = mode;
  const custView = document.getElementById('view-customer');
  const admView = document.getElementById('view-admin');
  const btnCust = document.getElementById('btn-mode-customer');
  const btnAdm = document.getElementById('btn-mode-admin');

  if (mode === 'customer') {
    custView.classList.remove('hidden');
    admView.classList.add('hidden');
    btnCust.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm bg-white text-slate-900 border border-slate-200/80';
    btnAdm.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800';
  } else {
    custView.classList.add('hidden');
    admView.classList.remove('hidden');
    btnAdm.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm bg-white text-slate-900 border border-slate-200/80';
    btnCust.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800';
    
    loadAdminOrders();
    loadInventory();
    setTimeout(() => {
      if (state.charts.forecast) state.charts.forecast.resize();
      if (state.charts.sentiment) state.charts.sentiment.resize();
    }, 100);
  }
  refreshIcons();
}

// Customer Tabs
function switchCustomerTab(tab) {
  state.activeCustomerTab = tab;
  const tabs = ['menu', 'forecast', 'simulation', 'ai-wizard', 'ai-chat', 'reviews'];
  tabs.forEach(t => {
    const el = document.getElementById(`cust-tab-content-${t}`);
    const btn = document.getElementById(`btn-cust-tab-${t}`);
    if (el) {
      if (t === tab) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
    if (btn) {
      if (t === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });

  if (tab === 'forecast') {
    if (!state.lastForecastData) {
      runDemandForecast();
    } else {
      setTimeout(() => {
        if (state.charts.forecast) state.charts.forecast.resize();
      }, 100);
    }
  }

  if (tab === 'simulation') {
    runFinancialSimulation();
    setTimeout(() => {
      if (state.charts.breakEven) state.charts.breakEven.resize();
    }, 100);
  }

  refreshIcons();
}

// Admin Tabs
function switchAdminTab(tab) {
  state.activeAdminTab = tab;
  const tabs = ['kanban', 'inventory', 'sentiment-insights'];
  tabs.forEach(t => {
    const el = document.getElementById(`adm-tab-content-${t}`);
    const btn = document.getElementById(`btn-adm-tab-${t}`);
    if (el) {
      if (t === tab) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
    if (btn) {
      if (t === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });

  if (tab === 'sentiment-insights' && state.charts.sentiment) {
    state.charts.sentiment.resize();
  }
  refreshIcons();
}

function openSimulationFromAdmin() {
  switchViewMode('customer');
  switchCustomerTab('simulation');
  window.scrollTo({ top: 100, behavior: 'smooth' });
  showToast('📊 Đang mở Bảng Tính Điểm Hòa Vốn & Dự Phóng Tài Chính');
}

function openForecastFromAdmin() {
  switchViewMode('customer');
  switchCustomerTab('forecast');
  window.scrollTo({ top: 100, behavior: 'smooth' });
  showToast('📈 Đang mở Bảng Điều Khiển Dự Báo Nhu Cầu AI & Kế Hoạch Đi Chợ BOM');
}

function onStudentSliderChange(val) {
  const el = document.getElementById('forecast-students-val');
  if (el) el.textContent = `${Number(val).toLocaleString()} người`;
}

// -------------------------------------------------------------------------
// 1. MENU & DYNAMIC PRICING (HỆ THỐNG AI 5)
// -------------------------------------------------------------------------
async function fetchDynamicPricing() {
  try {
    const res = await fetch('/api/ai/dynamic-pricing');
    const data = await res.json();
    if (data.success) {
      document.getElementById('pricing-slot-text').textContent = `${data.slotLabel} – AI tự động tối ưu giá bán`;
      state.menu = data.menu;
      renderMenu(state.menu);
    }
  } catch (err) {
    console.error('Lỗi tải Dynamic Pricing:', err);
  }
}

async function fetchMenu() {
  try {
    const res = await fetch('/api/menu');
    const data = await res.json();
    if (data.success && (!state.menu || state.menu.length === 0)) {
      state.menu = data.data;
      renderMenu(state.menu);
    }
  } catch (err) {
    console.error('Lỗi tải menu:', err);
  }
}

function filterMenu(category) {
  document.querySelectorAll('.menu-filter-btn').forEach(btn => {
    btn.className = 'menu-filter-btn px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition';
  });
  event.target.className = 'menu-filter-btn active px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-white transition';

  if (category === 'all') {
    renderMenu(state.menu);
  } else {
    const filtered = state.menu.filter(m => m.category === category);
    renderMenu(filtered);
  }
}

function renderMenu(items) {
  const container = document.getElementById('menu-grid');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 text-sm">Không tìm thấy món phù hợp</div>';
    return;
  }

  container.innerHTML = items.map(dish => {
    const isDiscounted = dish.discountPercent > 0;
    return `
      <div class="liquid-card overflow-hidden border border-slate-200/80 shadow-sm flex flex-col justify-between group">
        <div>
          <div class="relative h-48 overflow-hidden bg-slate-100">
            <img src="${dish.image}" alt="${dish.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent"></div>
            
            <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
              ${dish.isVegetarian ? `<span class="bg-emerald-600/90 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full backdrop-blur-md">Chay Healthy</span>` : ''}
              ${dish.isSpicy ? `<span class="bg-rose-600/90 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full backdrop-blur-md">Vị Cay Tiêu</span>` : ''}
              ${isDiscounted ? `<span class="bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg animate-pulse">GIẢM -${dish.discountPercent}%</span>` : ''}
            </div>

            <div class="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
              <i data-lucide="flame" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>${dish.calories} kcal</span>
            </div>
          </div>

          <div class="p-5 sm:p-6 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-extrabold text-sm text-slate-900 leading-snug group-hover:text-brand-600 transition">${dish.name}</h3>
            </div>
            
            <p class="text-xs text-slate-500 leading-relaxed line-clamp-2">${dish.description}</p>
            
            <div class="flex items-center gap-2 text-[10px] text-slate-500 font-medium bg-slate-50 p-2 rounded-xl">
              <span>Đạm: <b class="text-slate-800">${dish.protein}g</b></span>
              <span>•</span>
              <span>Carb: <b class="text-slate-800">${dish.carbs}g</b></span>
              <span>•</span>
              <span>Béo: <b class="text-slate-800">${dish.fat}g</b></span>
            </div>

            ${isDiscounted ? `
              <div class="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg font-medium border border-amber-200">
                ${dish.pricingReason}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="p-5 pt-0 flex items-center justify-between border-t border-slate-100 mt-2">
          <div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-lg font-black text-brand-600">${dish.price.toLocaleString()}đ</span>
              ${isDiscounted ? `<span class="text-xs text-slate-400 line-through">${dish.originalPrice.toLocaleString()}đ</span>` : ''}
            </div>
            <span class="text-[10px] text-slate-400">Suất ăn tiêu chuẩn</span>
          </div>

          <button onclick="addToCart('${dish.id}')" class="btn-ios-primary text-xs py-2 px-4 hover:bg-brand-700 text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-md shadow-brand-500/20 active:scale-95">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Thêm giỏ</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  refreshIcons();
}

// -------------------------------------------------------------------------
// 2. SHOPPING CART & ORDER PLACEMENT
// -------------------------------------------------------------------------
function loadLocalCart() {
  try {
    const saved = localStorage.getItem('bep_gon_cart');
    if (saved) state.cart = JSON.parse(saved);
  } catch (e) {}
  updateCartBadge();
}

function saveLocalCart() {
  try {
    localStorage.setItem('bep_gon_cart', JSON.stringify(state.cart));
  } catch (e) {}
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const totalItems = state.cart.reduce((sum, i) => sum + i.quantity, 0);
  if (badge) badge.textContent = totalItems; const mobBadge = document.getElementById('mob-cart-badge'); if (mobBadge) mobBadge.textContent = totalItems;
}

function toggleCartDrawer() {
  const overlay = document.getElementById('cart-drawer-overlay');
  const drawer = document.getElementById('cart-drawer');
  if (drawer.classList.contains('translate-x-full')) {
    drawer.classList.remove('translate-x-full');
    overlay.classList.remove('hidden');
    renderCart();
  } else {
    drawer.classList.add('translate-x-full');
    overlay.classList.add('hidden');
  }
  refreshIcons();
}

function addToCart(dishId, quantity = 1) {
  const dish = state.menu.find(m => m.id === dishId);
  if (!dish) return;

  const existing = state.cart.find(i => i.id === dishId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    state.cart.push({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      calories: dish.calories,
      image: dish.image,
      quantity: quantity
    });
  }

  saveLocalCart();
  renderCart();
  showToast(`Đã thêm ${dish.name} vào giỏ hàng!`);
}

function updateCartQty(dishId, delta) {
  const item = state.cart.find(i => i.id === dishId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => i.id !== dishId);
  }

  saveLocalCart();
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('cart-subtotal');
  const totalEl = document.getElementById('cart-total');

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-400 text-xs">
        <i data-lucide="shopping-cart" class="w-10 h-10 mx-auto mb-2 opacity-30"></i>
        Giỏ hàng đang trống. Hãy chọn món ngon từ menu nhé!
      </div>
    `;
    subtotalEl.textContent = '0đ';
    totalEl.textContent = '0đ';
    refreshIcons();
    return;
  }

  let subtotal = 0;
  container.innerHTML = state.cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    return `
      <div class="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
        <div class="flex items-center gap-3">
          <img src="${item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120'}" class="w-12 h-12 rounded-xl object-cover">
          <div>
            <h4 class="font-bold text-xs text-slate-800 line-clamp-1">${item.name}</h4>
            <span class="text-[11px] font-black text-brand-600">${item.price.toLocaleString()}đ</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center border border-slate-200 bg-white rounded-lg">
            <button onclick="updateCartQty('${item.id}', -1)" class="px-2 py-0.5 text-xs font-bold text-slate-500 hover:text-slate-800">-</button>
            <span class="px-2 text-xs font-extrabold text-slate-800">${item.quantity}</span>
            <button onclick="updateCartQty('${item.id}', 1)" class="px-2 py-0.5 text-xs font-bold text-slate-500 hover:text-slate-800">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  subtotalEl.textContent = `${subtotal.toLocaleString()}đ`;
  totalEl.textContent = `${subtotal.toLocaleString()}đ`;
  refreshIcons();
}

async function submitOrder() {
  if (state.cart.length === 0) {
    alert('Giỏ hàng trống! Vui lòng chọn món trước.');
    return;
  }

  const name = document.getElementById('order-customer-name').value.trim();
  const phone = document.getElementById('order-phone').value.trim();
  const address = document.getElementById('order-address').value.trim();
  const payment = document.getElementById('order-payment').value;

  if (!name || !phone) {
    alert('Vui lòng nhập họ tên và số điện thoại giao hàng!');
    return;
  }

  const orderData = {
    customerName: name,
    phone,
    address,
    paymentMethod: payment,
    items: state.cart.map(i => ({ id: i.id, quantity: i.quantity })),
    aiRecommendationsApplied: true
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const result = await res.json();

    if (result.success) {
      if (window.confetti) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      state.cart = [];
      saveLocalCart();
      toggleCartDrawer();

      // Show Payment Modal with VietQR if QR code payment selected
      if (payment === 'qr_code' && result.order.paymentQrUrl) {
        showPaymentModal(result.order);
      } else {
        showToast(`🎉 Đặt đơn thành công! Mã đơn: ${result.order.id}`);
      }

      loadAdminOrders();
      loadInventory();
    } else {
      alert(result.message || 'Đặt đơn không thành công');
    }
  } catch (err) {
    console.error('Lỗi đặt đơn:', err);
    alert('Không thể kết nối đến máy chủ.');
  }
}

function showPaymentModal(order) {
  document.getElementById('modal-qr-image').src = order.paymentQrUrl;
  document.getElementById('modal-order-id').textContent = order.id;
  document.getElementById('modal-order-amount').textContent = `${order.totalAmount.toLocaleString()}đ`;
  document.getElementById('payment-modal-overlay').classList.remove('hidden');
}

function closePaymentModal() {
  document.getElementById('payment-modal-overlay').classList.add('hidden');
  showToast('Cảm ơn bạn! Đơn hàng đã được chuyển tới bếp để chế biến.');
}

// -------------------------------------------------------------------------
// 3. HỆ THỐNG AI 1: AI ĐỀ XUẤT THỰC ĐƠN CÁ NHÂN HÓA (WIZARD)
// -------------------------------------------------------------------------
function updateBudgetDisplay(val) {
  document.getElementById('wizard-budget-display').textContent = `${Number(val).toLocaleString()}đ`;
}

async function generateAIRecommendation() {
  const btn = document.getElementById('btn-run-wizard');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>AI ĐANG TỐI ƯU HÓA...</span>`;
  refreshIcons();

  const budget = Number(document.getElementById('wizard-budget').value);
  const goal = document.getElementById('wizard-goal').value;
  const dietary = document.getElementById('wizard-dietary').value;
  const allergyVal = document.getElementById('wizard-allergies').value;
  const allergies = allergyVal ? [allergyVal] : [];

  try {
    const res = await fetch('/api/ai/recommend-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget, goal, dietary, allergies })
    });
    const result = await res.json();

    if (result.success) {
      renderAIWizardResults(result.data);
    }
  } catch (err) {
    console.error('Lỗi gọi AI Wizard:', err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="cpu" class="w-4 h-4"></i><span>AI PHÂN TÍCH & TẠO THỰC ĐƠN NGAY</span>`;
    refreshIcons();
  }
}

function renderAIWizardResults(data) {
  const resultsContainer = document.getElementById('wizard-results');
  resultsContainer.classList.remove('hidden');

  const bestDishContainer = document.getElementById('wizard-best-dish');
  const main = data.bestRecommendation.mainDish;
  const side = data.bestRecommendation.suggestedSide;

  bestDishContainer.innerHTML = `
    <img src="${main.image}" alt="${main.name}" class="w-32 h-32 md:w-44 md:h-44 rounded-2xl object-cover shadow-md flex-shrink-0">
    <div class="space-y-3 flex-1">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="bg-brand-100 text-brand-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full">LỰA CHỌN TỐI ƯU NHẤT</span>
        <span class="text-xs text-slate-500">${main.calories} kcal • Đạm ${main.protein}g</span>
      </div>
      
      <h3 class="text-xl font-black text-slate-900">${main.name}</h3>
      <p class="text-xs text-slate-600 leading-relaxed">${data.bestRecommendation.reason}</p>

      ${side ? `
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-900 flex items-center justify-between">
          <span>💡 Gợi ý kèm thêm: <b>${side.name}</b> (+${side.price.toLocaleString()}đ)</span>
          <span class="font-bold">Tổng combo: ${data.bestRecommendation.totalComboPrice.toLocaleString()}đ</span>
        </div>
      ` : ''}

      <div class="flex items-center gap-3 pt-2">
        <button onclick="addToCart('${main.id}'); ${side ? `addToCart('${side.id}');` : ''}" class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-md shadow-brand-500/20">
          <i data-lucide="check" class="w-4 h-4"></i>
          <span>Thêm Combo này vào giỏ (${data.bestRecommendation.totalComboPrice.toLocaleString()}đ)</span>
        </button>
      </div>
    </div>
  `;

  const tbody = document.getElementById('wizard-week-tbody');
  tbody.innerHTML = data.weekPlan.map(item => `
    <tr class="hover:bg-slate-50 transition">
      <td class="py-3 px-3 font-bold text-slate-900">${item.day}</td>
      <td class="py-3 px-3 font-semibold text-slate-800">${item.dishName}</td>
      <td class="py-3 px-3 text-slate-500">${item.calories} kcal</td>
      <td class="py-3 px-3 text-slate-500">${item.protein}g / ${item.carbs}g / ${item.fat}g</td>
      <td class="py-3 px-3 font-bold text-brand-600">${item.price.toLocaleString()}đ</td>
      <td class="py-3 px-3 text-right">
        <button onclick="addToCart('${item.dishId}')" class="px-3 py-1 rounded-lg bg-slate-100 hover:bg-brand-600 hover:text-white font-bold text-[11px] transition">
          Chọn món ngày này
        </button>
      </td>
    </tr>
  `).join('');

  document.getElementById('wizard-week-summary').innerHTML = `
    <span>Trung bình: <b>${data.weeklySummary.avgCalories} kcal/ngày</b></span> | 
    <span>Tổng tuần: <b class="text-brand-600">${data.weeklySummary.totalCost.toLocaleString()}đ</b></span>
  `;

  refreshIcons();
}

// -------------------------------------------------------------------------
// 4. HỆ THỐNG AI 3: TRỢ LÝ ĐẶT MÓN 24/7 (NLP CHATBOT)
// -------------------------------------------------------------------------
function handleChatKey(e) {
  if (e.key === 'Enter') sendChatMessage();
}

function sendQuickPrompt(text) {
  document.getElementById('chat-input').value = text;
  sendChatMessage();
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  const chatContainer = document.getElementById('chat-messages');

  chatContainer.innerHTML += `
    <div class="flex items-start gap-3 justify-end">
      <div class="bg-brand-600 text-white p-3.5 rounded-2xl rounded-tr-none text-xs leading-relaxed max-w-lg shadow-sm">
        ${escapeHtml(message)}
      </div>
      <div class="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">Bạn</div>
    </div>
  `;
  input.value = '';
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const typingId = `typing-${Date.now()}`;
  chatContainer.innerHTML += `
    <div id="${typingId}" class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">AI</div>
      <div class="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 text-xs text-slate-400 flex items-center gap-1.5 shadow-sm">
        <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
      </div>
    </div>
  `;
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    const res = await fetch('/api/ai/chat-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, currentCart: state.cart })
    });
    const result = await res.json();

    document.getElementById(typingId)?.remove();

    if (result.success) {
      const actionsHtml = result.suggestedActions.map(act => {
        if (act.action === 'add_to_cart') {
          return `<button onclick="addToCart('${act.dishId}', ${act.quantity || 1})" class="px-2.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 font-bold text-[11px] transition text-left flex items-center gap-1.5"><i data-lucide="plus" class="w-3.5 h-3.5 text-brand-600"></i> ${act.label}</button>`;
        } else {
          return `<button onclick="sendQuickPrompt('${act.label}')" class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-[11px] transition text-left">${act.label}</button>`;
        }
      }).join('');

      chatContainer.innerHTML += `
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">AI</div>
          <div class="bg-white p-3.5 rounded-2xl rounded-tl-none border border-slate-200 text-xs leading-relaxed max-w-lg shadow-sm space-y-2">
            <div class="whitespace-pre-line text-slate-800">${result.reply}</div>
            ${actionsHtml ? `<div class="pt-2 flex flex-wrap gap-1.5 border-t border-slate-100">${actionsHtml}</div>` : ''}
          </div>
        </div>
      `;
    }
  } catch (err) {
    document.getElementById(typingId)?.remove();
    console.error('Lỗi Chat AI:', err);
  }

  chatContainer.scrollTop = chatContainer.scrollHeight;
  refreshIcons();
}

function clearChat() {
  document.getElementById('chat-messages').innerHTML = `
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">AI</div>
      <div class="bg-white p-3.5 rounded-2xl rounded-tl-none border border-slate-200 text-xs leading-relaxed max-w-lg shadow-sm">
        Hội thoại đã được làm mới. Bạn cần hỗ trợ chọn món ăn nào trưa nay?
      </div>
    </div>
  `;
}

// -------------------------------------------------------------------------
// 5. HỆ THỐNG AI 2: DỰ BÁO NHU CẦU & BẢNG ĐI CHỢ TỰ ĐỘNG (BOM)
// -------------------------------------------------------------------------
async function runDemandForecast() {
  const weatherEl = document.getElementById('forecast-weather');
  const eventEl = document.getElementById('forecast-event');
  const studentsEl = document.getElementById('forecast-students');

  const weather = weatherEl ? weatherEl.value : 'sunny';
  const campusEvent = eventEl ? eventEl.value : 'regular';
  const expectedStudents = studentsEl ? Number(studentsEl.value) : 1500;

  const btn = document.getElementById('btn-trigger-forecast');
  if (btn) {
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>ĐANG TÍNH TOÁN AI...</span>`;
    btn.classList.add('opacity-80', 'pointer-events-none');
    refreshIcons();
  }

  try {
    const res = await fetch('/api/ai/forecast-demand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weather, campusEvent, expectedStudents })
    });
    const result = await res.json();

    if (result.success) {
      state.lastForecastData = result.data;
      renderForecastData(result.data);
      showToast(`⚡ Đã tính toán dự báo: ${result.data.metrics.totalMealsForecasted} suất ăn!`);
    }
  } catch (err) {
    console.error('Lỗi chạy dự báo:', err);
  } finally {
    if (btn) {
      btn.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4"></i><span>CHẠY DỰ BÁO NGAY</span>`;
      btn.classList.remove('opacity-80', 'pointer-events-none');
      refreshIcons();
    }
  }
}

function renderForecastData(data) {
  if (!data) return;

  const insightsList = document.getElementById('forecast-insights-list');
  if (insightsList && data.insights) {
    insightsList.innerHTML = data.insights.map(i => `<div>• ${i}</div>`).join('');
  }

  if (document.getElementById('metric-forecast-meals')) {
    document.getElementById('metric-forecast-meals').textContent = `${data.metrics.totalMealsForecasted} suất`;
  }
  if (document.getElementById('metric-forecast-drinks')) {
    document.getElementById('metric-forecast-drinks').textContent = `${data.metrics.totalBeveragesForecasted} phần`;
  }
  if (document.getElementById('metric-forecast-revenue')) {
    document.getElementById('metric-forecast-revenue').textContent = `${data.metrics.projectedRevenue.toLocaleString()}đ`;
  }
  if (document.getElementById('metric-forecast-cogs')) {
    document.getElementById('metric-forecast-cogs').textContent = `${data.metrics.totalGroceryCost.toLocaleString()}đ`;
  }
  if (document.getElementById('metric-forecast-profit')) {
    document.getElementById('metric-forecast-profit').textContent = `${data.metrics.projectedGrossProfit.toLocaleString()}đ (${data.metrics.projectedMargin})`;
  }

  // Update Break-even Card in Forecast tab
  const bepTargetEl = document.getElementById('forecast-bep-target');
  if (bepTargetEl) {
    bepTargetEl.textContent = `${data.metrics.dailyBreakEvenMeals || 50} suất/ngày`;
  }

  const bepBadge = document.getElementById('forecast-bep-badge');
  if (bepBadge) {
    const diff = (data.metrics.totalMealsForecasted || 0) - (data.metrics.dailyBreakEvenMeals || 50);
    if (diff >= 0) {
      bepBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300';
      bepBadge.textContent = `VƯỢT ĐIỂM HÒA VỐN (+${diff} SUẤT)`;
    } else {
      bepBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300';
      bepBadge.textContent = `DƯỚI ĐIỂM HÒA VỐN (${diff} SUẤT)`;
    }
  }

  if (document.getElementById('bom-total-buy-cost')) {
    document.getElementById('bom-total-buy-cost').innerHTML = `Tổng tiền cần đi chợ: <span class="text-rose-600 font-black text-base block mt-0.5">${data.metrics.totalGroceryCost.toLocaleString()}đ</span>`;
  }

  // Render Dish Cards Grid
  const cardsGrid = document.getElementById('forecast-dish-cards-grid');
  if (cardsGrid && data.forecastedItems) {
    const maxQty = Math.max(...data.forecastedItems.map(i => i.forecastedQty), 1);
    cardsGrid.innerHTML = data.forecastedItems.map(item => {
      const pct = Math.round((item.forecastedQty / maxQty) * 100);
      const isCom = item.category.startsWith('com');
      const badgeClass = item.category === 'com_man' 
        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
        : (item.category === 'com_chay' 
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
            : 'bg-blue-100 text-blue-800 border border-blue-200');
      const badgeText = item.category === 'com_man' 
        ? 'Cơm Mặn' 
        : (item.category === 'com_chay' ? 'Chay Healthy' : (item.category === 'canh' ? 'Canh' : 'Nước Uống'));

      return `
        <div class="liquid-card p-4 space-y-3 bg-white/70 hover:bg-white/95 transition-all">
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1">
              <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">${badgeText}</span>
              <h4 class="font-extrabold text-sm text-slate-900 leading-snug">${item.name}</h4>
              <p class="text-xs text-slate-500 font-semibold">${item.price.toLocaleString()}đ / phần</p>
            </div>
            <div class="text-right flex-shrink-0 bg-brand-50/80 px-3 py-1.5 rounded-2xl border border-brand-100">
              <span class="text-xl font-black text-brand-600">${item.forecastedQty}</span>
              <span class="text-[10px] font-bold text-slate-500 block">${isCom ? 'suất' : 'phần'}</span>
            </div>
          </div>

          <div class="space-y-1.5 pt-1">
            <div class="flex justify-between text-[11px] text-slate-500 font-semibold">
              <span>Tỷ trọng thực đơn:</span>
              <span class="text-slate-800 font-extrabold">${pct}%</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
              <div class="bg-gradient-to-r from-brand-500 to-emerald-400 h-2 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span class="text-slate-500 font-medium">Doanh thu dự phóng:</span>
            <span class="font-black text-slate-900 text-xs">${(item.forecastedQty * item.price).toLocaleString()}đ</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Chart safely
  const chartCanvas = document.getElementById('forecastChart');
  if (chartCanvas && typeof Chart !== 'undefined') {
    try {
      const ctx = chartCanvas.getContext('2d');
      const labels = data.forecastedItems.map(i => i.name.replace('Cơm ', '').replace(' (Chay)', ''));
      const quantities = data.forecastedItems.map(i => i.forecastedQty);

      if (state.charts.forecast) {
        state.charts.forecast.destroy();
      }

      state.charts.forecast = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Số suất dự báo',
            data: quantities,
            backgroundColor: '#10b981',
            borderRadius: 8,
            hoverBackgroundColor: '#059669'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `Dự báo: ${ctx.parsed.y} suất`
              }
            }
          },
          scales: {
            y: { 
              beginAtZero: true, 
              grid: { color: 'rgba(241, 245, 249, 0.8)' },
              ticks: { font: { family: "'Plus Jakarta Sans', sans-serif" } }
            },
            x: { 
              grid: { display: false },
              ticks: { 
                font: { family: "'Plus Jakarta Sans', sans-serif", size: 10 },
                maxRotation: 45,
                minRotation: 0
              }
            }
          }
        }
      });
    } catch (chartErr) {
      console.warn('Forecast chart error:', chartErr);
    }
  }

  // Render Shopping List Table (BOM)
  const tbody = document.getElementById('bom-table-tbody');
  if (tbody && data.shoppingList) {
    tbody.innerHTML = data.shoppingList.map(item => {
      const isNeedBuy = item.status === 'need_purchase';
      return `
        <tr class="hover:bg-slate-50/80 transition">
          <td class="py-3 px-3 font-bold text-slate-800">${item.name}</td>
          <td class="py-3 px-3 font-semibold text-slate-700">${item.requiredForCooking} ${item.unit}</td>
          <td class="py-3 px-3 text-slate-500">${item.currentStock} ${item.unit}</td>
          <td class="py-3 px-3">
            ${isNeedBuy 
              ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-200">Cần mua +${item.needToBuy} ${item.unit}</span>`
              : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Đủ trong kho</span>`}
          </td>
          <td class="py-3 px-3 text-slate-500">${item.costPerUnit.toLocaleString()}đ/${item.unit}</td>
          <td class="py-3 px-3 text-right font-extrabold ${isNeedBuy ? 'text-rose-600' : 'text-slate-400'}">
            ${item.estimatedCost.toLocaleString()}đ
          </td>
        </tr>
      `;
    }).join('');
  }

  refreshIcons();
}

// DUYỆT NHẬP KHO TỰ ĐỘNG
async function approveGroceryList() {
  if (!state.lastForecastData || !state.lastForecastData.shoppingList) {
    alert('Vui lòng tính toán bảng dự báo trước!');
    return;
  }

  const itemsToBuy = state.lastForecastData.shoppingList.filter(i => i.needToBuy > 0);
  if (itemsToBuy.length === 0) {
    alert('Kho hiện tại đã đủ toàn bộ nguyên liệu, không cần nhập thêm!');
    return;
  }

  if (!confirm(`Xác nhận duyệt nhập kho tự động cho ${itemsToBuy.length} loại nguyên liệu với tổng giá trị ${state.lastForecastData.metrics.totalGroceryCost.toLocaleString()}đ?`)) {
    return;
  }

  try {
    const res = await fetch('/api/inventory/approve-grocery-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: itemsToBuy })
    });
    const result = await res.json();

    if (result.success) {
      showToast(`✅ ${result.message}`);
      loadInventory();
      runDemandForecast();
    } else {
      alert(result.message || 'Lỗi nhập kho');
    }
  } catch (err) {
    console.error('Lỗi duyệt nhập kho:', err);
  }
}

// -------------------------------------------------------------------------
// 6. KITCHEN ORDER KANBAN & INVENTORY MONITOR
// -------------------------------------------------------------------------
async function loadAdminOrders() {
  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.success) {
      state.orders = data.data;
      renderKanban(state.orders);
    }
  } catch (err) {
    console.error('Lỗi tải đơn hàng:', err);
  }
}

function renderKanban(orders) {
  const cols = {
    pending: document.getElementById('kanban-col-pending'),
    cooking: document.getElementById('kanban-col-cooking'),
    delivering: document.getElementById('kanban-col-delivering'),
    completed: document.getElementById('kanban-col-completed')
  };

  const counts = { pending: 0, cooking: 0, delivering: 0, completed: 0 };
  Object.values(cols).forEach(col => col.innerHTML = '');

  let totalRev = 0;

  orders.forEach(order => {
    if (counts[order.status] !== undefined) counts[order.status]++;
    totalRev += order.totalAmount;

    const targetCol = cols[order.status] || cols.pending;
    targetCol.innerHTML += `
      <div class="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-extrabold text-slate-900">${order.id}</span>
          <span class="text-slate-400">${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div>
          <div class="font-bold text-xs text-slate-800">${order.customerName} (${order.phone})</div>
          <div class="text-[11px] text-slate-500 line-clamp-1">${order.address}</div>
        </div>

        <div class="space-y-1 py-1 border-t border-b border-slate-100 text-[11px]">
          ${order.items.map(i => `<div class="flex justify-between text-slate-700"><span>${i.name}</span><b class="text-slate-900">x${i.quantity}</b></div>`).join('')}
        </div>

        <div class="flex items-center justify-between pt-1">
          <span class="font-black text-brand-600 text-xs">${order.totalAmount.toLocaleString()}đ</span>
          
          <div class="flex items-center gap-1">
            ${order.status === 'pending' ? `<button onclick="updateOrderStatus('${order.id}', 'cooking')" class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold">Duyệt nấu</button>` : ''}
            ${order.status === 'cooking' ? `<button onclick="updateOrderStatus('${order.id}', 'delivering')" class="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold">Giao hàng</button>` : ''}
            ${order.status === 'delivering' ? `<button onclick="updateOrderStatus('${order.id}', 'completed')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold">Hoàn tất</button>` : ''}
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById('kanban-count-pending').textContent = counts.pending;
  document.getElementById('kanban-count-cooking').textContent = counts.cooking;
  document.getElementById('kanban-count-delivering').textContent = counts.delivering;
  document.getElementById('kanban-count-completed').textContent = counts.completed;

  document.getElementById('stat-total-orders').textContent = `${orders.length} đơn`;
  document.getElementById('stat-total-revenue').textContent = `${totalRev.toLocaleString()}đ`;
  refreshIcons();
}

async function updateOrderStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const result = await res.json();
    if (result.success) {
      loadAdminOrders();
      showToast(`Đã cập nhật trạng thái đơn ${id}`);
    }
  } catch (err) {
    console.error('Lỗi cập nhật trạng thái đơn:', err);
  }
}

async function loadInventory() {
  try {
    const res = await fetch('/api/inventory');
    const data = await res.json();
    if (data.success) {
      state.inventory = data.data;
      renderInventoryTable(state.inventory);
    }
  } catch (err) {
    console.error('Lỗi tải kho:', err);
  }
}

function renderInventoryTable(items) {
  const tbody = document.getElementById('inventory-table-tbody');
  if (!tbody) return;

  tbody.innerHTML = items.map(item => {
    let badge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">An toàn</span>`;
    if (item.riskLevel === 'critical') {
      badge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 animate-pulse">CẬN DATE (1 NGÀY)</span>`;
    } else if (item.riskLevel === 'warning') {
      badge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">SẮP HẾT</span>`;
    }

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-3 font-bold text-slate-800">${item.name}</td>
        <td class="py-3 px-3 font-extrabold text-slate-900">${item.currentStock} ${item.unit}</td>
        <td class="py-3 px-3 text-slate-500">${item.minStock} ${item.unit}</td>
        <td class="py-3 px-3">${badge}</td>
        <td class="py-3 px-3 text-slate-500">${item.supplier}</td>
        <td class="py-3 px-3 text-xs text-slate-600 max-w-xs">${item.recommendation}</td>
        <td class="py-3 px-3 text-right">
          <button onclick="promptRestock('${item.id}', '${item.name}', '${item.unit}')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition">
            + Nhập kho
          </button>
        </td>
      </tr>
    `;
  }).join('');

  refreshIcons();
}

async function promptRestock(id, name, unit) {
  const amount = prompt(`Nhập số lượng ${unit} ${name} muốn nhập thêm:`, '5');
  if (amount && !isNaN(amount) && Number(amount) > 0) {
    try {
      const res = await fetch('/api/inventory/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, amount: Number(amount) })
      });
      const result = await res.json();
      if (result.success) {
        showToast(result.message);
        loadInventory();
        runDemandForecast();
      }
    } catch (e) {
      console.error(e);
    }
  }
}

// -------------------------------------------------------------------------
// 7. BÁO CÁO TÀI CHÍNH & MÁY TÍNH ĐIỂM HÒA VỐN (BREAK-EVEN POINT - BEP)
// -------------------------------------------------------------------------
function onSimInputChange() {
  const fc = document.getElementById('sim-fixed-cost');
  const sp = document.getElementById('sim-selling-price');
  const cogs = document.getElementById('sim-cogs');
  const target = document.getElementById('sim-meals-target');
  const meat = document.getElementById('sim-meat-price');
  const drop = document.getElementById('sim-sales-drop');

  if (fc) document.getElementById('sim-fixed-cost-val').textContent = `${(Number(fc.value)/1000000).toFixed(1)} triệu/tháng`;
  if (sp) document.getElementById('sim-selling-price-val').textContent = `${Number(sp.value).toLocaleString()}đ/suất`;
  if (cogs) document.getElementById('sim-cogs-val').textContent = `${Number(cogs.value).toLocaleString()}đ/suất`;
  if (target) document.getElementById('sim-meals-target-val').textContent = `${Number(target.value)} suất/ngày`;
  if (meat) document.getElementById('sim-meat-price-val').textContent = `${meat.value}%`;
  if (drop) document.getElementById('sim-sales-drop-val').textContent = `${drop.value}%`;

  runFinancialSimulation();
}

function updateSimSliderVal(type, val) {
  if (type === 'sales-drop') {
    const el = document.getElementById('sim-sales-drop-val');
    if (el) el.textContent = `${val}%`;
  }
  if (type === 'meat-price') {
    const el = document.getElementById('sim-meat-price-val');
    if (el) el.textContent = `${val}%`;
  }
  if (type === 'meals-target') {
    const el = document.getElementById('sim-meals-target-val');
    if (el) el.textContent = `${val} suất/ngày`;
  }
  runFinancialSimulation();
}

async function runFinancialSimulation() {
  const fcEl = document.getElementById('sim-fixed-cost');
  const spEl = document.getElementById('sim-selling-price');
  const cogsEl = document.getElementById('sim-cogs');
  const targetEl = document.getElementById('sim-meals-target');
  const meatEl = document.getElementById('sim-meat-price');
  const dropEl = document.getElementById('sim-sales-drop');

  const fixedCostsMonthly = fcEl ? Number(fcEl.value) : 18000000;
  const avgSellingPrice = spEl ? Number(spEl.value) : 32000;
  const avgCostOfGoodsSold = cogsEl ? Number(cogsEl.value) : 18000;
  const dailyMealsTarget = targetEl ? Number(targetEl.value) : 150;
  const meatPriceIncreasePercent = meatEl ? Number(meatEl.value) : 0;
  const salesVolumeDropPercent = dropEl ? Number(dropEl.value) : 0;

  try {
    const res = await fetch('/api/simulation/financial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fixedCostsMonthly,
        avgSellingPrice,
        avgCostOfGoodsSold,
        dailyMealsTarget,
        meatPriceIncreasePercent,
        salesVolumeDropPercent
      })
    });
    const result = await res.json();

    if (result.success) {
      renderSimulationResults(result.data.metrics);
    }
  } catch (err) {
    console.error('Lỗi tính toán tài chính:', err);
  }
}

function renderSimulationResults(m) {
  const container = document.getElementById('sim-results');
  if (!container) return;

  const isLoss = m.monthlyNetProfit <= 0;
  const isDanger = m.actualDailyMeals < m.dailyBreakEvenMeals;

  container.innerHTML = `
    <div class="liquid-card p-5 space-y-1.5 border-l-4 border-l-indigo-600 bg-white/80">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Điểm hòa vốn (BEP)</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">Số lượng</span>
      </div>
      <div class="text-2xl sm:text-3xl font-black text-slate-900">${m.dailyBreakEvenMeals} <span class="text-xs font-bold text-slate-500">suất/ngày</span></div>
      <p class="text-[11px] text-slate-500">Tương đương <b>${m.monthlyBreakEvenMeals.toLocaleString()}</b> suất/tháng</p>
    </div>

    <div class="liquid-card p-5 space-y-1.5 border-l-4 border-l-brand-600 bg-white/80">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Doanh thu hòa vốn</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-800">Tối thiểu</span>
      </div>
      <div class="text-2xl sm:text-3xl font-black text-brand-600">${(m.dailyBreakEvenRevenue).toLocaleString()}đ</div>
      <p class="text-[11px] text-slate-500">${(m.monthlyBreakEvenRevenue / 1000000).toFixed(1)} triệu/tháng (đủ trang trải chi phí)</p>
    </div>

    <div class="liquid-card p-5 space-y-1.5 border-l-4 border-l-blue-600 bg-white/80">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lãi gộp trên 1 suất</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Contribution</span>
      </div>
      <div class="text-2xl sm:text-3xl font-black text-blue-600">${m.unitContributionMargin.toLocaleString()}đ</div>
      <p class="text-[11px] text-slate-500">Tỷ suất lãi gộp: <b>${m.contributionMarginRatio}</b> / suất</p>
    </div>

    <div class="liquid-card p-5 space-y-1.5 border-l-4 ${isLoss ? 'border-l-rose-500' : 'border-l-emerald-500'} bg-white/80">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lợi nhuận ròng dự phóng</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isLoss ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">Tháng</span>
      </div>
      <div class="text-2xl sm:text-3xl font-black ${isLoss ? 'text-rose-600' : 'text-emerald-600'}">${m.monthlyNetProfit.toLocaleString()}đ</div>
      <p class="text-[11px] text-slate-500">Biên LN ròng: <b>${m.profitMargin}</b> (Sau trừ định phí)</p>
    </div>

    <div class="col-span-full sm:col-span-2 lg:col-span-1 liquid-card p-5 space-y-1.5 border-l-4 ${isDanger ? 'border-l-rose-500' : 'border-l-purple-500'} bg-white/80">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Độ an toàn (Margin of Safety)</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isDanger ? 'bg-rose-100 text-rose-800' : 'bg-purple-100 text-purple-800'}">Đệm rủi ro</span>
      </div>
      <div class="text-xl sm:text-2xl font-black ${isDanger ? 'text-rose-600' : 'text-purple-700'}">${m.marginOfSafetyMeals >= 0 ? '+' : ''}${m.marginOfSafetyMeals} suất/ngày</div>
      <p class="text-[10px] font-bold ${isDanger ? 'text-rose-600' : 'text-emerald-600'}">${m.marginOfSafetyPercent} so với điểm hòa vốn</p>
    </div>
  `;

  // Render Action Plan Box
  const actionBox = document.getElementById('sim-action-plan-box');
  if (actionBox) {
    actionBox.innerHTML = `
      <div class="flex items-center gap-2 font-extrabold text-sm ${isLoss ? 'text-rose-700' : 'text-slate-900'}">
        <i data-lucide="${isLoss ? 'alert-triangle' : 'shield-check'}" class="w-5 h-5 ${isLoss ? 'text-rose-600' : 'text-emerald-600'}"></i>
        <span>Đánh Giá Rủi Ro Vận Hành & Kế Hoạch Ứng Phó Tự Động Từ AI:</span>
      </div>
      <div class="text-xs leading-relaxed ${isLoss ? 'bg-rose-50/80 border-rose-200 text-rose-900' : 'bg-slate-50/80 border-slate-200 text-slate-700'} p-4 rounded-2xl border">
        ${m.contingencyPlan}
      </div>
    `;
  }

  // Render Break-Even Line Chart
  const canvas = document.getElementById('simBreakEvenChart');
  if (canvas && typeof Chart !== 'undefined' && m.chartPoints) {
    try {
      const ctx = canvas.getContext('2d');
      const labels = m.chartPoints.map(p => `${p.meals} suất`);
      const revenueData = m.chartPoints.map(p => p.revenue);
      const totalCostData = m.chartPoints.map(p => p.totalCost);
      const fixedCostData = m.chartPoints.map(p => p.fixedCost);

      if (state.charts.breakEven) {
        state.charts.breakEven.destroy();
      }

      state.charts.breakEven = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Tổng Doanh Thu (VNĐ/ngày)',
              data: revenueData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              fill: true,
              tension: 0.2,
              borderWidth: 3,
              pointRadius: 4,
              pointBackgroundColor: '#10b981'
            },
            {
              label: 'Tổng Chi Phí (Biến phí + Định phí)',
              data: totalCostData,
              borderColor: '#f43f5e',
              backgroundColor: 'rgba(244, 63, 94, 0.04)',
              fill: true,
              tension: 0.2,
              borderWidth: 3,
              pointRadius: 4,
              pointBackgroundColor: '#f43f5e'
            },
            {
              label: 'Định Phí Cố Định Ngày',
              data: fixedCostData,
              borderColor: '#64748b',
              borderDash: [6, 6],
              borderWidth: 2,
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: 'bold' }
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}đ`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(241, 245, 249, 0.8)' },
              ticks: {
                callback: (v) => `${(v/1000000).toFixed(1)}M`,
                font: { family: "'Plus Jakarta Sans', sans-serif", size: 10 }
              }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 10 } }
            }
          }
        }
      });
    } catch (e) {
      console.warn('Break-even chart render error:', e);
    }
  }

  refreshIcons();
}

// -------------------------------------------------------------------------
// 8. ĐÁNH GIÁ & PHÂN TÍCH CẢM XÚC KHÁCH HÀNG
// -------------------------------------------------------------------------
function setRating(val) {
  state.selectedRating = val;
  const stars = document.getElementById('star-rating-container').children;
  for (let i = 0; i < stars.length; i++) {
    if (i < val) {
      stars[i].className = 'w-6 h-6 cursor-pointer fill-amber-400 text-amber-400';
    } else {
      stars[i].className = 'w-6 h-6 cursor-pointer text-slate-300';
    }
  }
}

async function submitReview() {
  const name = document.getElementById('review-name').value.trim();
  const comment = document.getElementById('review-comment').value.trim();
  if (!comment) {
    alert('Vui lòng nhập nhận xét của bạn!');
    return;
  }

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: name, rating: state.selectedRating, comment })
    });
    const result = await res.json();

    if (result.success) {
      showToast('Đã gửi đánh giá thành công! Cảm ơn bạn.');
      document.getElementById('review-comment').value = '';
      fetchReviews();
      loadSentimentAnalysis();
    }
  } catch (err) {
    console.error('Lỗi gửi đánh giá:', err);
  }
}

async function fetchReviews() {
  try {
    const res = await fetch('/api/reviews');
    const data = await res.json();
    if (data.success) {
      state.reviews = data.data;
      renderReviewsList(state.reviews);
    }
  } catch (err) {
    console.error('Lỗi tải đánh giá:', err);
  }
}

function renderReviewsList(reviews) {
  const container = document.getElementById('reviews-list');
  if (!container) return;

  container.innerHTML = reviews.map(rev => {
    let sentimentBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Tích cực</span>`;
    if (rev.sentiment === 'negative') sentimentBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">Cần cải thiện</span>`;
    if (rev.sentiment === 'neutral' || rev.sentiment === 'mixed') sentimentBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Trung tính</span>`;

    return `
      <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="font-bold text-xs text-slate-800">${rev.customerName}</span>
          <div class="flex items-center gap-1.5">
            ${sentimentBadge}
            <span class="text-amber-400 text-xs font-black">★ ${rev.rating}</span>
          </div>
        </div>
        <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(rev.comment)}</p>
      </div>
    `;
  }).join('');

  refreshIcons();
}

async function loadSentimentAnalysis() {
  try {
    const res = await fetch('/api/ai/sentiment-analysis');
    const data = await res.json();
    if (data.success) {
      const d = data.data;
      
      const ctx = document.getElementById('sentimentChart')?.getContext('2d');
      if (ctx) {
        if (state.charts.sentiment) state.charts.sentiment.destroy();

        state.charts.sentiment = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Tích cực', 'Trung tính', 'Tiêu cực'],
            datasets: [{
              data: [d.distribution.positive.count, d.distribution.neutral.count, d.distribution.negative.count],
              backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' }
            }
          }
        });
      }

      const container = document.getElementById('sentiment-insights-container');
      if (container) {
        container.innerHTML = d.actionableInsights.map(insight => `
          <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-2.5">
            <i data-lucide="sparkles" class="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5"></i>
            <span class="text-slate-700">${insight}</span>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Lỗi tải Sentiment Insights:', err);
  }
}

// -------------------------------------------------------------------------
// UTILS & TOAST
// -------------------------------------------------------------------------
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'fixed bottom-5 right-5 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-2 transform transition duration-300 translate-y-20 opacity-0';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<i data-lucide="bell" class="w-4 h-4 text-emerald-400"></i> <span>${message}</span>`;
  refreshIcons();

  toast.classList.remove('translate-y-20', 'opacity-0');
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3500);
}


// Mobile Bottom Dock Handlers
function mobileNav(tab) {
  switchViewMode('customer');
  switchCustomerTab(tab);
  document.querySelectorAll('.mobile-dock-btn').forEach(btn => btn.classList.remove('active'));
  const btnMap = { 
    'menu': 'mob-btn-menu', 
    'forecast': 'mob-btn-forecast', 
    'simulation': 'mob-btn-forecast', 
    'ai-wizard': 'mob-btn-wizard', 
    'ai-chat': 'mob-btn-chat', 
    'reviews': 'mob-btn-menu' 
  };
  const targetId = btnMap[tab] || 'mob-btn-menu';
  document.getElementById(targetId)?.classList.add('active');
  window.scrollTo({ top: 100, behavior: 'smooth' });
}

function toggleMobileRole() {
  const newMode = state.currentMode === 'customer' ? 'admin' : 'customer';
  switchViewMode(newMode);
  document.querySelectorAll('.mobile-dock-btn').forEach(btn => btn.classList.remove('active'));
  if (newMode === 'admin') {
    document.getElementById('mob-btn-role')?.classList.add('active');
  } else {
    document.getElementById('mob-btn-menu')?.classList.add('active');
  }
}
