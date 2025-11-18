// Importa a configuração do seu arquivo config.js
// (Note o '../' para "subir" um nível de pasta)
import { firebaseConfig } from '../config.js';

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Exporta as instâncias que os outros arquivos irão usar
export const db = firebase.firestore();
export const auth = firebase.auth();

