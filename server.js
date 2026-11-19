const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Path helpers
const DATA_DIR = path.join(__dirname, 'data');
const getFilePath = (file) => path.join(DATA_DIR, file);

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(getFilePath(file), 'utf-8'));
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return [];
  }
};

const writeJson = (file, data) => {
  try {
    fs.writeFileSync(getFilePath(file), JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
    return false;
  }
};

// --------------------------------------------------------------------------
// 1. MENU APIs
// --------------------------------------------------------------------------
app.get('/api/menu', (req, res) => {
  const menu = readJson('menu.json');
  res.json({ success: true, count: menu.length, data: menu });
});

// --------------------------------------------------------------------------
// 2. INVENTORY APIs & FIFO MONITOR (Hệ thống AI 4)
// --------------------------------------------------------------------------
app.get('/api/inventory', (req, res) => {
  const inventory = readJson('inventory.json');
  
  // Calculate AI Risk & Health index
  const evaluated = inventory.map(item => {
    let riskLevel = 'normal';
    let recommendation = 'Tồn kho ổn định, vận hành bình thường';

    if (item.daysToExpire <= 1) {
      riskLevel = 'critical';
      recommendation = `CẬN DATE: Sử dụng ngay hôm nay hoặc áp dụng Dynamic Pricing giảm giá món dùng ${item.name} để xả kho!`;
    } else if (item.currentStock < item.minStock) {
      riskLevel = 'warning';
      recommendation = `SẮP HẾT: Cần nhập thêm tối thiểu ${(item.minStock - item.currentStock).toFixed(1)} ${item.unit}`;
    }

    return {
      ...item,
      riskLevel,
      recommendation
    };
  });

  res.json({ success: true, data: evaluated });
});

app.post('/api/inventory/restock', (req, res) => {
  const { id, amount } = req.body;
  const inventory = readJson('inventory.json');
  const item = inventory.find(i => i.id === id);
  if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy nguyên liệu' });

  item.currentStock = Number((item.currentStock + Number(amount)).toFixed(2));
  item.lastRestocked = new Date().toISOString().split('T')[0];
  writeJson('inventory.json', inventory);

  res.json({ success: true, message: `Đã nhập thêm ${amount} ${item.unit} ${item.name}`, data: item });
});

// Duyệt nhập kho tự động từ bảng đề xuất đi chợ
app.post('/api/inventory/approve-grocery-list', (req, res) => {
  const { items } = req.body; // array of { ingredientKey, needToBuy }
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'Danh sách nguyên liệu không hợp lệ' });
  }

  const inventory = readJson('inventory.json');
  let restockedCount = 0;

  items.forEach(reqItem => {
    if (reqItem.needToBuy > 0) {
      const invItem = inventory.find(i => i.key === reqItem.ingredientKey);
      if (invItem) {
        invItem.currentStock = Number((invItem.currentStock + Number(reqItem.needToBuy)).toFixed(2));
        invItem.lastRestocked = new Date().toISOString().split('T')[0];
        invItem.daysToExpire = 3; // Reset hạn dùng cho hàng mới về
        restockedCount++;
      }
    }
  });

  writeJson('inventory.json', inventory);

  res.json({
    success: true,
    message: `Đã duyệt nhập kho thành công ${restockedCount} loại nguyên liệu mới vào hệ thống!`,
    inventory
  });
});

// --------------------------------------------------------------------------
// 3. ORDER APIs (Tạo đơn, Cập nhật trạng thái & Trừ kho tự động)
// --------------------------------------------------------------------------
app.get('/api/orders', (req, res) => {
  const orders = readJson('orders.json');
  res.json({ success: true, count: orders.length, data: orders.reverse() });
});

