//Личный кабинет (упрощенная версия с использованием API модуля)
document.addEventListener('DOMContentLoaded', async () => {
    //загружаем данные через API
    await API.loadAll();
    
    //инициализируем личный кабинет
    initCabinet();
    
    //настройка обработчиков событий
    setupCabinetEventListeners();
});

function initCabinet() {
    //отображаем заказы
    API.orders.render('ordersTableBody', 1);
    
    //создаем пагинацию
    API.pagination.createPagination(
        'ordersPagination',
        1,
        API.orders.allOrders.length,
        API.config.itemsPerPage,
        'API.orders.changePage'
    );
    
    //обновляем статистику
    updateStatistics();
    
    //инициализируем тултипы
    API.utils.initializeTooltips();
}

function updateStatistics() {
    if (!API.orders.allOrders.length) {
        document.getElementById('activeOrdersCount').textContent = '0';
        document.getElementById('completedOrdersCount').textContent = '0';
        document.getElementById('totalAmount').textContent = '0 ₽';
        document.getElementById('averageAmount').textContent = '0 ₽';
        return;
    }
    
    const today = new Date();
    const activeOrders = API.orders.allOrders.filter(order => {
        const orderDate = new Date(order.date_start);
        return orderDate >= today;
    });
    
    const completedOrders = API.orders.allOrders.filter(order => {
        const orderDate = new Date(order.date_start);
        return orderDate < today;
    });
    
    const totalPrice = API.orders.allOrders.reduce((sum, order) => sum + (order.price || 0), 0);
    const averagePrice = totalPrice / API.orders.allOrders.length;
    
    document.getElementById('activeOrdersCount').textContent = activeOrders.length;
    document.getElementById('completedOrdersCount').textContent = completedOrders.length;
    document.getElementById('totalAmount').textContent = API.utils.formatPrice(totalPrice);
    document.getElementById('averageAmount').textContent = API.utils.formatPrice(Math.round(averagePrice));
}

function setupCabinetEventListeners() {
    //кнопка выхода
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            API.utils.showNotification('Функция выхода будет реализована позже', 'info');
        });
    }
}

function updateStatistics() {
    if (!API.orders.allOrders.length) {
        document.getElementById('activeOrdersCount').textContent = '0';
        document.getElementById('completedOrdersCount').textContent = '0';
        document.getElementById('totalAmount').textContent = '0 ₽';
        document.getElementById('averageAmount').textContent = '0 ₽';
        return;
    }
    
    const today = new Date();
    const activeOrders = API.orders.allOrders.filter(order => {
        const orderDate = new Date(order.date_start);
        return orderDate >= today;
    });
    
    const completedOrders = API.orders.allOrders.filter(order => {
        const orderDate = new Date(order.date_start);
        return orderDate < today;
    });
    
    const totalPrice = API.orders.allOrders.reduce((sum, order) => sum + (order.price || 0), 0);
    const averagePrice = totalPrice / API.orders.allOrders.length;
    
    document.getElementById('activeOrdersCount').textContent = activeOrders.length;
    document.getElementById('completedOrdersCount').textContent = completedOrders.length;
    document.getElementById('totalAmount').textContent = API.utils.formatPrice(totalPrice);
    document.getElementById('averageAmount').textContent = API.utils.formatPrice(Math.round(averagePrice));
    
    //добавляем информацию о лимите заявок
    this.showOrderLimitWarning();
}

function showOrderLimitWarning() {
    const maxOrders = 10; //из API.config
    const currentOrders = API.orders.allOrders.length;
    
    if (currentOrders >= maxOrders) {
        API.utils.showNotification(
            `Внимание! Достигнут лимит в ${maxOrders} заявок. Удалите старые заявки перед созданием новых.`,
            'warning'
        );
    } else if (currentOrders >= maxOrders - 2) {
        API.utils.showNotification(
            `Осталось ${maxOrders - currentOrders} из ${maxOrders} доступных заявок.`,
            'info'
        );
    }
}

//глобальные функции для вызова из HTML
function showOrderDetail(orderId) {
    API.orders.showDetailModal(orderId);
}

function editOrder(orderId) {
    API.orders.showEditModal(orderId);
}

function confirmDeleteOrder(orderId) {
    API.orders.confirmDelete(orderId);
}
