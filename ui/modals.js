import * as DOM from './domElements.js';
import { store } from '../core/store.js';

/**
 * Exibe um modal de alerta simples com um título e uma mensagem.
 * @param {string} title - O título do alerta.
 * @param {string} message - A mensagem a ser exibida.
 */
export function showAlert(title, message) {
    DOM.alertTitle.textContent = title;
    DOM.alertMessage.textContent = message;
    DOM.alertModal.classList.remove('hidden');
}

/**
 * Exibe um modal de confirmação com botões "Confirmar" e "Cancelar".
 * Retorna uma Promise que resolve como 'true' se confirmado e 'false' se cancelado.
 * @param {string} title - O título da confirmação.
 * @param {string} message - A pergunta de confirmação.
 * @returns {Promise<boolean>} - True para confirmar, False para cancelar.
 */
export function showConfirm(title, message) {
    return new Promise(resolve => {
        DOM.confirmTitle.textContent = title;
        DOM.confirmMessage.textContent = message;
        DOM.confirmModal.classList.remove('hidden');

        // Remove listeners antigos para evitar cliques duplicados
        let onConfirm, onCancel;

        onConfirm = () => {
            DOM.confirmModal.classList.add('hidden');
            DOM.confirmBtn.removeEventListener('click', onConfirm);
            DOM.cancelBtn.removeEventListener('click', onCancel);
            resolve(true); // Usuário confirmou
        };

        onCancel = () => {
            DOM.confirmModal.classList.add('hidden');
            DOM.confirmBtn.removeEventListener('click', onConfirm);
            DOM.cancelBtn.removeEventListener('click', onCancel);
            resolve(false); // Usuário cancelou
        };

        // Adiciona os novos listeners
        DOM.confirmBtn.addEventListener('click', onConfirm);
        DOM.cancelBtn.addEventListener('click', onCancel);
    });
}

/**
 * Abre o modal de edição de produto e o preenche com os dados do produto.
 * @param {string} productId - O ID do produto a ser editado.
 */
export function openEditModal(productId) {
    const product = store.findProduct(productId);
    if (!product) return;

    // Preenche o formulário de edição com os dados atuais do produto
    DOM.editProductForm.querySelector('#edit-product-name').value = product.name;
    DOM.editProductForm.querySelector('#edit-product-price').value = product.price;
    DOM.editProductForm.querySelector('#edit-product-unit').value = product.unit;
    DOM.editProductForm.querySelector('#edit-product-stock').value = product.stock;
    DOM.editProductForm.querySelector('#edit-product-image').value = product.image;
    
    // Armazena o ID do produto no próprio formulário para saber quem salvar
    DOM.editProductForm.dataset.editingId = productId; 
    
    DOM.editProductModal.classList.remove('hidden');
}

/**
 * Configura os listeners básicos dos modais (botões de fechar/cancelar).
 */
export function setupModalListeners() {
    // Listener para o botão "OK" do modal de alerta
    DOM.closeAlertModal.addEventListener('click', () => {
        DOM.alertModal.classList.add('hidden');
    });

    // Listener para o botão "Cancelar" do modal de edição
    DOM.cancelEditProductBtn.addEventListener('click', () => {
        DOM.editProductModal.classList.add('hidden');
    });
}