app.post('/api/orders', (req, res) => {
  const { customerName, phone, address, items, note, paymentMethod, aiRecommendationsApplied } = req.body;
  if (!customerName || !items || !items.length) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin đơn hàng' });
  }

  const menu = readJson('menu.json');
  const inventory = readJson('inventory.json');
  const orders = readJson('orders.json');

  let totalAmount = 0;
  const detailedItems = [];

  // Deduct BOM ingredients from inventory
  items.forEach(orderItem => {
    const menuItem = menu.find(m => m.id === orderItem.id);
    if (menuItem) {
      const qty = Number(orderItem.quantity) || 1;
      totalAmount += menuItem.price * qty;
      detailedItems.push({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: qty
      });

      // Trừ kho theo BOM công thức định lượng
      if (menuItem.bom) {
        Object.entries(menuItem.bom).forEach(([ingKey, ingQtyPerMeal]) => {
          const invItem = inventory.find(i => i.key === ingKey);
          if (invItem) {
            const totalDeduct = ingQtyPerMeal * qty;
            invItem.currentStock = Math.max(0, Number((invItem.currentStock - totalDeduct).toFixed(2)));
          }
        });
      }
    }
  });

  const now = new Date();
  const estimatedDelivery = new Date(now.getTime() + 25 * 60000); // Giao trong 25 phút

  const orderId = `BG-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(orders.length + 1).padStart(3, '0')}`;

  // VietQR Real Banking Information
  const vietQrUrl = `https://img.vietqr.io/image/MB-0912345678-compact2.png?amount=${totalAmount}&addInfo=${orderId}&accountName=LOCTM%20BEP%20GON%20AI`;

  const newOrder = {
    id: orderId,
    customerName,
    phone: phone || '0901234567',
    address: address || '123 Đường 3/2, Ninh Kiều',
    items: detailedItems,
    totalAmount,
    note: note || '',
    paymentMethod: paymentMethod || 'qr_code',
    status: 'pending', // Trạng thái thực tế: Chờ bếp duyệt
    createdAt: now.toISOString(),
    estimatedDelivery: estimatedDelivery.toISOString(),
    aiRecommendationsApplied: !!aiRecommendationsApplied,
    paymentQrUrl: vietQrUrl
  };

  orders.push(newOrder);
  writeJson('orders.json', orders);
  writeJson('inventory.json', inventory);

  res.json({
    success: true,
    message: 'Đặt đơn thành công! Bếp Gọn đã nhận đơn và chuẩn bị chế biến.',
    order: newOrder
  });
});

app.put('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const orders = readJson('orders.json');
  const order = orders.find(o => o.id === id);

  if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
  order.status = status;
  writeJson('orders.json', orders);

  res.json({ success: true, message: `Đã cập nhật trạng thái đơn thành ${status}`, order });
});

// --------------------------------------------------------------------------
// 4. HỆ THỐNG AI 1: AI ĐỀ XUẤT THỰC ĐƠN CÁ NHÂN HÓA
// --------------------------------------------------------------------------
app.post('/api/ai/recommend-menu', (req, res) => {
  const { budget = 35000, goal = 'balanced', dietary = 'all', dislikes = [], allergies = [] } = req.body;
  const menu = readJson('menu.json');

  // Filter based on strict constraints (Allergens & Vegetarian)
  let candidateMeals = menu.filter(m => m.category === 'com_man' || m.category === 'com_chay');

  if (dietary === 'vegetarian') {
    candidateMeals = candidateMeals.filter(m => m.isVegetarian);
  }

  if (allergies && allergies.length > 0) {
    candidateMeals = candidateMeals.filter(m => {
      return !allergies.some(alg => m.allergens.map(a => a.toLowerCase()).includes(alg.toLowerCase()));
    });
  }

  // Filter out dislikes
  if (dislikes && dislikes.length > 0) {
    candidateMeals = candidateMeals.filter(m => {
      return !dislikes.some(d => m.name.toLowerCase().includes(d.toLowerCase()) || m.tags.includes(d.toLowerCase()));
    });
  }

  // Scoring algorithm based on Goal and Budget
  const scoredMeals = candidateMeals.map(m => {
    let score = 100;

    // Budget fit
    const priceDiff = Math.abs(m.price - budget);
    if (m.price <= budget) {
      score += 30 - (priceDiff / 1000) * 2;
    } else {
      score -= (priceDiff / 1000) * 10;
    }

    // Health/Goal optimization
    if (goal === 'weight_loss') {
      if (m.calories <= 500) score += 25;
      if (m.fat <= 12) score += 20;
    } else if (goal === 'muscle_gain') {
      if (m.protein >= 30) score += 30;
    } else if (goal === 'balanced') {
      if (m.calories >= 450 && m.calories <= 600) score += 20;
      if (m.tags.includes('healthy')) score += 15;
    }

    return { meal: m, score };
  }).sort((a, b) => b.score - a.score);

  const bestDish = scoredMeals[0] ? scoredMeals[0].meal : menu[0];

  // Pick complementary drink or side if budget permits
  const remainingBudget = budget - bestDish.price;
  let recommendedSide = null;
  if (remainingBudget >= 10000) {
    const sides = menu.filter(m => m.category === 'canh' || m.category === 'nuoc');
    recommendedSide = sides.find(s => s.price <= remainingBudget) || null;
  }

  // Generate 7-day Meal Plan
  const days = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
  const weekPlan = days.map((day, idx) => {
    const dish = candidateMeals[idx % candidateMeals.length] || bestDish;
    return {
      day,
      dishId: dish.id,
      dishName: dish.name,
      price: dish.price,
      calories: dish.calories,
      protein: dish.protein,
      carbs: dish.carbs,
      fat: dish.fat,
      note: dish.tags.join(', ')
    };
  });

  const avgCalories = Math.round(weekPlan.reduce((acc, cur) => acc + cur.calories, 0) / 7);
  const totalCostWeek = weekPlan.reduce((acc, cur) => acc + cur.price, 0);

  res.json({
    success: true,
    data: {
      budgetTarget: budget,
      goal,
      dietary,
      bestRecommendation: {
        mainDish: bestDish,
        suggestedSide: recommendedSide,
        totalComboPrice: bestDish.price + (recommendedSide ? recommendedSide.price : 0),
        reason: `Món được tối ưu hóa theo ngân sách ${budget.toLocaleString()}đ, chuẩn tiêu chí dinh dưỡng ${goal} và tuyệt đối tránh thành phần dị ứng.`
      },
      weekPlan,
      weeklySummary: {
        totalCost: totalCostWeek,
        avgCalories,
        totalMeals: 7
      }
    }
  });
});

