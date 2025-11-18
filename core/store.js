// Este arquivo gerencia o estado da aplicação
let currentUser = null;
let products = [];
let cart = [];
let checkoutAfterLogin = false;
let unsubscribeOrders = null;

export const store = {
    // Getters
    getCurrentUser: () => currentUser,
    getProducts: () => products,
    getCart: () => cart,
    isCheckoutAfterLogin: () => checkoutAfterLogin,
    getOrderListener: () => unsubscribeOrders,

    // Setters
    setCurrentUser: (user) => { currentUser = user; },
    setProducts: (newProducts) => { products = newProducts; },
    setCart: (newCart) => { cart = newCart; },
    setCheckoutAfterLogin: (value) => { checkoutAfterLogin = value; },
    setOrderListener: (listener) => { unsubscribeOrders = listener; },

    // Helpers
    findProduct: (productId) => products.find(p => p.id === productId),
    findCartItem: (productId) => cart.find(item => item.id === productId),
    
    clearCart: () => { cart = []; }
};

