const request = require('supertest');
const app = require('../../src/app');

// Mock the database service to avoid real DB operations in tests
jest.mock('../../src/services/database.service', () => {
  const mockDb = {
    prepare: jest.fn(),
    exec: jest.fn()
  };

  return {
    db: mockDb,
    UserDB: {
      findByPhone: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      search: jest.fn(),
      getAllWithCheckins: jest.fn()
    },
    CheckinDB: {
      create: jest.fn(),
      getUserHistory: jest.fn(),
      updateTimestamp: jest.fn(),
      delete: jest.fn()
    },
    SessionDB: {
      isActive: jest.fn(),
      create: jest.fn(),
      delete: jest.fn()
    }
  };
});

// Mock WhatsApp service to avoid real API calls
jest.mock('../../src/services/whatsapp.service', () => {
  const actual = jest.requireActual('../../src/services/whatsapp.service');
  return {
    ...actual,
    sendWhatsAppMessage: jest.fn()
  };
});

const { UserDB, CheckinDB, SessionDB } = require('../../src/services/database.service');
const { sendWhatsAppMessage } = require('../../src/services/whatsapp.service');
const registrationService = require('../../src/services/registration.service');

describe('Webhook Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Limpar estados de registro entre testes
    registrationService.clearAllStates();
  });

  describe('POST /webhook', () => {
    describe('Registration', () => {
      it('should register a new staff user', async () => {
        UserDB.findByPhone.mockReturnValue(null);
        const newUser = { id: 1, name: 'John', phone: '+15551234567', role: 'staff' };
        UserDB.create.mockReturnValue(newUser);

        const response = await request(app)
          .post('/webhook')
          .send({
            Body: 'REGISTER John staff',
            From: 'whatsapp:+15551234567'
          })
          .expect(200)
          .expect('Content-Type', /xml/);

        expect(response.text).toContain('Bem-vindo');
        expect(response.text).toContain('John');
        expect(UserDB.create).toHaveBeenCalledWith('John', '+15551234567', 'staff', null);
        expect(SessionDB.create).toHaveBeenCalled();
      });

      it('should reject manager registration without password', async () => {
        UserDB.findByPhone.mockReturnValue(null);

        const response = await request(app)
          .post('/webhook')
          .send({
            Body: 'REGISTER Jane manager',
            From: 'whatsapp:+15551234567'
          })
          .expect(200);

        expect(response.text).toContain('Senha de Admin');
        expect(UserDB.create).not.toHaveBeenCalled();
      });

      it('should reject invalid role', async () => {
        UserDB.findByPhone.mockReturnValue(null);

        const response = await request(app)
          .post('/webhook')
          .send({
            Body: 'REGISTER John invalid',
            From: 'whatsapp:+15551234567'
          })
          .expect(200);

        expect(response.text).toContain('Role');
        expect(UserDB.create).not.toHaveBeenCalled();
      });
    });

    describe('Check-in Actions', () => {
      it('should record check-in for staff user', async () => {
        const mockUser = { id: 1, name: 'John', phone: '+15551234567', role: 'staff' };
        UserDB.findByPhone.mockReturnValue(mockUser);
        SessionDB.isActive.mockReturnValue(false);
        CheckinDB.create.mockReturnValue(1);

        const response = await request(app)
          .post('/webhook')
          .send({
            Body: '1',
            From: 'whatsapp:+15551234567'
          })
          .expect(200);

        expect(response.text).toContain('Check-in');
        expect(CheckinDB.create).toHaveBeenCalledWith(1, 'checkin', null);
      });

      it('should record break with location', async () => {
        const mockUser = { id: 1, name: 'John', phone: '+15551234567', role: 'staff' };
        UserDB.findByPhone.mockReturnValue(mockUser);
        SessionDB.isActive.mockReturnValue(true);
        CheckinDB.create.mockReturnValue(2);

        const response = await request(app)
          .post('/webhook')
          .send({
            Body: 'BREAK Escritorio',
            From: 'whatsapp:+15551234567'
          })
          .expect(200);

        expect(response.text).toContain('Pausa');
        expect(CheckinDB.create).toHaveBeenCalledWith(1, 'break', 'Escritorio');
      });

      it('should notify supervisor on check-in', async () => {
        const mockUser = {
          id: 1,
          name: 'John',
          phone: '+15551234567',
          role: 'staff',
          supervisor_id: 2
        };
        const mockSupervisor = {
          id: 2,
          name: 'Jane',
          phone: '+15559999999',
          role: 'supervisor'
        };

        UserDB.findByPhone.mockReturnValue(mockUser);
        UserDB.findById.mockReturnValue(mockSupervisor);
        SessionDB.isActive.mockReturnValue(true);
        CheckinDB.create.mockReturnValue(1);

        await request(app)
          .post('/webhook')
          .send({
            Body: 'CHECKIN',
            From: 'whatsapp:+15551234567'
          })
          .expect(200);

        expect(sendWhatsAppMessage).toHaveBeenCalledWith(
          '+15559999999',
          expect.stringContaining('John')
        );
      });
    });

    describe('History and Status', () => {
      it('should return user history', async () => {
        const mockUser = { id: 1, name: 'John', phone: '+15551234567', role: 'staff' };
        UserDB.findByPhone.mockReturnValue(mockUser);
        SessionDB.isActive.mockReturnValue(true);

        const mockHistory = [
          { id: 1, type: 'checkin', timestamp: '2024-01-15T08:00:00', location: null },
          { id: 2, type: 'checkout', timestamp: '2024-01-15T17:00:00', location: null }
        ];
        CheckinDB.getUserHistory.mockReturnValue(mockHistory);

        const response = await request(app)
          .post('/webhook')
          .send({
            Body: '5',
            From: 'whatsapp:+15551234567'
          })
          .expect(200);

        expect(response.text).toContain('Histórico');
        expect(CheckinDB.getUserHistory).toHaveBeenCalledWith(1, expect.any(Number));
      });
    });

    describe('Manager Functions', () => {
      it('should allow manager to search users', async () => {
        const mockManager = { id: 2, name: 'Jane', phone: '+15559999999', role: 'manager' };
        UserDB.findByPhone.mockReturnValue(mockManager);
        SessionDB.isActive.mockReturnValue(true);

        const mockResults = [
          { id: 1, name: 'John Doe', phone: '+15551234567', role: 'staff', active: 1 }
        ];
        UserDB.search.mockReturnValue(mockResults);

        const response = await request(app)
          .post('/webhook')
          .send({
            Body: 'SEARCH John',
            From: 'whatsapp:+15559999999'
          })
          .expect(200);

        expect(response.text).toContain('John Doe');
        expect(UserDB.search).toHaveBeenCalledWith('John', expect.any(Number));
      });

      it('should allow manager to delete checkin', async () => {
        const mockManager = { id: 2, name: 'Jane', phone: '+15559999999', role: 'manager' };
        UserDB.findByPhone.mockReturnValue(mockManager);
        SessionDB.isActive.mockReturnValue(true);
        CheckinDB.delete.mockReturnValue({ changes: 1 });

        const response = await request(app)
          .post('/webhook')
          .send({
            Body: 'DEL 123',
            From: 'whatsapp:+15559999999'
          })
          .expect(200);

        expect(response.text).toContain('Deletado');
        expect(CheckinDB.delete).toHaveBeenCalledWith('123');
      });
    });

    describe('Login/Logout', () => {
      it('should login user with correct password', async () => {
        const mockManager = { id: 2, name: 'Jane', phone: '+15559999999', role: 'manager' };
        UserDB.findByPhone.mockReturnValue(mockManager);

        const response = await request(app)
          .post('/webhook')
          .send({
            Body: `LOGIN ${process.env.ADMIN_PASSWORD || 'admin123'}`,
            From: 'whatsapp:+15559999999'
          })
          .expect(200);

        expect(response.text).toContain('Olá novamente');
        expect(SessionDB.create).toHaveBeenCalled();
      });

      it('should logout user', async () => {
        const mockUser = { id: 1, name: 'John', phone: '+15551234567', role: 'staff' };
        UserDB.findByPhone.mockReturnValue(mockUser);
        SessionDB.isActive.mockReturnValue(true);

        const response = await request(app)
          .post('/webhook')
          .send({
            Body: '6',
            From: 'whatsapp:+15551234567'
          })
          .expect(200);

        expect(response.text).toContain('Até logo');
        expect(SessionDB.delete).toHaveBeenCalledWith('+15551234567');
      });
    });

    describe('Error Handling', () => {
      it('should return error for missing phone number', async () => {
        const response = await request(app)
          .post('/webhook')
          .send({
            Body: 'HELLO'
          })
          .expect(200);

        expect(response.text).toContain('Erro');
      });

      it('should start friendly registration for unregistered user', async () => {
        UserDB.findByPhone.mockReturnValue(null);

        const response = await request(app)
          .post('/webhook')
          .send({
            Body: 'HELLO',
            From: 'whatsapp:+15551234567'
          })
          .expect(200);

        expect(response.text).toContain('Bem-vindo ao BotCheckin');
        expect(response.text).toContain('PASSO 1 de 4');
        expect(response.text).toContain('nome completo');
      });

      it('should return menu for unknown command', async () => {
        const mockUser = { id: 1, name: 'John', phone: '+15551234567', role: 'staff' };
        UserDB.findByPhone.mockReturnValue(mockUser);
        SessionDB.isActive.mockReturnValue(true);

        const response = await request(app)
          .post('/webhook')
          .send({
            Body: 'UNKNOWN',
            From: 'whatsapp:+15551234567'
          })
          .expect(200);

        expect(response.text).toContain('Comando');
      });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