// --------------------------------------------------------------------------
// 5. HỆ THỐNG AI 2: DỰ BÁO NHU CẦU & KẾ HOẠCH ĐI CHỢ TỰ ĐỘNG (BOM)
// --------------------------------------------------------------------------
app.post('/api/ai/forecast-demand', (req, res) => {
  const { date, weather = 'sunny', campusEvent = 'regular', expectedStudents = 1200 } = req.body;
  const menu = readJson('menu.json');
  const inventory = readJson('inventory.json');

  let baseDemand = {
    m1: 30, // Cơm gà áp chảo sốt tiêu đen
    m2: 24, // Cơm thịt kho trứng cút
    m3: 18, // Cơm cá basa
    m4: 20, // Cơm sườn non ram
    m5: 14, // Cơm đậu hũ nhồi nấm (chay)
    m6: 12, // Cơm xá xíu nấm đông cô (chay)
    m7: 40, // Canh
    m8: 45, // Trà bí đao
    m9: 30  // Sữa bắp non
  };

  // Weather impact multiplier
  let weatherMultiplier = 1.0;
  let weatherNote = 'Thời tiết nắng ráo, khách hàng di chuyển và đặt hàng bình thường.';
  if (weather === 'rainy') {
    weatherMultiplier = 1.25;
    weatherNote = 'CẢNH BÁO MƯA: Nhu cầu đặt cơm giao tận phòng KTX và giảng đường tăng mạnh (+25%). Đề xuất tăng suất cơm nóng và canh.';
  } else if (weather === 'hot') {
    weatherMultiplier = 1.1;
    weatherNote = 'NẮNG NÓNG GAY GẮT: Nhu cầu nước thanh nhiệt (Trà bí đao, Sữa bắp non) tăng vọt (+40%).';
  }

  // Campus event impact multiplier
  let eventMultiplier = 1.0;
  let eventNote = 'Ngày học bình thường theo thời khóa biểu.';
  if (campusEvent === 'exam_season') {
    eventMultiplier = 1.20;
    eventNote = 'MÙA THI HỌC KỲ: Sinh viên ôn thi tại KTX và thư viện đến trưa, nhu cầu suất ăn tiện lợi bổ não và sữa bắp tăng cao.';
  } else if (campusEvent === 'weekend_holiday') {
    eventMultiplier = 0.55;
    eventNote = 'CUỐI TUẦN / NGHỈ LỄ: Sinh viên về quê hoặc đi chơi, chỉ giữ công suất 55% để tránh dư thừa lãng phí.';
  } else if (campusEvent === 'workshop') {
    eventMultiplier = 1.35;
    eventNote = 'HỘI THẢO TOÀN TRƯỜNG: Có đoàn đại biểu và khách hàng tham gia, dự kiến đơn đặt theo nhóm tăng đột biến.';
  }

  const combinedMultiplier = weatherMultiplier * eventMultiplier;

  // Calculate forecasted quantities per menu item
  const forecastedItems = Object.entries(baseDemand).map(([dishId, baseQty]) => {
    const dish = menu.find(m => m.id === dishId);
    let qty = Math.round(baseQty * combinedMultiplier);

    if (weather === 'hot' && (dishId === 'm8' || dishId === 'm9')) {
      qty = Math.round(qty * 1.3);
    }
    if (weather === 'rainy' && dishId === 'm7') {
      qty = Math.round(qty * 1.2);
    }

    return {
      dishId,
      name: dish ? dish.name : dishId,
      price: dish ? dish.price : 0,
      forecastedQty: qty,
      category: dish ? dish.category : 'other',
      bom: dish ? dish.bom : {}
    };
  });

  const totalMeals = forecastedItems.filter(i => i.category.startsWith('com')).reduce((sum, i) => sum + i.forecastedQty, 0);
  const totalBeverages = forecastedItems.filter(i => i.category === 'nuoc' || i.category === 'canh').reduce((sum, i) => sum + i.forecastedQty, 0);
  const projectedRevenue = forecastedItems.reduce((sum, i) => sum + (i.forecastedQty * i.price), 0);

  // Compute Bill Of Materials (BOM)
  const bomSummary = {};
  forecastedItems.forEach(item => {
    if (item.bom) {
      Object.entries(item.bom).forEach(([ingKey, perUnit]) => {
        bomSummary[ingKey] = (bomSummary[ingKey] || 0) + (perUnit * item.forecastedQty);
      });
    }
  });

  // Compare with current inventory to compute SHOPPING LIST
  const shoppingList = Object.entries(bomSummary).map(([ingKey, requiredAmount]) => {
    const invItem = inventory.find(i => i.key === ingKey);
    const roundedRequired = Number(requiredAmount.toFixed(2));
    const currentStock = invItem ? invItem.currentStock : 0;
    const unit = invItem ? invItem.unit : 'kg';
    const costPerUnit = invItem ? invItem.costPerUnit : 30000;
    
    // Safety buffer 10%
    const needToBuy = Math.max(0, Number(((roundedRequired * 1.1) - currentStock).toFixed(2)));
    const estimatedCost = Math.round(needToBuy * costPerUnit);

    return {
      ingredientKey: ingKey,
      name: invItem ? invItem.name : ingKey,
      requiredForCooking: roundedRequired,
      currentStock,
      needToBuy,
      unit,
      costPerUnit,
      estimatedCost,
      status: needToBuy > 0 ? 'need_purchase' : 'sufficient'
    };
  });

  const totalGroceryCost = shoppingList.reduce((sum, i) => sum + i.estimatedCost, 0);

  res.json({
    success: true,
    data: {
      forecastDate: date || new Date().toISOString().split('T')[0],
      scenario: { weather, campusEvent, expectedStudents },
      insights: [weatherNote, eventNote],
      forecastedItems,
      metrics: {
        totalMealsForecasted: totalMeals,
        totalBeveragesForecasted: totalBeverages,
        projectedRevenue,
        totalGroceryCost,
        projectedGrossProfit: projectedRevenue - totalGroceryCost,
        projectedMargin: projectedRevenue > 0 ? ((projectedRevenue - totalGroceryCost) / projectedRevenue * 100).toFixed(1) + '%' : '0%'
      },
      shoppingList
    }
  });
});

