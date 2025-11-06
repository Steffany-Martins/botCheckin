/**
 * Registration Message Templates
 * Organized and separated for better maintainability
 */

const RegistrationTemplates = {
  /**
   * Step 1: Welcome and ask for name
   */
  step1Welcome() {
    return `👋 *Ola! Bem-vindo ao BotCheckin!*\n\nVejo que você ainda não está cadastrado.\nVamos fazer seu cadastro em *4 passos simples*! 😊\n\n📝 *PASSO 1 de 4*\nPor favor, me diga seu *nome completo*:\n\n💡 _Exemplo: João Silva_\n\n0️⃣ Cancelar cadastro`;
  },

  /**
   * Step 2: Choose role
   */
  step2ChooseRole(name) {
    return `✅ Prazer em conhecê-lo(a), *${name}*!\n\n📝 *PASSO 2 de 4*\nAgora, selecione seu tipo de acesso:\n\n1️⃣ *Funcionário* - Fazer check-in/out\n2️⃣ *Gerente* - Gerenciar horários da equipe\n3️⃣ *Supervisor* - Acompanhar equipe\n\n💡 Envie o número (1, 2 ou 3)\n\n0️⃣ Voltar | 9️⃣ Cancelar cadastro`;
  },

  /**
   * Step 3: Choose categories
   */
  step3ChooseCategories(name, role) {
    const roleText = role === 'manager' ? 'Gerente' : role === 'supervisor' ? 'Supervisor' : 'Funcionário';
    return `🎯 *PASSO 3 de 4*\nÓtimo, ${name}! Agora me diga em qual(is) categoria(s) você trabalha:\n\n1️⃣ Bar 🍺\n2️⃣ Restaurante 🍽️\n3️⃣ Padaria 🥖\n4️⃣ Café ☕\n5️⃣ Lanchonete 🍔\n6️⃣ Outro\n\n💡 _Você pode escolher múltiplas categorias!_\n_Exemplos:_ "1" ou "1,2" ou "1 3 5"\n\n0️⃣ Voltar | 9️⃣ Cancelar cadastro`;
  },

  /**
   * Step 4: Ask for password (admin only)
   */
  step4AskPassword(name, role) {
    const roleText = role === 'manager' ? 'Gerente' : 'Supervisor';
    return `🔐 *PASSO 4 de 4*\nPara cargos administrativos (${roleText}), é necessária uma senha de autorização.\n\nPor favor, *envie a senha* fornecida pela empresa:\n\n💡 _Se você não possui a senha, entre em contato com seu gerente_\n\n0️⃣ Voltar | 9️⃣ Cancelar cadastro`;
  },

  /**
   * Error: Invalid name
   */
  invalidName() {
    return `❌ *Nome inválido*\n\nPor favor, digite um nome válido com pelo menos 2 caracteres.\n\n💡 _Exemplo: Maria Santos_`;
  },

  /**
   * Error: Invalid role
   */
  invalidRole() {
    return `❌ *Opção inválida*\n\nPor favor, escolha uma das opções:\n\n1️⃣ Funcionário\n2️⃣ Gerente\n3️⃣ Supervisor\n\nEnvie apenas o *número* (1, 2 ou 3):`;
  },

  /**
   * Error: Invalid category
   */
  invalidCategory() {
    return `❌ *Categoria inválida*\n\nPor favor, escolha pelo menos uma categoria válida:\n\n1️⃣ Bar\n2️⃣ Restaurante\n3️⃣ Padaria\n4️⃣ Café\n5️⃣ Lanchonete\n6️⃣ Outro\n\n💡 _Pode escolher várias:_ "1,2,3"`;
  },

  /**
   * Error: Wrong password
   */
  wrongPassword() {
    return `🔒 *Senha incorreta*\n\nPor favor, tente novamente ou entre em contato com seu gerente para obter a senha correta.\n\n💡 _Digite a senha ou envie CANCELAR para desistir_`;
  },

  /**
   * User already exists
   */
  userAlreadyExists(name, role) {
    const roleText = role === 'manager' ? 'Gerente' : role === 'supervisor' ? 'Supervisor' : 'Funcionário';
    return `👤 *Ola, ${name}!*\n\n✅ Você já está cadastrado como *${roleText}*!\n\n9️⃣ Ver menu principal`;
  },

  /**
   * Registration cancelled
   */
  cancelled() {
    return `❌ *Cadastro cancelado*\n\nTudo bem! Quando quiser se cadastrar, é só me enviar uma mensagem novamente! 😊`;
  },

  /**
   * Registration expired
   */
  expired() {
    return `⏱️ *Tempo esgotado*\n\nO processo de cadastro expirou por inatividade.\n\nPara começar novamente, envie qualquer mensagem! 😊`;
  }
};

module.exports = RegistrationTemplates;
