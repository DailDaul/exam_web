//Управление авторизацией
const Auth = {
    //инициализация
    init() {
        this.createApiKeyModal();
        this.checkApiKey();
        this.bindEvents();
    },
    
    //проверка API ключа
    checkApiKey() {
        const savedKey = localStorage.getItem('api_key');
        const defaultKey = API.config.apiKey;
        
        if (!savedKey && defaultKey === '9f17101c-61e9-4f97-8d3f-7c13ded0e7d4') {
            //используем дефолтный ключ
            localStorage.setItem('api_key', defaultKey);
            API.config.apiKey = defaultKey;
            API.utils.showNotification('Используется стандартный API ключ', 'info');
        } else if (savedKey) {
            API.config.apiKey = savedKey;
        }
    },
    
    //создание модального окна для управления API ключом
    createApiKeyModal() {
        const modalHTML = `
            <div class="modal fade" id="apiKeyModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Настройки API</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">API Key</label>
                                <input type="text" class="form-control" id="apiKeyInput" 
                                       value="${localStorage.getItem('api_key') || API.config.apiKey}">
                                <div class="form-text">
                                    Ключ передается в строке запроса: <code>?api_key=ВАШ_КЛЮЧ</code>
                                </div>
                                <div class="form-text text-muted mt-2">
                                    <small>
                                        <i class="bi bi-info-circle"></i> 
                                        Максимум 10 заявок на одного пользователя. 
                                        Текущий ключ: ${API.config.apiKey.substring(0, 8)}...
                                    </small>
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
                            <button type="button" class="btn btn-primary" onclick="Auth.saveApiKey()">
                                Сохранить
                            </button>
                            <button type="button" class="btn btn-outline-danger" onclick="Auth.resetApiKey()">
                                Сбросить к стандартному
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
    
    //сохранение API ключа
    saveApiKey() {
        const newKey = document.getElementById('apiKeyInput').value.trim();
        
        if (!newKey) {
            API.utils.showNotification('API ключ не может быть пустым', 'danger');
            return;
        }
        
        //проверяем формат UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(newKey)) {
            API.utils.showNotification('Неверный формат API ключа (ожидается UUID)', 'warning');
        }
        
        localStorage.setItem('api_key', newKey);
        API.config.apiKey = newKey;
        
        API.utils.showNotification('API ключ сохранен! Перезагрузите страницу для применения.', 'success');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('apiKeyModal'));
        if (modal) modal.hide();
    },
    
    //сброс API ключа
    resetApiKey() {
        const defaultKey = '9f17101c-61e9-4f97-8d3f-7c13ded0e7d4';
        localStorage.setItem('api_key', defaultKey);
        API.config.apiKey = defaultKey;
        document.getElementById('apiKeyInput').value = defaultKey;
        
        API.utils.showNotification('API ключ сброшен к стандартному', 'info');
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
        if (error.message && error.message.includes('авторизации') || 
            error.message && error.message.includes('API Key')) {
            
            API.utils.showNotification(
                'Ошибка авторизации. Проверьте API ключ в настройках.',
                'danger'
            );
            
            //показываем окно настройки API
            setTimeout(() => this.showModal(), 1000);
            return true;
        }
        return false;
    }
};

//инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    if (typeof API !== 'undefined') {
        Auth.init();
    }
});

window.Auth = Auth;