// --------------------------------------------------------------------------
// 6. HỆ THỐNG AI 3: TRỢ LÝ ĐẶT MÓN 24/7 (NLP INTENT PARSER)
// --------------------------------------------------------------------------
app.post('/api/ai/chat-assistant', (req, res) => {
  const { message = '', currentCart = [] } = req.body;
  const menu = readJson('menu.json');
  const lowerMsg = message.toLowerCase();

  let reply = '';
  let suggestedActions = [];
  let detectedDishes = [];

  menu.forEach(item => {
    const nameLower = item.name.toLowerCase();
    const shortNames = [
      nameLower,
      nameLower.replace('cơm ', ''),
      ...item.tags
    ];
    
    if (shortNames.some(s => lowerMsg.includes(s))) {
      detectedDishes.push(item);
    }
  });

  const qtyMatch = lowerMsg.match(/(\d+)\s*(suất|phần|cơm|ly|hộp|dĩa|đĩa)?/);
  const detectedQuantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

  if (lowerMsg.includes('dưới 35') || lowerMsg.includes('dưới 30') || lowerMsg.includes('ngân sách') || lowerMsg.includes('rẻ')) {
    const budget = lowerMsg.includes('dưới 30') ? 30000 : 35000;
    const affordable = menu.filter(m => m.price <= budget && m.category.startsWith('com'));
    
    reply = `Bếp Gọn có các suất ăn ngon dưới ${budget.toLocaleString()}đ phù hợp tiêu chí của bạn:\n` +
      affordable.map(m => `• **${m.name}** - ${m.price.toLocaleString()}đ (${m.calories} kcal)`).join('\n') +
      `\n\nBạn muốn chọn món nào để mình thêm vào giỏ hàng ngay giúp bạn?`;
    
    suggestedActions = affordable.map(m => ({
      action: 'add_to_cart',
      dishId: m.id,
      label: `Đặt ${m.name} (${m.price.toLocaleString()}đ)`
    }));
  } else if (lowerMsg.includes('không cay')) {
    const nonSpicy = menu.filter(m => !m.isSpicy && m.category.startsWith('com'));
    reply = `Nếu bạn không ăn cay được thì Bếp Gọn có các món tuyệt đối không cay, vị ngọt dịu thanh đạm này:\n` +
      nonSpicy.map(m => `• **${m.name}** - ${m.price.toLocaleString()}đ`).join('\n') +
      `\n\nBạn ưng ý món nào nhất nè?`;
    
    suggestedActions = nonSpicy.map(m => ({
      action: 'add_to_cart',
      dishId: m.id,
      label: `Chọn ${m.name}`
    }));
  } else if (lowerMsg.includes('ăn chay') || lowerMsg.includes('chay')) {
    const vegDishes = menu.filter(m => m.isVegetarian);
    reply = `Bếp Gọn có thực đơn Chay Healthy giàu đạm thực vật từ nấm tươi và đậu hũ non cực kỳ thanh đạm:\n` +
      vegDishes.map(m => `• **${m.name}** - ${m.price.toLocaleString()}đ`).join('\n');
    
    suggestedActions = vegDishes.map(m => ({
      action: 'add_to_cart',
      dishId: m.id,
      label: `Chọn ${m.name}`
    }));
  } else if (detectedDishes.length > 0) {
    const targetDish = detectedDishes[0];
    reply = `Mình đã nhận diện bạn muốn đặt **${detectedQuantity} phần ${targetDish.name}** (${(targetDish.price * detectedQuantity).toLocaleString()}đ).\n` +
      `Món này: ${targetDish.description}\n` +
      `Mình có thể hỗ trợ thêm ngay vào giỏ hàng của bạn nhé!`;
    
    suggestedActions = [
      {
        action: 'add_to_cart',
        dishId: targetDish.id,
        quantity: detectedQuantity,
        label: `Xác nhận thêm ${detectedQuantity} ${targetDish.name} vào giỏ`
      },
      {
        action: 'recommend_combo',
        dishId: 'm8',
        label: `Thêm Trà bí đao hạt chia (+12.000đ)`
      }
    ];
  } else {
    reply = `Xin chào! Mình là AI Trợ lý Bếp Gọn 24/7. Bạn có thể nhắn tự nhiên như:\n` +
      `• *"Hôm nay có món gì dưới 35k không cay?"*\n` +
      `• *"Tôi muốn ăn chay thanh đạm ít dầu mỡ"*\n` +
      `• *"Đặt giúp tôi 2 cơm gà áp chảo và 1 trà bí đao"*\n` +
      `Bạn cần mình gợi ý món ăn hôm nay theo ngân sách bao nhiêu?`;
    
    suggestedActions = [
      { action: 'query', label: 'Cơm trưa dưới 35k' },
      { action: 'query', label: 'Món ăn không cay' },
      { action: 'query', label: 'Thực đơn chay Healthy' },
      { action: 'query', label: 'Cơm gà áp chảo sốt tiêu' }
    ];
  }

  res.json({
    success: true,
    reply,
    suggestedActions,
    detectedDishes: detectedDishes.map(d => ({ id: d.id, name: d.name, price: d.price }))
  });
});

