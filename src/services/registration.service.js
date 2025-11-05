/**
 * Registration Service - Gerencia o processo de registro em etapas
 */

const { UserDB } = require('./database.service');

// Armazena o estado temporário do registro de cada usuário
const registrationStates = new Map();

// Tempo máximo de inatividade: 10 minutos
const REGISTRATION_TIMEOUT = 10 * 60 * 1000;

/**
 * Limpa estados de registro expirados
 */
function cleanExpiredStates() {
  const now = Date.now();
  for (const [phone, state] of registrationStates.entries()) {
    if (now - state.startedAt > REGISTRATION_TIMEOUT) {
      registrationStates.delete(phone);
    }
  }
}

// Limpa estados expirados a cada 5 minutos
setInterval(cleanExpiredStates, 5 * 60 * 1000);

/**
 * Verifica se usuário está em processo de registro
 */
function isInRegistrationProcess(phone) {
  return registrationStates.has(phone);
}

/**
 * Verifica se usuário já está cadastrado
 */
async function checkUserExists(phone) {
  const user = await UserDB.findByPhone(phone);
  return user !== undefined && user !== null;
}

/**
 * Inicia processo de registro
 */
async function startRegistration(phone) {
  // Verificar se usuário já existe
  const userExists = await checkUserExists(phone);
  if (userExists) {
    const user = await UserDB.findByPhone(phone);
    return { error: 'USER_EXISTS', user };
  }

  registrationStates.set(phone, {
    phone,
    step: 1, // 1=nome, 2=cargo, 3=categorias, 4=senha
    name: null,
    role: null,
    categories: [],
    startedAt: Date.now()
  });

  return { success: true };
}

/**
 * Obtém estado atual do registro
 */
function getRegistrationState(phone) {
  return registrationStates.get(phone);
}

/**
 * Cancela processo de registro
 */
function cancelRegistration(phone) {
  registrationStates.delete(phone);
}

/**
 * Volta para o step anterior
 */
function goBackStep(phone) {
  const state = registrationStates.get(phone);
  if (!state) {
    return { error: 'NO_STATE' };
  }

  if (state.step === 1) {
    // Já está no primeiro step, não pode voltar
    return { error: 'ALREADY_FIRST_STEP', message: 'Você já está no primeiro passo. Envie *CANCELAR* para sair.' };
  }

  // Voltar um step
  state.step = state.step - 1;

  // Limpar dados do step atual dependendo de onde está voltando
  if (state.step === 1) {
    // Voltando para step 1, limpar nome
    state.name = null;
  } else if (state.step === 2) {
    // Voltando para step 2, limpar cargo
    state.role = null;
  } else if (state.step === 3) {
    // Voltando para step 3, limpar categorias
    state.categories = [];
  }

  registrationStates.set(phone, state);

  return { success: true, step: state.step, state };
}

/**
 * Completa o registro e limpa estado
 */
function completeRegistration(phone) {
  registrationStates.delete(phone);
}

/**
 * Processa Step 1: Receber nome
 */
function processStep1(phone, input) {
  const state = registrationStates.get(phone);
  if (!state) return { error: 'NO_STATE' };

  // Validar nome
  const name = input.trim();

  if (name.length < 2) {
    return {
      error: 'INVALID_NAME',
      message: 'Por favor, digite um nome com pelo menos 2 caracteres.'
    };
  }

  if (name.length > 50) {
    return {
      error: 'NAME_TOO_LONG',
      message: 'O nome é muito longo. Por favor, use no máximo 50 caracteres.'
    };
  }

  // Verificar se não é um comando
  if (/^(REGISTER|LOGIN|MENU|HELP|CANCELAR)$/i.test(name)) {
    return {
      error: 'INVALID_NAME',
      message: 'Este não é um nome válido. Por favor, digite seu nome completo.'
    };
  }

  // Salvar nome e avançar para step 2
  state.name = name;
  state.step = 2;
  registrationStates.set(phone, state);

  return { success: true, name };
}

/**
 * Processa Step 2: Escolher cargo
 */
function processStep2(phone, input) {
  const state = registrationStates.get(phone);
  if (!state) return { error: 'NO_STATE' };

  const choice = input.trim();
  let role = null;

  // Aceitar número ou nome do cargo
  if (choice === '1' || /^func/i.test(choice) || /^staff$/i.test(choice)) {
    role = 'staff';
  } else if (choice === '2' || /^gerente/i.test(choice) || /^manager$/i.test(choice)) {
    role = 'manager';
  } else if (choice === '3' || /^supervisor/i.test(choice)) {
    role = 'supervisor';
  } else {
    return {
      error: 'INVALID_ROLE',
      message: 'Por favor, escolha uma opção válida: 1, 2 ou 3'
    };
  }

  // Salvar cargo e avançar para step 3 (categorias)
  state.role = role;
  state.step = 3;
  registrationStates.set(phone, state);
  return { success: true, role };
}

/**
 * Processa Step 3: Escolher categorias
 */
function processStep3(phone, input) {
  const state = registrationStates.get(phone);
  if (!state) return { error: 'NO_STATE' };

  const input_clean = input.trim();

  // Categorias disponíveis
  const categoryMap = {
    '1': 'bar',
    '2': 'restaurante',
    '3': 'padaria',
    '5': 'outro'
  };

  // Processar seleção múltipla (ex: "1,2,3" ou "1 2 3")
  const selections = input_clean.split(/[,\s]+/).filter(s => s.length > 0);
  const categories = [];

  for (const sel of selections) {
    if (categoryMap[sel]) {
      categories.push(categoryMap[sel]);
    } else {
      // Tentar aceitar nome direto da categoria
      const normalized = sel.toLowerCase();
      if (Object.values(categoryMap).includes(normalized)) {
        categories.push(normalized);
      }
    }
  }

  if (categories.length === 0) {
    return {
      error: 'INVALID_CATEGORY',
      message: 'Por favor, escolha pelo menos uma categoria válida (1-6).'
    };
  }

  // Remover duplicatas
  state.categories = [...new Set(categories)];

  // Se for staff, completar registro (não precisa senha)
  if (state.role === 'staff') {
    return { success: true, categories: state.categories, needsPassword: false };
  }

  // Se for admin, avançar para step 4 (senha)
  state.step = 4;
  registrationStates.set(phone, state);
  return { success: true, categories: state.categories, needsPassword: true };
}

/**
 * Processa Step 4: Validar senha (apenas para admin)
 */
function processStep4(phone, password, adminPassword) {
  const state = registrationStates.get(phone);
  if (!state) return { error: 'NO_STATE' };

  const inputPassword = password.trim();

  if (inputPassword !== adminPassword) {
    return {
      error: 'WRONG_PASSWORD',
      message: '🔒 Senha incorreta. Por favor, tente novamente ou entre em contato com seu gerente.'
    };
  }

  return { success: true };
}

/**
 * Limpa todos os estados (útil para testes)
 */
function clearAllStates() {
  registrationStates.clear();
}

module.exports = {
  isInRegistrationProcess,
  checkUserExists,
  startRegistration,
  getRegistrationState,
  cancelRegistration,
  goBackStep,
  completeRegistration,
  processStep1,
  processStep2,
  processStep3,
  processStep4,
  clearAllStates
};
