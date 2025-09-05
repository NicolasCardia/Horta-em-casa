document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let currentUser = null;
    let cart = [];
    let orders = [];
    let nextOrderId = 1;

    const products = [
        { id: 1, name: 'Alface Crespa', price: 3.50, unit: 'unidade', image: 'https://placehold.co/400x400/22c55e/ffffff?text=Alface', stock: 50 },
        { id: 2, name: 'Tomate Italiano', price: 8.99, unit: 'kg', image: 'https://placehold.co/400x400/ef4444/ffffff?text=Tomate', stock: 30 },
        { id: 3, name: 'Cebola Branca', price: 5.49, unit: 'kg', image: 'https://placehold.co/400x400/f3f4f6/333333?text=Cebola', stock: 40 },
        { id: 4, name: 'Batata Inglesa', price: 4.99, unit: 'kg', image: 'https://placehold.co/400x400/f59e0b/ffffff?text=Batata', stock: 60 },
        { id: 5, name: 'Cenoura', price: 4.50, unit: 'kg', image: 'https://placehold.co/400x400/f97316/ffffff?text=Cenoura', stock: 35 },
        { id: 6, name: 'Maçã Fuji', price: 9.90, unit: 'kg', image: 'https://placehold.co/400x400/dc2626/ffffff?text=Maçã', stock: 25 },
        { id: 7, name: 'Banana Nanica', price: 6.50, unit: 'dúzia', image: 'https://placehold.co/400x400/eab308/ffffff?text=Banana', stock: 20 },
        { id: 8, name: 'Cheiro Verde', price: 2.50, unit: 'maço', image: 'https://placehold.co/400x400/16a34a/ffffff?text=Salsa', stock: 45 },
    ];
    
    // --- DOM ELEMENTS ---
    const authPage = document.getElementById('auth-page');
    const productsPage = document.getElementById('products-page');
    const adminPage = document.getElementById('admin-page');
    const authForm = document.getElementById('auth-form');
    const appHeader = document.getElementById('app-header');
    const productGrid = document.getElementById('product-grid');
    const orderList = document.getElementById('order-list');
    const salesSummary = document.getElementById('sales-summary');
    
    const homeLink = document.getElementById('home-link');
    const adminLink = document.getElementById('admin-link');
    
    const cartButton = document.getElementById('cart-button');
    const closeCartButton = document.getElementById('close-cart-button');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartContent = document.getElementById('cart-content');
    const cartItemsList = document.getElementById('cart-items-list');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const checkoutButton = document.getElementById('checkout-button');
    const cartItemCount = document.getElementById('cart-item-count');
    
    const alertModal = document.getElementById('alert-modal');
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const closeAlertModal = document.getElementById('close-alert-modal');

    // --- NAVIGATION ---
    function showPage(pageToShow) {
        [authPage, productsPage, adminPage].forEach(page => page.classList.add('hidden'));
        pageToShow.classList.remove('hidden');
    }

    adminLink.addEventListener('click', (e) => {
        e.preventDefault();
        renderAdminPanel();
        showPage(adminPage);
    });

    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(productsPage);
    });

    // --- ALERT MODAL ---
    function showAlert(title, message) {
        alertTitle.textContent = title;
        alertMessage.textContent = message;
        alertModal.classList.remove('hidden');
    }
    closeAlertModal.addEventListener('click', () => {
        alertModal.classList.add('hidden');
    });

    // --- AUTHENTICATION ---
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(authForm);
        currentUser = {
            name: formData.get('name'),
            whatsapp: formData.get('whatsapp'),
        };
        showProductsPage();
    });

    function showProductsPage() {
        showPage(productsPage);
        appHeader.classList.remove('hidden');
        renderProducts();
    }

    // --- PRODUCT RENDERING ---
    function renderProducts() {
        productGrid.innerHTML = '';
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow-md overflow-hidden transition-transform transform hover:-translate-y-1';
            const stockInfo = product.stock > 0 ? `${product.stock} em estoque` : 'Sem estoque';
            const buttonDisabled = product.stock <= 0 ? 'disabled' : '';
            const buttonClasses = product.stock <= 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700';

            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="text-lg font-semibold">${product.name}</h3>
                    <div class="flex justify-between items-center">
                        <p class="text-slate-600">R$ ${product.price.toFixed(2).replace('.', ',')} / ${product.unit}</p>
                        <p class="text-sm font-medium text-slate-500">${stockInfo}</p>
                    </div>
                    <button data-product-id="${product.id}" class="add-to-cart-btn mt-4 w-full text-white py-2 rounded-lg font-semibold transition-colors ${buttonClasses}" ${buttonDisabled}>
                        ${product.stock > 0 ? 'Adicionar ao Carrinho' : 'Indisponível'}
                    </button>
                </div>
            `;
            productGrid.appendChild(card);
        });
    }

    // --- CART LOGIC ---
    function toggleCart() {
        if (cartSidebar.classList.contains('hidden')) {
            cartSidebar.classList.remove('hidden');
            setTimeout(() => cartContent.classList.remove('translate-x-full'), 10);
        } else {
            cartContent.classList.add('translate-x-full');
            setTimeout(() => cartSidebar.classList.add('hidden'), 500);
        }
    }

    function addToCart(productId) {
        const product = products.find(p => p.id === productId);
        const existingItem = cart.find(item => item.id === productId);

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
        updateCart();
    }
    
    function updateCartItemQuantity(productId, newQuantity) {
        const itemInCart = cart.find(item => item.id === productId);
        const product = products.find(p => p.id === productId);

        if (itemInCart) {
            if (newQuantity <= 0) {
                cart = cart.filter(item => item.id !== productId);
            } else if (newQuantity > product.stock) {
                showAlert('Estoque Insuficiente', `Apenas ${product.stock} unidades de ${product.name} estão disponíveis.`);
                itemInCart.quantity = product.stock;
            }
            else {
                itemInCart.quantity = newQuantity;
            }
        }
        updateCart();
    }

    function updateCart() {
        cartItemsList.innerHTML = '';
        if (cart.length === 0) {
            emptyCartMessage.style.display = 'block';
            checkoutButton.disabled = true;
        } else {
            emptyCartMessage.style.display = 'none';
            checkoutButton.disabled = false;
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
                cartItemsList.appendChild(li);
            });
        }
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        cartTotalPrice.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
        cartItemCount.textContent = cart.length > 0 ? cart.reduce((sum, item) => sum + item.quantity, 0) : '0';
        cartItemCount.classList.toggle('hidden', cart.length === 0);
    }

    // --- ADMIN PANEL ---
    function renderAdminPanel() {
        orderList.innerHTML = '';
        let totalSales = 0;

        if (orders.length === 0) {
            orderList.innerHTML = `<p class="text-center text-slate-500">Nenhum pedido registrado ainda.</p>`;
        } else {
            orders.forEach(order => {
                const orderCard = document.createElement('div');
                orderCard.className = 'bg-white rounded-lg shadow-md p-6';

                const itemsHtml = order.items.map(item => `
                    <li class="flex justify-between">
                        <span>${item.quantity} ${item.unit} de ${item.name}</span>
                        <span>R$ ${(item.price * item.quantity).toFixed(2).replace('.',',')}</span>
                    </li>
                `).join('');
                
                const statusClasses = {
                    pending: 'status-pending',
                    completed: 'status-completed',
                    cancelled: 'status-cancelled'
                };

                orderCard.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-bold text-lg">Pedido #${String(order.id).padStart(4, '0')}</h3>
                            <p class="text-sm text-slate-600">Cliente: ${order.customer.name}</p>
                            <p class="text-sm text-slate-600">WhatsApp: ${order.customer.whatsapp}</p>
                        </div>
                        <span class="status-badge ${statusClasses[order.status]}">${order.status}</span>
                    </div>
                    <hr class="my-4">
                    <ul class="space-y-2 text-sm">${itemsHtml}</ul>
                    <hr class="my-4">
                    <div class="text-right font-bold">
                        Total: R$ ${order.total.toFixed(2).replace('.',',')}
                    </div>
                    <div class="mt-4 flex gap-4 justify-end" ${order.status !== 'pending' ? 'style="display:none;"' : ''}>
                        <button data-order-id="${order.id}" data-action="cancel" class="admin-action-btn bg-red-100 text-red-700 hover:bg-red-200 font-semibold py-2 px-4 rounded-lg">Venda Não Realizada</button>
                        <button data-order-id="${order.id}" data-action="complete" class="admin-action-btn bg-green-100 text-green-700 hover:bg-green-200 font-semibold py-2 px-4 rounded-lg">Venda Realizada</button>
                    </div>
                `;
                orderList.appendChild(orderCard);
                
                if (order.status === 'completed') {
                    totalSales += order.total;
                }
            });
        }
        
        salesSummary.innerHTML = `
            <p class="text-lg font-medium text-slate-700">Total de Vendas Válidas</p>
            <p class="text-3xl font-bold text-green-600">R$ ${totalSales.toFixed(2).replace('.',',')}</p>
        `;
    }
    
    function handleAdminAction(orderId, action) {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        if (action === 'complete') {
            // Check stock before completing
            let canFulfill = true;
            let outOfStockItem = null;
            for (const item of order.items) {
                const productInStock = products.find(p => p.id === item.id);
                if (productInStock.stock < item.quantity) {
                    canFulfill = false;
                    outOfStockItem = item;
                    break;
                }
            }
            
            if (canFulfill) {
                // Decrease stock
                order.items.forEach(item => {
                    const productInStock = products.find(p => p.id === item.id);
                    productInStock.stock -= item.quantity;
                });
                order.status = 'completed';
                renderProducts(); // Re-render products to show updated stock
            } else {
                 showAlert('Estoque Insuficiente!', `Não foi possível confirmar a venda. Estoque de "${outOfStockItem.name}" é insuficiente.`);
            }

        } else if (action === 'cancel') {
            order.status = 'cancelled';
        }

        renderAdminPanel();
    }


    // --- EVENT LISTENERS ---
    cartButton.addEventListener('click', toggleCart);
    closeCartButton.addEventListener('click', toggleCart);
    cartSidebar.addEventListener('click', (e) => (e.target === cartSidebar) && toggleCart());

    productGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-cart-btn')) {
            const productId = parseInt(e.target.dataset.productId);
            addToCart(productId);
            
            e.target.textContent = 'Adicionado! ✓';
            e.target.classList.remove('bg-green-600', 'hover:bg-green-700');
            e.target.classList.add('bg-orange-500', 'cursor-default');
            setTimeout(() => {
                e.target.textContent = 'Adicionar ao Carrinho';
                e.target.classList.remove('bg-orange-500', 'cursor-default');
                e.target.classList.add('bg-green-600', 'hover:bg-green-700');
            }, 1500);
        }
    });

    cartItemsList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('.quantity-change-btn, .remove-item-btn')) {
            const productId = parseInt(target.dataset.productId);
            const item = cart.find(i => i.id === productId);
            
            if (target.classList.contains('quantity-change-btn')) {
                const newQuantity = target.dataset.action === 'increase' ? item.quantity + 1 : item.quantity - 1;
                updateCartItemQuantity(productId, newQuantity);
            } else { // remove-item-btn
                updateCartItemQuantity(productId, 0);
            }
        }
    });
    
    checkoutButton.addEventListener('click', () => {
        if (cart.length === 0 || !currentUser) return;
        
        // 1. Create and save the order
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const newOrder = {
            id: nextOrderId++,
            customer: { ...currentUser },
            items: JSON.parse(JSON.stringify(cart)), // Deep copy of cart
            total: total,
            status: 'pending'
        };
        orders.push(newOrder);
        
        // 2. Prepare WhatsApp message
        const VENDEDOR_WHATSAPP = "5519981917697";
        let pedidoText = cart.map(item => `- ${item.quantity} ${item.unit} de ${item.name}`).join('\n');
        
        const mensagem = `Olá! Gostaria de fazer um pedido pelo site. 😊

Meu nome: ${currentUser.name}

Meu pedido:
${pedidoText}

Valor Total: R$ ${total.toFixed(2).replace('.', ',')}

Aguardo as instruções para pagamento e entrega. Obrigado!`;

        const whatsappUrl = `https://wa.me/${VENDEDOR_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
        
        // 3. Clean cart and redirect
        cart = [];
        updateCart();
        toggleCart();
        window.open(whatsappUrl, '_blank');
    });
    
    orderList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('admin-action-btn')) {
            const orderId = parseInt(target.dataset.orderId);
            const action = target.dataset.action;
            handleAdminAction(orderId, action);
        }
    });

});