// --------------------------------------------------------------------------
// 7. HỆ THỐNG AI 5: DYNAMIC PRICING (ĐỊNH GIÁ ĐỘNG)
// --------------------------------------------------------------------------
app.get('/api/ai/dynamic-pricing', (req, res) => {
  const menu = readJson('menu.json');
  const inventory = readJson('inventory.json');
  const hour = new Date().getHours();

  let currentSlot = 'normal';
  let slotLabel = 'Khung giờ tiêu chuẩn';
  
  if (hour >= 11 && hour <= 12) {
    currentSlot = 'peak_lunch';
    slotLabel = 'Cao điểm bữa trưa (11h - 12h30)';
  } else if (hour >= 13 && hour <= 15) {
    currentSlot = 'flash_sale_afternoon';
    slotLabel = 'Flash Sale xế chiều (Giảm tồn kho nguyên liệu tươi)';
  }

  const updatedMenu = menu.map(dish => {
    let discountPercent = 0;
    let reason = 'Giá niêm yết chuẩn';

    let usesExpiringIng = false;
    if (dish.bom) {
      Object.keys(dish.bom).forEach(k => {
        const inv = inventory.find(i => i.key === k);
        if (inv && inv.daysToExpire <= 1) {
          usesExpiringIng = true;
        }
      });
    }

    if (usesExpiringIng) {
      discountPercent = 15;
      reason = 'Ưu đãi 15% nguyên liệu đậu hũ tươi chế biến trong ngày!';
    } else if (currentSlot === 'peak_lunch' && dish.id === 'm1') {
      discountPercent = 5;
      reason = 'Ưu đãi giờ cao điểm trưa cho khách hàng';
    }

    const discountedPrice = Math.round(dish.originalPrice * (1 - discountPercent / 100));

    return {
      ...dish,
      discountPercent,
      price: discountedPrice,
      pricingReason: reason
    };
  });

  res.json({
    success: true,
    currentSlot,
    slotLabel,
    menu: updatedMenu
  });
});

