import { auth, db } from '../firebase.js';
import * as DOM from '../ui/domElements.js';
import { showAlert } from '../ui/modals.js';
import { showPage } from './navigation.js';
import { store } from './store.js';

/**
 * Inicia o observador de estado de autenticação do Firebase.
 * Este "vigia" é chamado sempre que o usuário faz login ou logout.
 * @param {function} callback - A função a ser executada quando o estado de auth mudar.
 */
export function initAuthObserver(callback) {
    auth.onAuthStateChanged(callback);
}

/**
 * Configura todos os event listeners para os formulários de autenticação
 * (Login, Cadastro) e o botão de Logout.
 */
export function setupAuthListeners() {
    
    // Listener para o formulário de CADASTRO
    DOM.signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { name, whatsapp, email, password } = DOM.signupForm;
        
        try {
            // 1. Cria o usuário no Firebase Authentication (email/senha)
            const userCredential = await auth.createUserWithEmailAndPassword(email.value, password.value);
            
            // 2. Salva os dados adicionais (nome, whatsapp) no Firestore
            await db.collection('users').doc(userCredential.user.uid).set({
                name: name.value,
                whatsapp: whatsapp.value
            });
            
            // 3. Limpa o formulário e leva para a página de produtos
            DOM.signupForm.reset();
            showPage(DOM.productsPage);
        } catch (error) {
            showAlert('Erro no Cadastro', error.message);
        }
    });

    // Listener para o formulário de LOGIN
    DOM.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { email, password } = DOM.loginForm;
        
        try {
            await auth.signInWithEmailAndPassword(email.value, password.value);
            DOM.loginForm.reset();
            
            // Se o usuário não estava tentando finalizar um pedido, vai para a home.
            // Se estava, o observador (em main.js) cuidará de continuar o checkout.
            if (!store.isCheckoutAfterLogin()) {
                showPage(DOM.productsPage);
            }
        } catch (error) {
            showAlert('Erro no Login', error.message);
        }
    });

    // Listener para o botão de LOGOUT
    DOM.logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => {
            // Após o logout, o observador (em main.js) será acionado,
            // limpando o estado do usuário e atualizando a UI.
            showPage(DOM.productsPage);
        });
    });
}

