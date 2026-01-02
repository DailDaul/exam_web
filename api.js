const API_BASE_URL = 'http://exam-api-courses.std-900.ist.mospolytech.ru';
const API_KEY = '9f17101c-61e9-4f97-8d3f-7c13ded0e7d4';

//объект для работы с API
const API = {
    //общая функция для выполнения запросов
    async request(endpoint, method = 'GET', data = null) {
        const url = new URL(`${API_BASE_URL}${endpoint}`);
        url.searchParams.append('api_key', API_KEY);
        
        const options = {
            method,
            headers: {
                'Accept': 'application/json',
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || `HTTP error ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    //получить все курсы
    async getCourses() {
        return await this.request('/api/courses');
    },
    
    //получить курс по ID
    async getCourse(id) {
        return await this.request(`/api/courses/${id}`);
    },
    
    //получить всех репетиторов
    async getTutors() {
        return await this.request('/api/tutors');
    },
    
    //получить репетитора по ID
    async getTutor(id) {
        return await this.request(`/api/tutors/${id}`);
    },
    
    //получить все заявки пользователя
    async getOrders() {
        return await this.request('/api/orders');
    },
    
    //получить заявку по ID
    async getOrder(id) {
        return await this.request(`/api/orders/${id}`);
    },
    
    //создать новую заявку
    async createOrder(orderData) {
        return await this.request('/api/orders', 'POST', orderData);
    },
    
    //обновить заявку
    async updateOrder(id, orderData) {
        return await this.request(`/api/orders/${id}`, 'PUT', orderData);
    },
    
    //удалить заявку
    async deleteOrder(id) {
        return await this.request(`/api/orders/${id}`, 'DELETE');
    }
};

//утилиты для работы с данными
const Utils = {
    //форматирование даты
    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU');
        } catch (e) {
            return dateString;
        }
    },
    
    //форматирование времени
    formatTime(timeString) {
        if (!timeString) return '-';
        return timeString.substring(0, 5);
    },
    
    //форматирование суммы
    formatPrice(price) {
        if (!price) return '0';
        return new Intl.NumberFormat('ru-RU').format(price);
    },
    
    //получить название статуса заявки
    getStatusText(status) {
        const statuses = {
            'pending': 'Ожидает',
            'approved': 'Подтверждена',
            'completed': 'Завершена',
            'cancelled': 'Отменена'
        };
        return statuses[status] || status || 'Ожидает';
    },
    
    //получить класс для статуса
    getStatusClass(status) {
        const classes = {
            'pending': 'warning',
            'approved': 'success',
            'completed': 'info',
            'cancelled': 'danger'
        };
        return classes[status] || 'secondary';
    },
    
    //показать уведомление
    showNotification(message, type = 'info') {
        const notificationArea = document.getElementById('notification-area');
        if (!notificationArea) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        notificationArea.appendChild(alert);
        
        //автоматическое скрытие через 5 секунд
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 150);
            }
        }, 5000);
    },
    
    //расчет стоимости по формуле из задания
    calculateCoursePrice(course, selectedDate, selectedTime, persons, options) {
        let totalHours = course.week_length * course.total_length;
        let basePrice = course.course_fee_per_hour * totalHours;
        
        //проверяем выходные/праздники
        const date = new Date(selectedDate);
        const dayOfWeek = date.getDay(); //0-воскресенье, 6-суббота
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const weekendMultiplier = isWeekend ? 1.5 : 1;
        
        //утренняя доплата (9:00-12:00)
        const hour = parseInt(selectedTime.split(':')[0]);
        let morningSurcharge = (hour >= 9 && hour < 12) ? 400 : 0;
        
        //вечерняя доплата (18:00-20:00)
        let eveningSurcharge = (hour >= 18 && hour < 20) ? 1000 : 0;
        
        //базовая формула
        let total = ((basePrice * weekendMultiplier) + morningSurcharge + eveningSurcharge) * persons;
        
        //применяем опции
        if (options.early_registration) total *= 0.9; // -10%
        if (options.group_enrollment && persons >= 5) total *= 0.85; // -15%
        if (options.intensive_course) total *= 1.2; // +20%
        if (options.supplementary) total += 2000 * persons;
        if (options.personalized) total += 1500 * course.total_length;
        if (options.excursions) total *= 1.25; // +25%
        if (options.assessment) total += 300;
        if (options.interactive) total *= 1.5; // +50%
        
        return Math.round(total);
    }
};

//модуль аутентификации
const Auth = {
    //проверить, авторизован ли пользователь
    isAuthenticated() {
        const savedKey = localStorage.getItem('api_key');
        return savedKey === API_KEY;
    },
    
    //сохранить ключ
    saveApiKey(key) {
        localStorage.setItem('api_key', key);
        localStorage.setItem('api_key_saved', 'true');
    },
    
    //получить сохраненный ключ
    getApiKey() {
        return localStorage.getItem('api_key');
    },
    
    //очистить ключ (выход)
    clearApiKey() {
        localStorage.removeItem('api_key');
        localStorage.removeItem('api_key_saved');
    },
    
    //показать модальное окно для ввода API ключа
    showModal() {
        //создаем модальное окно, если его нет
        let modal = document.getElementById('apiKeyModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'apiKeyModal';
            modal.className = 'modal fade';
            modal.tabIndex = '-1';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">API Key настройки</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Ваш API Key</label>
                                <input type="text" class="form-control" id="apiKeyInput" value="${API_KEY}">
                                <div class="form-text">Этот ключ идентифицирует вас в системе</div>
                            </div>
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="saveApiKeyCheck" checked>
                                <label class="form-check-label" for="saveApiKeyCheck">
                                    Сохранить ключ на этом устройстве
                                </label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
                            <button type="button" class="btn btn-primary" id="saveApiKeyBtn">Сохранить</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            //обработчик сохранения ключа
            document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
                const saveToStorage = document.getElementById('saveApiKeyCheck').checked;
                if (saveToStorage) {
                    this.saveApiKey(API_KEY);
                    Utils.showNotification('API Key сохранен', 'success');
                }
                const bsModal = bootstrap.Modal.getInstance(modal);
                bsModal.hide();
            });
        }
        
        //показываем модальное окно
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
};

//экспорт для глобального использования
window.API = API;
window.Utils = Utils;
window.Auth = Auth;