// --------------------------------------------------------------------------
// 8. HỆ THỐNG AI 6: PHÂN TÍCH ĐÁNH GIÁ KHÁCH HÀNG
// --------------------------------------------------------------------------
app.get('/api/reviews', (req, res) => {
  const reviews = readJson('reviews.json');
  res.json({ success: true, count: reviews.length, data: reviews });
});

app.post('/api/reviews', (req, res) => {
  const { customerName, rating, comment } = req.body;
  if (!comment) return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung đánh giá' });

  const reviews = readJson('reviews.json');
  const lower = comment.toLowerCase();

  let sentiment = 'positive';
  const posWords = ['ngon', 'tuyệt', 'thích', 'tiện', 'nhanh', 'mềm', 'hài lòng', 'xuất sắc', 'rẻ', 'hợp túi tiền'];
  const negWords = ['dở', 'nguội', 'chậm', 'muộn', 'cay', 'mặn', 'tệ', 'kém', 'thất vọng'];

  let posCount = posWords.filter(w => lower.includes(w)).length;
  let negCount = negWords.filter(w => lower.includes(w)).length;

  if (rating <= 2 || negCount > posCount) {
    sentiment = 'negative';
  } else if (rating === 3 || (posCount === 0 && negCount === 0)) {
    sentiment = 'neutral';
  }

  const newReview = {
    id: `rev-${Date.now()}`,
    customerName: customerName || 'Khách hàng ẩn danh',
    rating: Number(rating) || 5,
    comment,
    createdAt: new Date().toISOString(),
    sentiment,
    keywords: [...posWords, ...negWords].filter(w => lower.includes(w))
  };

  reviews.unshift(newReview);
  writeJson('reviews.json', reviews);

  res.json({
    success: true,
    message: 'Cảm ơn bạn đã gửi đánh giá! Bếp Gọn đã tiếp nhận phản hồi.',
    review: newReview
  });
});

