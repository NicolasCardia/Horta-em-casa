import { db } from '../firebase.js';
import { store } from '../core/store.js';
import * as DOM from '../ui/domElements.js';
import { showAlert } from '../ui/modals.js';
import { fetchAndRenderProducts } from './products.js'; // Importa para atualizar o estoque na home

/**
 * Renderiza o painel de administração, buscando os pedidos do Firestore
 * em tempo real (usando onSnapshot).
 */
export function renderAdminPanel() {
    // Cancela o "vigia" (listener) anterior, se existir, para evitar duplicatas
    const oldListener = store.getOrderListener();
    if (oldListener) oldListener(); 

    DOM.orderList.innerHTML = '<p class="text-center text-slate-500">Carregando pedidos...</p>';
    
    // Cria um novo "vigia" que atualiza a lista de pedidos automaticamente
    const newListener = db.collection('orders').orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        DOM.orderList.innerHTML = '';
        let totalSales = 0;
        
        if (snapshot.empty) {
            DOM.orderList.innerHTML = `<p class="text-center text-slate-500">Nenhum pedido registrado ainda.</p>`;
            updateSalesSummary(0);
            return;
        }

        snapshot.forEach(doc => {
            const order = { id: doc.id, ...doc.data() };
            const orderCard = document.createElement('div');
            orderCard.className = 'bg-white rounded-lg shadow-md p-6';
            
            // Formata a lista de itens do pedido
            const itemsHtml = order.items.map(item => `
                <li class="flex justify-between">
                    <span>${item.quantity} ${item.unit} de ${item.name}</span>
                    <span>R$ ${(item.price * item.quantity).toFixed(2).replace('.',',')}</span>
                </li>
            `).join('');
            
            // Define as classes e textos para o status do pedido
            const statusClasses = { 
                pending: 'status-pending', 
                completed: 'status-completed', 
                cancelled: 'status-cancelled' 
            };
            const statusText = { 
                pending: 'Pendente', 
                completed: 'Concluído', 
                cancelled: 'Cancelado' 
            };

            // Monta o HTML do card do pedido
            orderCard.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-lg">Pedido #${String(doc.id).substring(0, 5).toUpperCase()}</h3>
                        <p class="text-sm text-slate-600">Cliente: ${order.customer.name}</p>
                        <p class="text-sm text-slate-600">WhatsApp: ${order.customer.whatsapp}</p>
                        <p class="text-xs text-slate-400">Data: ${order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('pt-BR') : 'N/A'}</p>
                    </div>
                    <span class="status-badge ${statusClasses[order.status]}">${statusText[order.status]}</span>
                </div>
                <hr class="my-4">
                <ul class="space-y-2 text-sm">${itemsHtml}</ul>
                <hr class="my-4">
                <div class="text-right font-bold">Total: R$ ${order.total.toFixed(2).replace('.',',')}</div>
                
                <!-- Botões de ação (só aparecem se o pedido estiver 'pendente') -->
                <div class="mt-4 flex gap-4 justify-end" ${order.status !== 'pending' ? 'style="display:none;"' : ''}>
                    <button data-order-id="${order.id}" data-action="cancel" class="admin-action-btn bg-red-100 text-red-700 hover:bg-red-200 font-semibold py-2 px-4 rounded-lg">Venda Não Realizada</button>
                    <button data-order-id="${order.id}" data-action="complete" class="admin-action-btn bg-green-100 text-green-700 hover:bg-green-200 font-semibold py-2 px-4 rounded-lg">Venda Realizada</button>
                </div>
            `;
            DOM.orderList.appendChild(orderCard);
            
            // Soma ao total de vendas apenas se o pedido estiver 'concluído'
            if (order.status === 'completed') totalSales += order.total;
        });
        
        updateSalesSummary(totalSales);
    }, error => {
        console.error("Erro ao buscar pedidos: ", error);
        DOM.orderList.innerHTML = `<p class="text-center text-red-500">Erro ao carregar pedidos.</p>`;
    });
    
    // Salva o novo "vigia" no store para que possa ser cancelado depois
    store.setOrderListener(newListener);
}

/**
 * Atualiza o resumo de vendas totais no painel de admin.
 * @param {number} total - O valor total das vendas concluídas.
 */
function updateSalesSummary(total) {
    DOM.salesSummary.innerHTML = `<p class="text-lg font-medium text-slate-700">Total de Vendas Válidas</p><p class="text-3xl font-bold text-green-600">R$ ${total.toFixed(2).replace('.',',')}</p>`;
}

/**
 * Processa as ações do admin (cancelar ou completar um pedido).
 * @param {string} orderId - O ID do documento do pedido no Firestore.
 * @param {string} action - A ação a ser tomada ('complete' ou 'cancel').
 */
async function handleAdminAction(orderId, action) {
    const orderRef = db.collection('orders').doc(orderId);
    
    if (action === 'cancel') {
        await orderRef.update({ status: 'cancelled' });
        return;
    }
    
    if (action === 'complete') {
        try {
            // Usa uma transação para garantir que o estoque seja atualizado com segurança
            await db.runTransaction(async (transaction) => {
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists) throw "Pedido não encontrado!";
                
                const orderData = orderDoc.data();
                
                // 1. Verifica se há estoque para todos os itens
                for (const item of orderData.items) {
                    const productRef = db.collection('products').doc(item.id);
                    const productDoc = await transaction.get(productRef);
                    if (!productDoc.exists) throw `Produto ${item.name} não encontrado!`;
                    if (productDoc.data().stock < item.quantity) throw `Estoque de ${item.name} insuficiente!`;
                }
                
                // 2. Se houver estoque, dá baixa em cada item
                for (const item of orderData.items) {
                    const productRef = db.collection('products').doc(item.id);
                    // 'increment' é uma operação segura do Firestore para abater o valor
                    const newStock = firebase.firestore.FieldValue.increment(-item.quantity);
                    transaction.update(productRef, { stock: newStock });
                }
                
                // 3. Marca o pedido como 'concluído'
                transaction.update(orderRef, { status: 'completed' });
            });
            
            // Após a transação, atualiza a lista de produtos na home (para mostrar o novo estoque)
            fetchAndRenderProducts();
            
        } catch (error) {
            console.error("Erro na transação: ", error);
            showAlert("Erro de Estoque", String(error));
        }
    }
}

/**
 * Configura o listener de eventos para a lista de pedidos,
 * usando "event delegation" para capturar cliques nos botões de ação.
 */
export function setupAdminOrderListeners() {
    DOM.orderList.addEventListener('click', (e) => {
        const target = e.target.closest('.admin-action-btn');
        if (target) {
            const orderId = target.dataset.orderId;
            const action = target.dataset.action;
            handleAdminAction(orderId, action);
        }
    });
}

