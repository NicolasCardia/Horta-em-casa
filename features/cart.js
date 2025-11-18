import { db } from '../firebase.js';
import { store } from '../core/store.js';
import * as DOM from '../ui/domElements.js';
import { showAlert } from '../ui/modals.js';
import { showPage } from '../core/navigation.js';

/**
 * Mostra ou esconde o painel lateral do carrinho.
 */
function toggleCart() {
    if (DOM.cartSidebar.classList.contains('hidden')) {
        DOM.cartSidebar.classList.remove('hidden');
        setTimeout(() => DOM.cartContent.classList.remove('translate-x-full'), 10);
    } else {
        DOM.cartContent.classList.add('translate-x-full');
        setTimeout(() => DOM.cartSidebar.classList.add('hidden'), 500);
    }
}

/**
 * Adiciona um produto ao carrinho ou incrementa sua quantidade.
 * @param {string} productId - O ID do produto a ser adicionado.
 */
function addToCart(productId) {
    const product = store.findProduct(productId);
    if (!product) return;
    
    const existingItem = store.findCartItem(productId);
    const cart = store.getCart();

    if (existingItem) {
        if (existingItem.quantity < product.stock) {
             existingItem.quantity++;
        } else {
            showAlert('Estoque Insuficiente', `Você já adicionou o máximo de ${product.name} disponível.`);
        }
    } else {
        if (product.stock > 0) {
             cart.push({ ...product, quantity: 1 });
        }
    }
    store.setCart(cart); // Atualiza o carrinho no store
    updateCartUI(); // Atualiza a interface
}

/**
 * Altera a quantidade de um item no carrinho ou o remove.
 * @param {string} productId - O ID do produto.
 * @param {number} newQuantity - A nova quantidade (0 para remover).
 */
function updateCartItemQuantity(productId, newQuantity) {
    let cart = store.getCart();
    const itemInCart = store.findCartItem(productId);
    const product = store.findProduct(productId);
    if (!itemInCart || !product) return;

    if (newQuantity <= 0) {
        // Remove o item do carrinho
        cart = cart.filter(item => item.id !== productId);
    } else if (newQuantity > product.stock) {
        // Limita a quantidade ao estoque disponível
        showAlert('Estoque Insuficiente', `Apenas ${product.stock} unidades de ${product.name} estão disponíveis.`);
        itemInCart.quantity = product.stock;
    }
    else {
        // Atualiza a quantidade
        itemInCart.quantity = newQuantity;
    }
    
    store.setCart(cart); // Atualiza o carrinho no store
    updateCartUI(); // Atualiza a interface
}

/**
 * Atualiza a interface do painel lateral do carrinho (lista de itens, total, etc.)
 */
function updateCartUI() {
    const cart = store.getCart();
    DOM.cartItemsList.innerHTML = '';
    
    if (cart.length === 0) {
        DOM.emptyCartMessage.style.display = 'block';
        DOM.checkoutButton.disabled = true;
    } else {
        DOM.emptyCartMessage.style.display = 'none';
        DOM.checkoutButton.disabled = false;
        
        cart.forEach(item => {
            const li = document.createElement('li');
            li.className = 'flex py-6';
            li.innerHTML = `
                <div class="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                    <img src="${item.image}" alt="${item.name}" class="h-full w-full object-cover object-center">
                </div>
                <div class="ml-4 flex flex-1 flex-col">
                    <div>
                        <div class="flex justify-between text-base font-medium text-gray-900">
                            <h3>${item.name}</h3>
                            <p class="ml-4">R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                        </div>
                    </div>
                    <div class="flex flex-1 items-end justify-between text-sm">
                        <div class="flex items-center border border-gray-200 rounded">
                            <button data-product-id="${item.id}" data-action="decrease" class="quantity-change-btn px-2 py-1">-</button>
                            <p class="text-gray-500 w-8 text-center">Qtd ${item.quantity}</p>
                            <button data-product-id="${item.id}" data-action="increase" class="quantity-change-btn px-2 py-1">+</button>
                        </div>
                        <div class="flex">
                            <button data-product-id="${item.id}" type="button" class="font-medium text-red-600 hover:text-red-500 remove-item-btn">Remover</button>
                        </div>
                    </div>
                </div>
            `;
            DOM.cartItemsList.appendChild(li);
        });
    }
    
    // Calcula o subtotal
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    DOM.cartTotalPrice.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    
    // Calcula o total de itens (contador no ícone)
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    DOM.cartItemCount.textContent = totalItems > 0 ? totalItems : '0';
    DOM.cartItemCount.classList.toggle('hidden', totalItems === 0);
}