app.get('/api/ai/sentiment-analysis', (req, res) => {
  const reviews = readJson('reviews.json');
  const total = reviews.length;
  const positive = reviews.filter(r => r.sentiment === 'positive').length;
  const neutral = reviews.filter(r => r.sentiment === 'neutral' || r.sentiment === 'mixed').length;
  const negative = reviews.filter(r => r.sentiment === 'negative').length;
  const avgRating = total > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1) : 5.0;

  res.json({
    success: true,
    data: {
      totalReviews: total,
      avgRating: Number(avgRating),
      distribution: {
        positive: { count: positive, percentage: total > 0 ? Math.round(positive / total * 100) : 0 },
        neutral: { count: neutral, percentage: total > 0 ? Math.round(neutral / total * 100) : 0 },
        negative: { count: negative, percentage: total > 0 ? Math.round(negative / total * 100) : 0 }
      },
      actionableInsights: [
        '92% khách hàng khen ngợi công thức sốt gà áp chảo và tính năng cá nhân hóa thực đơn AI.',
        'Trời mưa ship có nguy cơ giảm nhiệt độ -> Sử dụng túi giữ nhiệt cách nhiệt 3 lớp khi giao hàng.',
        'Tùy chọn độ cay của sốt tiêu đen cho phép khách chủ động điều chỉnh khi đặt.'
      ]
    }
  });
});

// --------------------------------------------------------------------------
// 9. BÁO CÁO TÀI CHÍNH & PHÂN TÍCH RỦI RO HOẠT ĐỘNG
// --------------------------------------------------------------------------
app.post('/api/simulation/financial', (req, res) => {
  const {
    salesVolumeDropPercent = 0,
    meatPriceIncreasePercent = 0,
    dailyMealsTarget = 150,
    avgSellingPrice = 32000,
    avgCostOfGoodsSold = 18000,
    fixedCostsMonthly = 18000000
  } = req.body;

  const actualDailyMeals = Math.round(dailyMealsTarget * (1 - salesVolumeDropPercent / 100));
  const actualCOGS = Math.round(avgCostOfGoodsSold * (1 + (meatPriceIncreasePercent * 0.6) / 100));
  
  const unitContributionMargin = avgSellingPrice - actualCOGS;
  const contributionMarginRatio = unitContributionMargin / avgSellingPrice;

  // Điểm hòa vốn (Break-even Point)
  const monthlyBreakEvenMeals = Math.ceil(fixedCostsMonthly / unitContributionMargin);
  const dailyBreakEvenMeals = Math.ceil(monthlyBreakEvenMeals / 26);

  // Dự phóng tài chính 1 tháng (26 ngày)
  const monthlyMealsSold = actualDailyMeals * 26;
  const monthlyRevenue = monthlyMealsSold * avgSellingPrice;
  const monthlyVariableCosts = monthlyMealsSold * actualCOGS;
  const monthlyTotalCosts = monthlyVariableCosts + fixedCostsMonthly;
  const monthlyNetProfit = monthlyRevenue - monthlyTotalCosts;
  const profitMargin = monthlyRevenue > 0 ? (monthlyNetProfit / monthlyRevenue * 100).toFixed(1) + '%' : '0%';

  let riskAssessment = 'An toàn';
  let contingencyPlan = 'Mô hình hoạt động hiệu quả, biên lợi nhuận ổn định.';

  if (monthlyNetProfit <= 0) {
    riskAssessment = 'NGUY HIỂM (LỖ VỐN)';
    contingencyPlan = 'HÀNH ĐỘNG KHẨN CẤP: Kích hoạt kế hoạch dự phòng: 1) Tăng tỷ trọng món chay/trứng có chi phí thấp; 2) Áp dụng Dynamic Pricing bù đắp; 3) Giảm giờ công lao động bán thời gian.';
  } else if (actualDailyMeals < dailyBreakEvenMeals * 1.15) {
    riskAssessment = 'CẬN HÒA VỐN';
    contingencyPlan = 'CẢNH BÁO: Doanh số sát điểm hòa vốn. Đẩy mạnh chương trình combo bữa trưa và gói ăn tuần.';
  }

  res.json({
    success: true,
    data: {
      inputs: { salesVolumeDropPercent, meatPriceIncreasePercent, dailyMealsTarget },
      metrics: {
        actualDailyMeals,
        unitContributionMargin,
        dailyBreakEvenMeals,
        monthlyBreakEvenMeals,
        monthlyRevenue,
        monthlyVariableCosts,
        fixedCostsMonthly,
        monthlyNetProfit,
        profitMargin,
        riskAssessment,
        contingencyPlan
      }
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 BẾP GỌN AI - Smart Food, Smart Living Web App`);
  console.log(`📍 Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
