import { auth, db } from './firebase.js';
import { ADMIN_UID } from '../config.js';
import * as DOM from './ui/domElements.js';
import { store } from './core/store.js';
import { showPage, setupNavigationListeners } from './core/navigation.js';
import { initAuthObserver, setupAuthListeners } from './core/auth.js';
import { setupProductListeners, fetchAndRenderProducts, setupAdminProductForms } from './features/products.js';
import { setupCartListeners, performCheckout } from './features/cart.js';
import { setupAdminOrderListeners } from './features/admin.js';

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {

    // 1. Configura a navegação principal (links do header, etc.)
    setupNavigationListeners();

    // 2. Configura os listeners de autenticação (formulários de login/signup, botão logout)
    setupAuthListeners();
    
    // 3. Inicia o "vigia" de autenticação do Firebase
    initAuthObserver(async (user) => {
        // Esta função é chamada sempre que o estado do login muda
        DOM.adminLink.classList.add('hidden');
        DOM.adminControlsContainer.classList.add('hidden');
        
        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            let userData = { uid: user.uid, email: user.email, isAdmin: false };
            
            if (userDoc.exists) {
                userData = { ...userData, ...userDoc.data() };
            }
            
            if (user.uid === ADMIN_UID) {
                userData.isAdmin = true;
                DOM.adminLink.classList.remove('hidden');
                DOM.adminControlsContainer.classList.remove('hidden');
            }
            
            store.setCurrentUser(userData);
            DOM.welcomeMessage.textContent = `Olá, ${userData.name || 'Usuário'}!`;
            DOM.loggedInView.classList.remove('hidden');
            DOM.loggedOutView.classList.add('hidden');
            
            if (store.isCheckoutAfterLogin()) {
                store.setCheckoutAfterLogin(false);
                showPage(DOM.productsPage);
                await performCheckout();
            }
        } else {
            store.setCurrentUser(null);
            DOM.loggedInView.classList.add('hidden');
            DOM.loggedOutView.classList.remove('hidden');
        }
        
        // Re-renderiza produtos para mostrar/esconder botões de admin
        fetchAndRenderProducts();
    });

    // 4. Configura os listeners de produtos (clicar em "Adicionar", "Excluir")
    setupProductListeners();

    // 5. Configura listeners dos formulários de admin (Adicionar produto)
    setupAdminProductForms();
    
    // 6. Configura os listeners do carrinho (abrir/fechar, finalizar, etc.)
    setupCartListeners();

    // 7. Configura os listeners do painel de admin (confirmar/cancelar pedido)
    setupAdminOrderListeners();

    // 8. Carrega os dados iniciais e exibe a página principal
    showPage(DOM.productsPage);
    fetchAndRenderProducts();
});