/**
 * Finaliza o pedido. Salva no Firestore e redireciona para o WhatsApp.
 */
async function performCheckout() {
    const cart = store.getCart();
    const currentUser = store.getCurrentUser();
    
    if (cart.length === 0 || !currentUser) return;

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    try {
        // 1. Salva o pedido no Firestore
        await db.collection('orders').add({
            customer: { 
                uid: currentUser.uid, 
                name: currentUser.name, 
                whatsapp: currentUser.whatsapp 
            },
            items: JSON.parse(JSON.stringify(cart)), // Salva uma cópia profunda do carrinho
            total: total,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Prepara a mensagem para o WhatsApp
        const VENDEDOR_WHATSAPP = "5519981917697"; // Seu número de WhatsApp
        const pedidoText = cart.map(item => `- ${item.quantity} ${item.unit} de ${item.name}`).join('\n');
        const mensagem = `Olá! Gostaria de fazer um pedido pelo site.\n\nMeu nome: ${currentUser.name}\n\nMeu pedido:\n${pedidoText}\n\nValor Total: R$ ${total.toFixed(2).replace('.', ',')}\n\nAguardo as instruções para pagamento e entrega. Obrigado!`;
        const whatsappUrl = `https://wa.me/${VENDEDOR_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;

        // 3. Limpa o carrinho e redireciona o usuário
        store.setCart([]); // Limpa o carrinho no store
        updateCartUI(); // Atualiza a UI (esvazia o carrinho)
        window.open(whatsappUrl, '_blank'); // Abre o WhatsApp em nova aba

    } catch (error) {
        console.error("Erro ao salvar o pedido: ", error);
        showAlert('Erro', 'Não foi possível registrar seu pedido. Tente novamente.');
    }
}


/**
 * Configura os listeners de eventos para todos os botões do carrinho.
 */
export function setupCartListeners() {
    // Botão para abrir o carrinho
    DOM.cartButton.addEventListener('click', toggleCart);
    
    // Botão para fechar o carrinho
    DOM.closeCartButton.addEventListener('click', toggleCart);
    
    // Fechar o carrinho clicando fora (no overlay)
    DOM.cartSidebar.addEventListener('click', (e) => {
        if (e.target === DOM.cartSidebar) {
            toggleCart();
        }
    });

    // Botão de Finalizar Pedido
    DOM.checkoutButton.addEventListener('click', () => {
        const currentUser = store.getCurrentUser();
        
        if (currentUser) {
            // Se o usuário está logado, finaliza a compra
            performCheckout();
        } else {
            // Se não está logado, pede para ele fazer login
            store.setCheckoutAfterLogin(true); // Marca que ele quer comprar
            toggleCart(); // Fecha o carrinho
            showPage(DOM.loginPage); // Mostra a página de login
        }
    });

    // Listeners para os botões +/- e Remover dentro do carrinho
    DOM.cartItemsList.addEventListener('click', (e) => {
        const button = e.target.closest('.quantity-change-btn, .remove-item-btn');
        if (button) {
            const productId = button.dataset.productId;
            const item = store.findCartItem(productId);
            if (!item) return;

            if (button.classList.contains('quantity-change-btn')) {
                // Altera a quantidade
                const newQuantity = button.dataset.action === 'increase' ? item.quantity + 1 : item.quantity - 1;
                updateCartItemQuantity(productId, newQuantity);
            } else {
                // Remove o item (definindo a quantidade como 0)
                updateCartItemQuantity(productId, 0);
            }
        }
    });
}

// Exporta as funções que precisam ser chamadas por outros módulos
export { addToCart, updateCartUI, performCheckout };

