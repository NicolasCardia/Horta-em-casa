import { db } from '../firebase.js';
import { store } from '../core/store.js';
import * as DOM from '../ui/domElements.js';
import { showAlert, showConfirm } from '../ui/modals.js';
import { addToCart } from './cart.js'; // Importa do módulo de carrinho

// Busca produtos do DB e salva no store
export async function fetchAndRenderProducts() {
    try {
        const snapshot = await db.collection('products').get();
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        store.setProducts(products); // Salva os produtos no store
        renderProducts(); // Chama a função de renderização
    } catch (error) {
        DOM.productGrid.innerHTML = `<p class="text-red-500">Não foi possível carregar os produtos.</p>`;
    }
}

// Renderiza os produtos na tela
function renderProducts() {
    DOM.productGrid.innerHTML = '';
    const currentUser = store.getCurrentUser();
    
    store.getProducts().forEach(product => {
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
        DOM.productGrid.appendChild(card);
    });
}

// Deleta um produto
async function handleDeleteProduct(productId) {
    const product = store.findProduct(productId);
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

// Configura os listeners da grade de produtos
export function setupProductListeners() {
    DOM.productGrid.addEventListener('click', (e) => {
        const addButton = e.target.closest('.add-to-cart-btn');
        if (addButton) {
            const productId = addButton.dataset.productId;
            addToCart(productId); // Chama a função do módulo de carrinho
            
            // Feedback visual
            addButton.textContent = 'Adicionado! ✓';
            addButton.classList.remove('bg-green-600', 'hover:bg-green-700');
            addButton.classList.add('bg-orange-500', 'cursor-default');
            setTimeout(() => {
                const product = store.findProduct(productId);
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
}

// Configura os listeners dos formulários de admin (Adicionar/Editar)
export function setupAdminProductForms() {
    DOM.showAddProductFormBtn.addEventListener('click', () => {
        DOM.addProductForm.classList.remove('hidden');
        DOM.showAddProductFormBtn.classList.add('hidden');
    });

    DOM.cancelAddProductBtn.addEventListener('click', () => {
        DOM.addProductForm.classList.add('hidden');
        DOM.showAddProductFormBtn.classList.remove('hidden');
        DOM.addProductForm.reset();
    });

    DOM.addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentUser = store.getCurrentUser();
        if (!currentUser || !currentUser.isAdmin) return showAlert('Acesso Negado', 'Você não tem permissão.');
        
        const newProduct = {
            name: DOM.addProductForm.querySelector('#product-name').value,
            price: parseFloat(DOM.addProductForm.querySelector('#product-price').value),
            unit: DOM.addProductForm.querySelector('#product-unit').value,
            stock: parseInt(DOM.addProductForm.querySelector('#product-stock').value),
            image: DOM.addProductForm.querySelector('#product-image').value,
        };
        try {
            await db.collection('products').add(newProduct);
            showAlert('Sucesso!', `Produto "${newProduct.name}" adicionado.`);
            DOM.addProductForm.reset();
            DOM.addProductForm.classList.add('hidden');
            DOM.showAddProductFormBtn.classList.remove('hidden');
            fetchAndRenderProducts(); // Atualiza a lista
        } catch (error) {
            showAlert('Erro', 'Não foi possível adicionar o produto.');
        }
    });
}

