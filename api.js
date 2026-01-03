'use strict';

const API_BASE_URL = 'http://exam-api-courses.std-900.ist.mospolytech.ru';
const API_KEY = '9f17101c-61e9-4f97-8d3f-7c13ded0e7d4';

// Список официальных нерабочих праздничных дней для России
const RUSSIAN_HOLIDAYS = {
  // 2026 год
  '2026-01-01': 'Новый год',
  '2026-01-02': 'Новый год',
  '2026-01-03': 'Новый год',
  '2026-01-04': 'Новый год',
  '2026-01-05': 'Новый год',
  '2026-01-06': 'Новый год',
  '2026-01-07': 'Рождество Христово',
  '2026-01-08': 'Новогодние каникулы',
  '2026-02-23': 'День защитника Отечества',
  '2026-03-08': 'Международный женский день',
  '2026-05-01': 'Праздник Весны и Труда',
  '2026-05-09': 'День Победы',
  '2026-06-12': 'День России',
  '2026-11-04': 'День народного единства',
};

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
    
    //проверка, является ли дата праздником
    isHoliday(dateString) {
        if (!dateString) return false;
        
        // Форматируем дату в формат YYYY-MM-DD для сравнения
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        return RUSSIAN_HOLIDAYS.hasOwnProperty(formattedDate);
    },
    
    //расчет стоимости (единая функция для курсов и репетиторов) согласно ТРЕБОВАНИЮ 3.3.4
    calculateCoursePrice(course, selectedDate, selectedTime, studentsNumber, durationInHours, options) {
        // Проверка обязательных параметров
        if (!course || !selectedDate || !selectedTime || !studentsNumber || !durationInHours) {
            console.error('Недостаточно данных для расчета стоимости');
            return 0;
        }
        
        // Определяем стоимость за час
        const isTutor = course.price_per_hour !== undefined;
        const courseFeePerHour = isTutor ? course.price_per_hour : course.course_fee_per_hour;
        
        if (!courseFeePerHour || courseFeePerHour <= 0) {
            console.warn('Стоимость за час не указана или равна 0');
            return 0;
        }
        
        // 1. Проверка на выходные и праздники
        const date = new Date(selectedDate);
        const dayOfWeek = date.getDay(); // 0-воскресенье, 6-суббота
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = this.isHoliday(selectedDate);
        
        // Коэффициент согласно требованию: выходные или праздники = 1.5, будни = 1
        const isWeekendOrHoliday = (isWeekend || isHoliday) ? 1.5 : 1;
        
        // 2. Утренняя доплата (9:00-12:00)
        const hour = selectedTime ? parseInt(selectedTime.split(':')[0]) : 0;
        const morningSurcharge = (hour >= 9 && hour < 12) ? 400 : 0;
        
        // 3. Вечерняя доплата (18:00-20:00)
        const eveningSurcharge = (hour >= 18 && hour < 20) ? 1000 : 0;
        
        // 4. Базовая формула согласно требованию 3.3.4:
        // Общая стоимость = ((courseFeePerHour × durationInHours × isWeekendOrHoliday) + morningSurcharge + eveningSurcharge) × studentsNumber
        let totalCost = ((courseFeePerHour * durationInHours * isWeekendOrHoliday) + morningSurcharge + eveningSurcharge) * studentsNumber;
        
        // 5. Применяем дополнительные опции (если они переданы)
        if (options) {
            // Дополнительные скидки и надбавки
            if (options.early_registration) totalCost *= 0.9; // -10%
            if (options.group_enrollment && studentsNumber >= 5) totalCost *= 0.85; // -15%
            if (options.intensive_course) totalCost *= 1.2; // +20%
            if (options.supplementary) totalCost += 2000 * studentsNumber;
            if (options.personalized && !isTutor) totalCost += 1500 * (course.total_length || 0);
            if (options.excursions) totalCost *= 1.25; // +25%
            if (options.assessment) totalCost += 300;
            if (options.interactive) totalCost *= 1.5; // +50%
        }
        
        // Округляем до целого числа
        return Math.round(totalCost);
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
