const authService = require('../../src/services/auth.service');
const config = require('../../src/config/env');

// Mock the database service
jest.mock('../../src/services/database.service', () => ({
  UserDB: {
    create: jest.fn(),
    findById: jest.fn(),
    findByPhone: jest.fn()
  },
  SessionDB: {
    isActive: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
  }
}));

const { UserDB, SessionDB } = require('../../src/services/database.service');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAdminPassword', () => {
    it('should validate correct admin password', () => {
      const result = authService.validateAdminPassword(config.adminPassword);
      expect(result).toBe(true);
    });

    it('should reject incorrect admin password', () => {
      const result = authService.validateAdminPassword('wrongpassword');
      expect(result).toBe(false);
    });
  });

  describe('isUserLoggedIn', () => {
    it('should return true if session is active', () => {
      SessionDB.isActive.mockReturnValue(true);
      const result = authService.isUserLoggedIn('+15551234567');
      expect(result).toBe(true);
      expect(SessionDB.isActive).toHaveBeenCalledWith('+15551234567');
    });

    it('should return false if session is not active', () => {
      SessionDB.isActive.mockReturnValue(false);
      const result = authService.isUserLoggedIn('+15551234567');
      expect(result).toBe(false);
    });
  });

  describe('loginUser', () => {
    it('should login staff user without password', () => {
      const user = { id: 1, role: 'staff', name: 'John' };
      const result = authService.loginUser(user, '+15551234567');

      expect(result.success).toBe(true);
      expect(SessionDB.create).toHaveBeenCalledWith(1, '+15551234567');
    });

    it('should login manager with correct password', () => {
      const user = { id: 2, role: 'manager', name: 'Jane' };
      const result = authService.loginUser(user, '+15551234567', config.adminPassword);

      expect(result.success).toBe(true);
      expect(SessionDB.create).toHaveBeenCalledWith(2, '+15551234567');
    });

    it('should reject manager with wrong password', () => {
      const user = { id: 2, role: 'manager', name: 'Jane' };
      const result = authService.loginUser(user, '+15551234567', 'wrongpass');

      expect(result.success).toBe(false);
      expect(result.error).toBe('WRONG_PASSWORD');
      expect(SessionDB.create).not.toHaveBeenCalled();
    });
  });

  describe('registerUser', () => {
    it('should register staff user without password', () => {
      const mockUser = { id: 1, name: 'John', phone: '+15551234567', role: 'staff' };
      UserDB.create.mockReturnValue(mockUser);

      const result = authService.registerUser('John', '+15551234567', 'staff');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(UserDB.create).toHaveBeenCalledWith('John', '+15551234567', 'staff', null);
      expect(SessionDB.create).toHaveBeenCalledWith(1, '+15551234567');
    });

    it('should reject invalid role', () => {
      const result = authService.registerUser('John', '+15551234567', 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_ROLE');
      expect(UserDB.create).not.toHaveBeenCalled();
    });

    it('should register manager with correct password', () => {
      const mockUser = { id: 2, name: 'Jane', phone: '+15551234567', role: 'manager' };
      UserDB.create.mockReturnValue(mockUser);

      const result = authService.registerUser('Jane', '+15551234567', 'manager', config.adminPassword);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('should reject manager registration without password', () => {
      const result = authService.registerUser('Jane', '+15551234567', 'manager');

      expect(result.success).toBe(false);
      expect(result.error).toBe('ADMIN_PASSWORD_REQUIRED');
      expect(UserDB.create).not.toHaveBeenCalled();
    });
  });

  describe('logoutUser', () => {
    it('should delete session for user', () => {
      authService.logoutUser('+15551234567');
      expect(SessionDB.delete).toHaveBeenCalledWith('+15551234567');
    });
  });

  describe('autoLoginStaff', () => {
    it('should auto-login staff user if not logged in', () => {
      const user = { id: 1, role: 'staff' };
      SessionDB.isActive.mockReturnValue(false);

      authService.autoLoginStaff(user, '+15551234567');

      expect(SessionDB.create).toHaveBeenCalledWith(1, '+15551234567');
    });

    it('should not auto-login staff if already logged in', () => {
      const user = { id: 1, role: 'staff' };
      SessionDB.isActive.mockReturnValue(true);

      authService.autoLoginStaff(user, '+15551234567');

      expect(SessionDB.create).not.toHaveBeenCalled();
    });

    it('should not auto-login non-staff users', () => {
      const user = { id: 2, role: 'manager' };
      SessionDB.isActive.mockReturnValue(false);

      authService.autoLoginStaff(user, '+15551234567');

      expect(SessionDB.create).not.toHaveBeenCalled();
    });
  });
});
