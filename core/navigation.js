import * as DOM from '../ui/domElements.js';
import { renderAdminPanel } from '../features/admin.js';

/**
 * Controla a visibilidade das seções da página (simulando a troca de páginas).
 * @param {HTMLElement} pageToShow - O elemento da seção da página que deve ser exibido.
 */
export function showPage(pageToShow) {
    // Esconde todas as páginas
    [DOM.loginPage, DOM.signupPage, DOM.productsPage, DOM.adminPage].forEach(page => {
        if (page) page.classList.add('hidden');
    });
    
    // Esconde o cabeçalho por padrão
    DOM.appHeader.classList.add('hidden');
    
    // Mostra o cabeçalho apenas se a página não for de login/cadastro
    if (pageToShow !== DOM.loginPage && pageToShow !== DOM.signupPage) {
        DOM.appHeader.classList.remove('hidden');
    }
    
    // Mostra a página solicitada
    if (pageToShow) pageToShow.classList.remove('hidden');
}

/**
 * Configura todos os event listeners para os links de navegação do site.
 */
export function setupNavigationListeners() {
    
    // Link para a Página de Admin
    DOM.adminLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showPage(DOM.adminPage); 
        renderAdminPanel(); // Carrega os dados do painel de admin
    });
    
    // Link para a Página Inicial (Home/Produtos)
    DOM.homeLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showPage(DOM.productsPage); 
    });
    
    // Link para a Página de Login
    DOM.loginLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showPage(DOM.loginPage); 
    });
    
    // Link para a Página de Cadastro
    DOM.signupLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showPage(DOM.signupPage); 
    });
    
    // Link "Cadastre-se" (na página de login)
    DOM.toSignupLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showPage(DOM.signupPage); 
    });
    
    // Link "Faça login" (na página de cadastro)
    DOM.toLoginLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showPage(DOM.loginPage); 
    });
}

