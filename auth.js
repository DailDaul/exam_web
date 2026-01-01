//Управление авторизацией
const Auth = {
    //инициализация
    init() {
        this.createApiKeyModal();
        this.checkApiKey();
        this.checkCorsSetting();
        this.bindEvents();
    },
    
    //проверка API ключа
    checkApiKey() {
        const savedKey = localStorage.getItem('api_key');
        const defaultKey = '9f17101c-61e9-4f97-8d3f-7c13ded0e7d4';
        
        if (!savedKey && defaultKey === '9f17101c-61e9-4f97-8d3f-7c13ded0e7d4') {
            //используем дефолтный ключ
            localStorage.setItem('api_key', defaultKey);
            if (window.API && window.API.config) {
                window.API.config.apiKey = defaultKey;
            }
            this.showNotification('Используется стандартный API ключ', 'info');
        } else if (savedKey) {
            if (window.API && window.API.config) {
                window.API.config.apiKey = savedKey;
            }
        }
    },
    
    //проверка настройки CORS
    checkCorsSetting() {
        const useProxy = localStorage.getItem('use_cors_proxy');
        if (useProxy === 'true' && window.API) {
            window.API.config.useCorsProxy = true;
        }
    },
    
    //создание модального окна для управления API ключом
    createApiKeyModal() {
        const currentKey = localStorage.getItem('api_key') || 
                          (window.API && window.API.config ? window.API.config.apiKey : '');
        const useProxy = localStorage.getItem('use_cors_proxy') === 'true';
        
        const modalHTML = `
            <div class="modal fade" id="apiKeyModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Настройки API</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">API Key</label>
                                <input type="text" class="form-control" id="apiKeyInput" 
                                       value="${currentKey}">
                                <div class="form-text">
                                    Ключ передается в строке запроса: <code>?api_key=ВАШ_КЛЮЧ</code>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" 
                                           id="corsProxyToggle" ${useProxy ? 'checked' : ''}>
                                    <label class="form-check-label" for="corsProxyToggle">
                                        Использовать CORS прокси
                                    </label>
                                </div>
                                <div class="form-text">
                                    Включайте только если возникают ошибки CORS при загрузке данных
                                </div>
                            </div>
                            
                            <div class="alert alert-info">
                                <h6><i class="bi bi-shield-check"></i> Информация об авторизации:</h6>
                                <ul class="mb-0">
                                    <li>API ключ обязателен для всех запросов</li>
                                    <li>Ключ передается как query-параметр</li>
                                    <li>Ограничение: 10 заявок на пользователя</li>
                                    <li>Пользователь видит только свои заявки</li>
                                </ul>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                Закрыть
                            </button>
                            <button type="button" class="btn btn-primary" onclick="Auth.saveSettings()">
                                Сохранить
                            </button>
                            <button type="button" class="btn btn-outline-danger" onclick="Auth.resetSettings()">
                                Сбросить к стандартным
                            </button>
                            <button type="button" class="btn btn-outline-success" onclick="Auth.testApiConnection()">
                                <i class="bi bi-wifi"></i> Тест подключения
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        if (!document.getElementById('apiKeyModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    },
    
    //сохраняем все настройки
    saveSettings() {
        const newKey = document.getElementById('apiKeyInput').value.trim();
        const useProxy = document.getElementById('corsProxyToggle').checked;
        
        if (!newKey) {
            this.showNotification('API ключ не может быть пустым', 'danger');
            return;
        }
        
        //проверяем формат UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(newKey)) {
            if (!confirm('Неверный формат API ключа. Все равно сохранить?')) {
                return;
            }
        }
        
        localStorage.setItem('api_key', newKey);
        localStorage.setItem('use_cors_proxy', useProxy ? 'true' : 'false');
        
        if (window.API && window.API.config) {
            window.API.config.apiKey = newKey;
        }
        
        this.showNotification('Настройки сохранены! Перезагрузите страницу для применения.', 'success');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('apiKeyModal'));
        if (modal) modal.hide();
    },
    
    //сброс настроек
    resetSettings() {
        const defaultKey = '9f17101c-61e9-4f97-8d3f-7c13ded0e7d4';
        localStorage.setItem('api_key', defaultKey);
        localStorage.setItem('use_cors_proxy', 'false');
        
        if (window.API && window.API.config) {
            window.API.config.apiKey = defaultKey;
        }
        
        document.getElementById('apiKeyInput').value = defaultKey;
        document.getElementById('corsProxyToggle').checked = false;
        
        this.showNotification('Настройки сброшены к стандартным', 'info');
    },
    
    //тест подключения к API
    testApiConnection: async function() {
        try {
            this.showNotification('Тестируем подключение к API...', 'info');
            
            if (!window.API || !window.API.client) {
                this.showNotification('API модуль не загружен', 'danger');
                return;
            }
            
            //cохраняем текущий ключ
            const currentKey = window.API.config.apiKey;
            const testKey = document.getElementById('apiKeyInput').value.trim();
            
            //временно устанавливаем тестовый ключ
            window.API.config.apiKey = testKey || currentKey;
            
            try {
                const testResult = await window.API.client.request('/api/courses?limit=1');
                
                if (testResult && Array.isArray(testResult)) {
                    this.showNotification(
                        `Подключение успешно! Загружено ${testResult.length} курсов.`,
                        'success'
                    );
                } else {
                    this.showNotification('Некорректный ответ от API', 'warning');
                }
            } catch (error) {
                this.showNotification(`Ошибка подключения: ${error.message}`, 'danger');
            } finally {
                //восстанавливаем оригинальный ключ
                window.API.config.apiKey = currentKey;
            }
        } catch (error) {
            this.showNotification(`Ошибка тестирования: ${error.message}`, 'danger');
        }
    },
    
    //показать модальное окно
    showModal() {
        const modal = new bootstrap.Modal(document.getElementById('apiKeyModal'));
        modal.show();
    },
    
    //привязка событий
    bindEvents() {
        //добавляем кнопку управления API в навигацию
        this.addApiButtonToNav();
    },
    
    addApiButtonToNav() {
        //находим навигацию
        const navbar = document.querySelector('.navbar-nav');
        if (!navbar) return;
        
        //проверяем, не добавлена ли уже кнопка
        if (document.getElementById('apiSettingsBtn')) return;
        
        const apiBtn = document.createElement('li');
        apiBtn.className = 'nav-item';
        apiBtn.id = 'apiSettingsBtn';
        apiBtn.innerHTML = `
            <a class="nav-link" href="#" onclick="Auth.showModal()">
                <i class="bi bi-key"></i> API Настройки
            </a>
        `;
        
        navbar.appendChild(apiBtn);
    },
    
    //проверка ответа API на ошибки авторизации
    handleAuthError(error) {
        if (error.message && (error.message.includes('авторизации') || 
            error.message.includes('API Key'))) {
            
            this.showNotification(
                'Ошибка авторизации. Проверьте API ключ в настройках.',
                'danger'
            );
            
            //показываем окно настройки API
            setTimeout(() => this.showModal(), 1000);
            return true;
        }
        return false;
    },
    
    //вспомогательная функция для уведомлений
    showNotification(message, type = 'info') {
        if (window.API && window.API.utils && typeof window.API.utils.showNotification === 'function') {
            window.API.utils.showNotification(message, type);
        } else {
            // Простая реализация, если API еще не загружен
            const notificationArea = document.getElementById('notification-area');
            if (!notificationArea) return;
            
            const alert = document.createElement('div');
            alert.className = `alert alert-${type} alert-dismissible fade show`;
            alert.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            notificationArea.appendChild(alert);
            
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 5000);
        }
    }
};

//инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    //ждем немного, чтобы API успел загрузиться
    setTimeout(() => {
        if (typeof Auth !== 'undefined') {
            try {
                Auth.init();
            } catch (error) {
                console.error('Ошибка инициализации Auth:', error);
            }
        }
    }, 100);
});

window.Auth = Auth;
