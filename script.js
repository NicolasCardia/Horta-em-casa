document.addEventListener('DOMContentLoaded', () => {

    // --- FIREBASE INITIALIZATION ---
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    // --- STATE MANAGEMENT ---
    let currentUser = null; 
    let cart = [];
    let products = [];
    let unsubscribeOrders = null;
    let checkoutAfterLogin = false;
    
    // --- DOM ELEMENTS ---
    const loginPage = document.getElementById('login-page');
    const signupPage = document.getElementById('signup-page');
    const productsPage = document.getElementById('products-page');
    const adminPage = document.getElementById('admin-page');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loggedInView = document.getElementById('logged-in-view');
    const loggedOutView = document.getElementById('logged-out-view');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    const loginLink = document.getElementById('login-link');
    const signupLink = document.getElementById('signup-link');
    const toSignupLink = document.getElementById('to-signup-link');
    const toLoginLink = document.getElementById('to-login-link');
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

    // Confirmation Modal elements
    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    // Admin-specific DOM elements
    const adminControlsContainer = document.getElementById('admin-controls-container');
    const showAddProductFormBtn = document.getElementById('show-add-product-form-btn');
    const addProductForm = document.getElementById('add-product-form');
    const cancelAddProductBtn = document.getElementById('cancel-add-product-btn');

    // --- NOVOS ELEMENTOS PARA ENTREGA/RETIRADA ---
    const deliveryOptionContainer = document.getElementById('delivery-option-container');
    const deliveryRadio = document.getElementById('delivery-radio');
    const pickupRadio = document.getElementById('pickup-radio');
    const addressModal = document.getElementById('address-modal');
    const addressInput = document.getElementById('address-input');
    const saveAddressBtn = document.getElementById('save-address-btn');
    const closeAddressModalBtn = document.getElementById('close-address-modal-btn');

    // --- NOVO ESTADO ---
    let deliveryType = null; // 'delivery' ou 'pickup'
    let deliveryAddress = '';

    // --- NAVIGATION ---
    function showPage(pageToShow) {
        [loginPage, signupPage, productsPage, adminPage].forEach(page => page.classList.add('hidden'));
        appHeader.classList.add('hidden');
        if (pageToShow !== loginPage && pageToShow !== signupPage) {
            appHeader.classList.remove('hidden');
        }
        pageToShow.classList.remove('hidden');
    }

    // --- AUTHENTICATION STATE CHANGE ---
    auth.onAuthStateChanged(async (user) => {
        adminLink.classList.add('hidden');
        adminControlsContainer.classList.add('hidden');
        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                currentUser = { uid: user.uid, email: user.email, ...userDoc.data(), isAdmin: false };
                welcomeMessage.textContent = `Olá, ${currentUser.name}!`;
            } else {
                currentUser = { uid: user.uid, email: user.email, name: 'Usuário', isAdmin: false };
                welcomeMessage.textContent = `Olá!`;
            }

            if (user.uid === ADMIN_UID) {
                currentUser.isAdmin = true;
                adminLink.classList.remove('hidden');
                adminControlsContainer.classList.remove('hidden');
            }
            
            loggedInView.classList.remove('hidden');
            loggedOutView.classList.add('hidden');
            
            if (checkoutAfterLogin) {
                checkoutAfterLogin = false;
                showPage(productsPage);
                await performCheckout();
            }
        } else {
            currentUser = null;
            loggedInView.classList.add('hidden');
            loggedOutView.classList.remove('hidden');
        }
        if (products.length > 0) renderProducts();
    });

    // --- MODALS (ALERT AND CONFIRM) ---
    function showAlert(title, message) {
        alertTitle.textContent = title;
        alertMessage.textContent = message;
        alertModal.classList.remove('hidden');
    }
    closeAlertModal.addEventListener('click', () => alertModal.classList.add('hidden'));

    function showConfirm(title, message) {
        return new Promise(resolve => {
            confirmTitle.textContent = title;
            confirmMessage.textContent = message;
            confirmModal.classList.remove('hidden');

            const onConfirm = () => {
                confirmModal.classList.add('hidden');
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(true);
            };

            const onCancel = () => {
                confirmModal.classList.add('hidden');
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(false);
            };

            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
        });
    }

    // --- AUTHENTICATION ACTIONS ---
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { name, whatsapp, email, password } = signupForm;
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email.value, password.value);
            await db.collection('users').doc(userCredential.user.uid).set({
                name: name.value,
                whatsapp: whatsapp.value
            });
            signupForm.reset();
            showPage(productsPage);
        } catch (error) {
            showAlert('Erro no Cadastro', error.message);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { email, password } = loginForm;
        try {
            await auth.signInWithEmailAndPassword(email.value, password.value);
            loginForm.reset();
            if (!checkoutAfterLogin) {
                showPage(productsPage);
            }
        } catch (error) {
            showAlert('Erro no Login', error.message);
        }
    });

    logoutButton.addEventListener('click', () => auth.signOut().then(() => showPage(productsPage)));
    
    // --- GOOGLE LOGIN ---
    const googleLoginBtn = document.getElementById('google-login-btn');
    googleLoginBtn.addEventListener('click', async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            // Se for novo usuário, salva dados mínimos no Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                await db.collection('users').doc(user.uid).set({
                    name: user.displayName || 'Usuário',
                    whatsapp: '', // Pode pedir depois
                    email: user.email
                });
            }
            showPage(productsPage);
        } catch (error) {
            showAlert('Erro no Login', error.message);
        }
    });

    // --- CHECKOUT ---
    async function performCheckout() {
        if (cart.length === 0 || !currentUser) return;
        if (!deliveryType) {
            showAlert('Escolha obrigatória', 'Selecione se deseja entrega em casa ou retirada no local.');
            return;
        }
        if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
            showAddressModal();
            showAlert('Endereço obrigatório', 'Informe o endereço para entrega.');
            return;
        }
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        try {
            await db.collection('orders').add({
                customer: { uid: currentUser.uid, name: currentUser.name, whatsapp: currentUser.whatsapp },
                items: JSON.parse(JSON.stringify(cart)),
                total: total,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                deliveryType,
                deliveryAddress: deliveryType === 'delivery' ? deliveryAddress : null
            });
            const VENDEDOR_WHATSAPP = "5519981917697";
            const pedidoText = cart.map(item => `- ${item.quantity} ${item.unit} de ${item.name}`).join('\n');
            let mensagem = `Olá! Gostaria de fazer um pedido pelo site.\n\nMeu nome: ${currentUser.name}\n\nMeu pedido:\n${pedidoText}\n\nValor Total: R$ ${total.toFixed(2).replace('.', ',')}\n`;
            if (deliveryType === 'delivery') {
                mensagem += `\nEndereço para entrega: ${deliveryAddress}\n`;
            } else {
                mensagem += `\nOpção escolhida: Retirar no local\n`;
            }
            mensagem += `\nAguardo as instruções para pagamento e entrega. Obrigado!`;
            const whatsappUrl = `https://wa.me/${VENDEDOR_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
            cart = [];
            deliveryType = null;
            deliveryAddress = '';
            updateCart();
            window.open(whatsappUrl, '_blank');
        } catch (error) {
            showAlert('Erro', 'Não foi possível registrar seu pedido.');
        }
    }
    
    // --- NAVIGATION LINKS ---
    adminLink.addEventListener('click', (e) => { e.preventDefault(); showPage(adminPage); renderAdminPanel(); });
    homeLink.addEventListener('click', (e) => { e.preventDefault(); showPage(productsPage); });
    loginLink.addEventListener('click', (e) => { e.preventDefault(); showPage(loginPage); });
    signupLink.addEventListener('click', (e) => { e.preventDefault(); showPage(signupPage); });
    toSignupLink.addEventListener('click', (e) => { e.preventDefault(); showPage(signupPage); });
    toLoginLink.addEventListener('click', (e) => { e.preventDefault(); showPage(loginPage); });

    // --- PRODUCT MANAGEMENT ---
    async function fetchAndRenderProducts() {
        try {
            const snapshot = await db.collection('products').get();
            products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderProducts();
        } catch (error) {
            productGrid.innerHTML = `<p class="text-red-500">Não foi possível carregar os produtos.</p>`;
        }
    }

    function renderProducts() {
        productGrid.innerHTML = '';
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow-md overflow-hidden flex flex-col';
            const stockInfo = product.stock > 0 ? `${product.stock} em estoque` : 'Sem estoque';
            const buttonDisabled = product.stock <= 0 ? 'disabled' : '';
            const buttonClasses = product.stock <= 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700';

            const adminDeleteButton = (currentUser && currentUser.isAdmin) ? `
                <button data-product-id="${product.id}" class="delete-product-btn absolute top-2 right-2 text-red-500 bg-white/70 p-1 rounded-full hover:bg-red-500 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                </button>
            ` : '';

            card.innerHTML = `
                <div class="relative">
                    <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover">
                    ${adminDeleteButton}
                </div>
                <div class="p-4 flex flex-col flex-grow">
                    <h3 class="text-lg font-semibold">${product.name}</h3>
                    <div class="flex justify-between items-center mt-1">
                        <p class="text-slate-600">R$ ${product.price.toFixed(2).replace('.', ',')} / ${product.unit}</p>
                        <p class="text-sm font-medium text-slate-500">${stockInfo}</p>
                    </div>
                    <div class="mt-auto pt-4">
                        <button data-product-id="${product.id}" class="add-to-cart-btn w-full text-white py-2 rounded-lg font-semibold transition-colors ${buttonClasses}" ${buttonDisabled}>
                            ${product.stock > 0 ? 'Adicionar ao Carrinho' : 'Indisponível'}
                        </button>
                    </div>
                </div>
            `;
            productGrid.appendChild(card);
        });
    }

    async function handleDeleteProduct(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const confirmed = await showConfirm('Confirmar Exclusão', `Tem certeza que deseja excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`);

        if (confirmed) {
            try {
                await db.collection('products').doc(productId).delete();
                showAlert('Sucesso!', 'Produto excluído.');
                fetchAndRenderProducts();
            } catch (error) {
                showAlert('Erro', 'Não foi possível excluir o produto.');
            }
        }
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
        if (!product) return;
        
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
        if (!itemInCart || !product) return;

        if (newQuantity <= 0) {
            cart = cart.filter(item => item.id !== productId);
        } else if (newQuantity > product.stock) {
            showAlert('Estoque Insuficiente', `Apenas ${product.stock} unidades de ${product.name} estão disponíveis.`);
            itemInCart.quantity = product.stock;
        }
        else {
            itemInCart.quantity = newQuantity;
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
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartItemCount.textContent = totalItems > 0 ? totalItems : '0';
        cartItemCount.classList.toggle('hidden', totalItems === 0);
    }

    // --- ADMIN PANEL ---
    function renderAdminPanel() {
        if (unsubscribeOrders) unsubscribeOrders(); 

        orderList.innerHTML = '<p class="text-center text-slate-500">Carregando pedidos...</p>';
        unsubscribeOrders = db.collection('orders').orderBy('createdAt', 'desc')
          .onSnapshot(snapshot => {
            orderList.innerHTML = '';
            let totalSales = 0;
            if (snapshot.empty) {
                orderList.innerHTML = `<p class="text-center text-slate-500">Nenhum pedido registrado ainda.</p>`;
                updateSalesSummary(0);
                return;
            }

            snapshot.forEach(doc => {
                const order = { id: doc.id, ...doc.data() };
                const orderCard = document.createElement('div');
                orderCard.className = 'bg-white rounded-lg shadow-md p-6';
                const itemsHtml = order.items.map(item => `<li class="flex justify-between"><span>${item.quantity} ${item.unit} de ${item.name}</span><span>R$ ${(item.price * item.quantity).toFixed(2).replace('.',',')}</span></li>`).join('');
                const statusClasses = { pending: 'bg-yellow-100 text-yellow-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' };
                const statusText = { pending: 'Pendente', completed: 'Concluído', cancelled: 'Cancelado' };

                orderCard.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-bold text-lg">Pedido #${String(doc.id).substring(0, 5).toUpperCase()}</h3>
                            <p class="text-sm text-slate-600">Cliente: ${order.customer.name}</p>
                            <p class="text-sm text-slate-600">WhatsApp: ${order.customer.whatsapp}</p>
                            <p class="text-xs text-slate-400">Data: ${order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('pt-BR') : 'N/A'}</p>
                        </div>
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[order.status]}">${statusText[order.status]}</span>
                    </div>
                    <hr class="my-4"><ul class="space-y-2 text-sm">${itemsHtml}</ul><hr class="my-4">
                    <div class="text-right font-bold">Total: R$ ${order.total.toFixed(2).replace('.',',')}</div>
                    <div class="mt-4 flex gap-4 justify-end" ${order.status !== 'pending' ? 'style="display:none;"' : ''}>
                        <button data-order-id="${order.id}" data-action="cancel" class="admin-action-btn bg-red-100 text-red-700 hover:bg-red-200 font-semibold py-2 px-4 rounded-lg">Venda Não Realizada</button>
                        <button data-order-id="${order.id}" data-action="complete" class="admin-action-btn bg-green-100 text-green-700 hover:bg-green-200 font-semibold py-2 px-4 rounded-lg">Venda Realizada</button>
                    </div>
                `;
                orderList.appendChild(orderCard);
                if (order.status === 'completed') totalSales += order.total;
            });
            updateSalesSummary(totalSales);
        }, error => {
            orderList.innerHTML = `<p class="text-center text-red-500">Erro ao carregar pedidos.</p>`;
        });
    }
    
    function updateSalesSummary(total) {
        salesSummary.innerHTML = `<p class="text-lg font-medium text-slate-700">Total de Vendas Válidas</p><p class="text-3xl font-bold text-green-600">R$ ${total.toFixed(2).replace('.',',')}</p>`;
    }
    
    async function handleAdminAction(orderId, action) {
        const orderRef = db.collection('orders').doc(orderId);
        if (action === 'cancel') {
            await orderRef.update({ status: 'cancelled' });
            return;
        }
        if (action === 'complete') {
            try {
                await db.runTransaction(async (transaction) => {
                    const orderDoc = await transaction.get(orderRef);
                    if (!orderDoc.exists) throw "Pedido não encontrado!";
                    const orderData = orderDoc.data();
                    for (const item of orderData.items) {
                        const productRef = db.collection('products').doc(item.id);
                        const productDoc = await transaction.get(productRef);
                        if (!productDoc.exists) throw `Produto ${item.name} não encontrado!`;
                        if (productDoc.data().stock < item.quantity) throw `Estoque de ${item.name} insuficiente!`;
                    }
                    for (const item of orderData.items) {
                        const productRef = db.collection('products').doc(item.id);
                        const newStock = firebase.firestore.FieldValue.increment(-item.quantity);
                        transaction.update(productRef, { stock: newStock });
                    }
                    transaction.update(orderRef, { status: 'completed' });
                });
            } catch (error) {
                showAlert("Erro de Estoque", String(error));
            }
        }
    }

    // --- EVENT LISTENERS ---
    cartButton.addEventListener('click', toggleCart);
    closeCartButton.addEventListener('click', toggleCart);
    cartSidebar.addEventListener('click', (e) => (e.target === cartSidebar) && toggleCart());

    productGrid.addEventListener('click', (e) => {
        const addButton = e.target.closest('.add-to-cart-btn');
        if (addButton) {
            const productId = addButton.dataset.productId;
            addToCart(productId);
            addButton.textContent = 'Adicionado! ✓';
            addButton.classList.remove('bg-green-600', 'hover:bg-green-700');
            addButton.classList.add('bg-orange-500', 'cursor-default');
            setTimeout(() => {
                const product = products.find(p => p.id === productId);
                if (product && product.stock > 0){
                    addButton.textContent = 'Adicionar ao Carrinho';
                    addButton.classList.remove('bg-orange-500', 'cursor-default');
                    addButton.classList.add('bg-green-600', 'hover:bg-green-700');
                }
            }, 1500);
            return;
        }
        const deleteButton = e.target.closest('.delete-product-btn');
        if (deleteButton) {
            const productId = deleteButton.dataset.productId;
            handleDeleteProduct(productId);
        }
    });

    cartItemsList.addEventListener('click', (e) => {
        const button = e.target.closest('.quantity-change-btn, .remove-item-btn');
        if (button) {
            const productId = button.dataset.productId;
            const item = cart.find(i => i.id === productId);
            if (!item) return;
            if (button.classList.contains('quantity-change-btn')) {
                const newQuantity = button.dataset.action === 'increase' ? item.quantity + 1 : item.quantity - 1;
                updateCartItemQuantity(productId, newQuantity);
            } else {
                updateCartItemQuantity(productId, 0);
            }
        }
    });
    
    checkoutButton.addEventListener('click', () => {
        if (currentUser) {
            performCheckout();
        } else {
            checkoutAfterLogin = true;
            toggleCart();
            showPage(loginPage);
        }
    });
    
    orderList.addEventListener('click', (e) => {
        const target = e.target.closest('.admin-action-btn');
        if (target) {
            const orderId = target.dataset.orderId;
            const action = target.dataset.action;
            handleAdminAction(orderId, action);
        }
    });

    // Admin form listeners
    showAddProductFormBtn.addEventListener('click', () => {
        addProductForm.classList.remove('hidden');
        showAddProductFormBtn.classList.add('hidden');
    });

    cancelAddProductBtn.addEventListener('click', () => {
        addProductForm.classList.add('hidden');
        showAddProductFormBtn.classList.remove('hidden');
        addProductForm.reset();
    });

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser || !currentUser.isAdmin) return showAlert('Acesso Negado', 'Você não tem permissão.');
        const newProduct = {
            name: addProductForm.querySelector('#product-name').value,
            price: parseFloat(addProductForm.querySelector('#product-price').value),
            unit: addProductForm.querySelector('#product-unit').value,
            stock: parseInt(addProductForm.querySelector('#product-stock').value),
            image: addProductForm.querySelector('#product-image').value,
        };
        try {
            await db.collection('products').add(newProduct);
            showAlert('Sucesso!', `Produto "${newProduct.name}" adicionado.`);
            addProductForm.reset();
            addProductForm.classList.add('hidden');
            showAddProductFormBtn.classList.remove('hidden');
            fetchAndRenderProducts();
        } catch (error) {
            showAlert('Erro', 'Não foi possível adicionar o produto.');
        }
    });

    // --- MODAL DE ENDEREÇO ---
    function showAddressModal() {
        addressModal.classList.remove('hidden');
        addressInput.value = deliveryAddress || '';
    }
    function closeAddressModal() {
        addressModal.classList.add('hidden');
    }
    saveAddressBtn.addEventListener('click', () => {
        if (!addressInput.value.trim()) {
            showAlert('Endereço obrigatório', 'Por favor, informe o endereço para entrega.');
            return;
        }
        deliveryAddress = addressInput.value.trim();
        closeAddressModal();
    });
    closeAddressModalBtn.addEventListener('click', closeAddressModal);

    // --- SELEÇÃO ENTREGA/RETIRADA ---
    deliveryRadio.addEventListener('change', () => {
        deliveryType = 'delivery';
        showAddressModal();
    });
    pickupRadio.addEventListener('change', () => {
        deliveryType = 'pickup';
        deliveryAddress = '';
    });

    // --- ATUALIZAR CARRINHO PARA EXIGIR ESCOLHA ---
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
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartItemCount.textContent = totalItems > 0 ? totalItems : '0';
        cartItemCount.classList.toggle('hidden', totalItems === 0);
        // Exibir seleção obrigatória
        deliveryOptionContainer.classList.remove('hidden');
    }

    // --- INITIALIZATION ---
    function initializeApp() {
        showPage(productsPage);
        fetchAndRenderProducts();
    }

    initializeApp();
});