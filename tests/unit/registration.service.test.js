const registrationService = require('../../src/services/registration.service');

describe('Registration Service', () => {
  beforeEach(() => {
    registrationService.clearAllStates();
  });

  afterEach(() => {
    registrationService.clearAllStates();
  });

  describe('startRegistration', () => {
    it('should start registration process for new user', () => {
      const phone = '+15551234567';

      registrationService.startRegistration(phone);

      expect(registrationService.isInRegistrationProcess(phone)).toBe(true);
      const state = registrationService.getRegistrationState(phone);
      expect(state.step).toBe(1);
      expect(state.phone).toBe(phone);
    });
  });

  describe('processStep1 - Nome', () => {
    beforeEach(() => {
      registrationService.startRegistration('+15551234567');
    });

    it('should accept valid name', () => {
      const result = registrationService.processStep1('+15551234567', 'João Silva');

      expect(result.success).toBe(true);
      expect(result.name).toBe('João Silva');

      const state = registrationService.getRegistrationState('+15551234567');
      expect(state.step).toBe(2);
      expect(state.name).toBe('João Silva');
    });

    it('should reject name with less than 2 characters', () => {
      const result = registrationService.processStep1('+15551234567', 'J');

      expect(result.error).toBe('INVALID_NAME');
      expect(result.message).toContain('pelo menos 2 caracteres');
    });

    it('should reject name with more than 50 characters', () => {
      const longName = 'A'.repeat(51);
      const result = registrationService.processStep1('+15551234567', longName);

      expect(result.error).toBe('NAME_TOO_LONG');
      expect(result.message).toContain('muito longo');
    });

    it('should reject command keywords as names', () => {
      const result = registrationService.processStep1('+15551234567', 'REGISTER');

      expect(result.error).toBe('INVALID_NAME');
      expect(result.message).toContain('não é um nome válido');
    });

    it('should trim whitespace from name', () => {
      const result = registrationService.processStep1('+15551234567', '  Maria Santos  ');

      expect(result.success).toBe(true);
      expect(result.name).toBe('Maria Santos');
    });
  });

  describe('processStep2 - Cargo', () => {
    beforeEach(() => {
      registrationService.startRegistration('+15551234567');
      registrationService.processStep1('+15551234567', 'João Silva');
    });

    it('should accept option 1 (staff)', () => {
      const result = registrationService.processStep2('+15551234567', '1');

      expect(result.success).toBe(true);
      expect(result.role).toBe('staff');

      const state = registrationService.getRegistrationState('+15551234567');
      expect(state.step).toBe(3); // Now goes to step 3 (categories)
      expect(state.role).toBe('staff');
    });

    it('should accept option 2 (manager)', () => {
      const result = registrationService.processStep2('+15551234567', '2');

      expect(result.success).toBe(true);
      expect(result.role).toBe('manager');

      const state = registrationService.getRegistrationState('+15551234567');
      expect(state.step).toBe(3); // Goes to step 3 (categories)
      expect(state.role).toBe('manager');
    });

    it('should accept option 3 (supervisor)', () => {
      const result = registrationService.processStep2('+15551234567', '3');

      expect(result.success).toBe(true);
      expect(result.role).toBe('supervisor');

      const state = registrationService.getRegistrationState('+15551234567');
      expect(state.step).toBe(3);
      expect(state.role).toBe('supervisor');
    });

    it('should accept word "funcionario"', () => {
      const result = registrationService.processStep2('+15551234567', 'funcionario');

      expect(result.success).toBe(true);
      expect(result.role).toBe('staff');
    });

    it('should accept word "gerente"', () => {
      const result = registrationService.processStep2('+15551234567', 'gerente');

      expect(result.success).toBe(true);
      expect(result.role).toBe('manager');
    });

    it('should reject invalid options', () => {
      const result = registrationService.processStep2('+15551234567', '999');

      expect(result.error).toBe('INVALID_ROLE');
      expect(result.message).toContain('opção válida');
    });
  });

  describe('processStep3 - Categorias', () => {
    beforeEach(() => {
      registrationService.startRegistration('+15551234567');
      registrationService.processStep1('+15551234567', 'João Silva');
      registrationService.processStep2('+15551234567', '1'); // Staff
    });

    it('should accept single category', () => {
      const result = registrationService.processStep3('+15551234567', '1');

      expect(result.success).toBe(true);
      expect(result.categories).toEqual(['bar']);
      expect(result.needsPassword).toBe(false); // Staff doesn't need password

      const state = registrationService.getRegistrationState('+15551234567');
      expect(state.categories).toEqual(['bar']);
    });

    it('should accept multiple categories', () => {
      const result = registrationService.processStep3('+15551234567', '1,2,3');

      expect(result.success).toBe(true);
      expect(result.categories).toContain('bar');
      expect(result.categories).toContain('restaurante');
      expect(result.categories).toContain('padaria');
      expect(result.needsPassword).toBe(false);
    });

    it('should accept categories with spaces', () => {
      const result = registrationService.processStep3('+15551234567', '1 2 3');

      expect(result.success).toBe(true);
      expect(result.categories.length).toBe(3);
    });

    it('should require password for manager role', () => {
      registrationService.clearAllStates();
      registrationService.startRegistration('+15551234567');
      registrationService.processStep1('+15551234567', 'Jane Manager');
      registrationService.processStep2('+15551234567', '2'); // Manager

      const result = registrationService.processStep3('+15551234567', '1,2');

      expect(result.success).toBe(true);
      expect(result.needsPassword).toBe(true);

      const state = registrationService.getRegistrationState('+15551234567');
      expect(state.step).toBe(4); // Advances to password step
    });

    it('should reject invalid category', () => {
      const result = registrationService.processStep3('+15551234567', '999');

      expect(result.error).toBe('INVALID_CATEGORY');
      expect(result.message).toContain('categoria válida');
    });

    it('should remove duplicate categories', () => {
      const result = registrationService.processStep3('+15551234567', '1,1,2,2');

      expect(result.success).toBe(true);
      expect(result.categories.length).toBe(2); // Only unique values
    });
  });

  describe('processStep4 - Senha', () => {
    beforeEach(() => {
      registrationService.startRegistration('+15551234567');
      registrationService.processStep1('+15551234567', 'João Silva');
      registrationService.processStep2('+15551234567', '2'); // Manager
      registrationService.processStep3('+15551234567', '1,2'); // Categories
    });

    it('should accept correct password', () => {
      const result = registrationService.processStep4('+15551234567', 'admin123', 'admin123');

      expect(result.success).toBe(true);
    });

    it('should reject incorrect password', () => {
      const result = registrationService.processStep4('+15551234567', 'wrongpass', 'admin123');

      expect(result.error).toBe('WRONG_PASSWORD');
      expect(result.message).toContain('incorreta');
    });

    it('should trim whitespace from password', () => {
      const result = registrationService.processStep4('+15551234567', '  admin123  ', 'admin123');

      expect(result.success).toBe(true);
    });
  });

  describe('cancelRegistration', () => {
    it('should cancel registration and remove state', () => {
      const phone = '+15551234567';
      registrationService.startRegistration(phone);

      expect(registrationService.isInRegistrationProcess(phone)).toBe(true);

      registrationService.cancelRegistration(phone);

      expect(registrationService.isInRegistrationProcess(phone)).toBe(false);
    });
  });

  describe('completeRegistration', () => {
    it('should complete registration and remove state', () => {
      const phone = '+15551234567';
      registrationService.startRegistration(phone);

      registrationService.completeRegistration(phone);

      expect(registrationService.isInRegistrationProcess(phone)).toBe(false);
    });
  });

  describe('Full registration flow', () => {
    it('should complete staff registration flow (4 steps)', () => {
      const phone = '+15551234567';

      // Step 1: Start
      registrationService.startRegistration(phone);
      expect(registrationService.getRegistrationState(phone).step).toBe(1);

      // Step 2: Nome
      registrationService.processStep1(phone, 'João Silva');
      expect(registrationService.getRegistrationState(phone).step).toBe(2);

      // Step 3: Cargo
      registrationService.processStep2(phone, '1'); // Staff
      expect(registrationService.getRegistrationState(phone).step).toBe(3);

      // Step 4: Categorias (staff não precisa senha depois disso)
      const result = registrationService.processStep3(phone, '1,2');
      expect(result.success).toBe(true);
      expect(result.needsPassword).toBe(false);
      expect(result.categories).toEqual(['bar', 'restaurante']);
    });

    it('should complete manager registration flow (5 steps total)', () => {
      const phone = '+15551234567';

      // Step 1: Start
      registrationService.startRegistration(phone);

      // Step 2: Nome
      registrationService.processStep1(phone, 'Jane Manager');
      expect(registrationService.getRegistrationState(phone).step).toBe(2);

      // Step 3: Cargo
      const roleResult = registrationService.processStep2(phone, '2'); // Manager
      expect(roleResult.success).toBe(true);
      expect(registrationService.getRegistrationState(phone).step).toBe(3);

      // Step 4: Categorias
      const categoryResult = registrationService.processStep3(phone, '2,3');
      expect(categoryResult.success).toBe(true);
      expect(categoryResult.needsPassword).toBe(true);
      expect(registrationService.getRegistrationState(phone).step).toBe(4);

      // Step 5: Senha
      const passwordResult = registrationService.processStep4(phone, 'admin123', 'admin123');
      expect(passwordResult.success).toBe(true);
    });
  });
});
