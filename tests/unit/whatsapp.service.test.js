const { MessageTemplates, getMenuForRole } = require('../../src/services/whatsapp.service');

describe('WhatsApp Service', () => {
  describe('MessageTemplates', () => {
    describe('welcome', () => {
      it('should generate welcome message for staff', () => {
        const message = MessageTemplates.welcome('John', 'staff');
        expect(message).toContain('John');
        expect(message).toContain('staff');
        expect(message).toContain('Bem-vindo');
      });

      it('should generate welcome message for manager', () => {
        const message = MessageTemplates.welcome('Jane', 'manager');
        expect(message).toContain('Jane');
        expect(message).toContain('manager');
        expect(message).toContain('👔');
      });

      it('should generate welcome message for supervisor', () => {
        const message = MessageTemplates.welcome('Bob', 'supervisor');
        expect(message).toContain('Bob');
        expect(message).toContain('supervisor');
        expect(message).toContain('👨‍💼');
      });
    });

    describe('loginSuccess', () => {
      it('should generate login success message', () => {
        const message = MessageTemplates.loginSuccess('John');
        expect(message).toContain('John');
        expect(message).toContain('Olá novamente');
      });
    });

    describe('logout', () => {
      it('should generate logout message', () => {
        const message = MessageTemplates.logout();
        expect(message).toContain('Até logo');
        expect(message).toContain('MENU');
        expect(message).toContain('LOGIN');
      });
    });

    describe('checkinConfirmation', () => {
      it('should generate check-in confirmation without location', () => {
        const message = MessageTemplates.checkinConfirmation('checkin');
        expect(message).toContain('Check-in');
        expect(message).toContain('🟢');
        expect(message).not.toContain('📍');
      });

      it('should generate break confirmation with location', () => {
        const message = MessageTemplates.checkinConfirmation('break', 'Office');
        expect(message).toContain('Pausa');
        expect(message).toContain('🟡');
        expect(message).toContain('Office');
      });

      it('should generate return confirmation', () => {
        const message = MessageTemplates.checkinConfirmation('return');
        expect(message).toContain('Retorno');
        expect(message).toContain('🔵');
      });

      it('should generate checkout confirmation', () => {
        const message = MessageTemplates.checkinConfirmation('checkout');
        expect(message).toContain('Check-out');
        expect(message).toContain('🔴');
      });
    });

    describe('supervisorNotification', () => {
      it('should generate supervisor notification for check-in', () => {
        const message = MessageTemplates.supervisorNotification(
          'John',
          'checkin',
          '08:00',
          'Downtown'
        );
        expect(message).toContain('John');
        expect(message).toContain('check-in');
        expect(message).toContain('Downtown');
      });

      it('should generate notification without location', () => {
        const message = MessageTemplates.supervisorNotification(
          'Jane',
          'break',
          '12:00',
          null
        );
        expect(message).toContain('Jane');
        expect(message).toContain('pausa');
        expect(message).not.toContain('📍');
      });
    });

    describe('staffMenu', () => {
      it('should generate staff menu', () => {
        const message = MessageTemplates.staffMenu('John');
        expect(message).toContain('John');
        expect(message).toContain('1️⃣');
        expect(message).toContain('Check-in');
        expect(message).toContain('6️⃣');
      });
    });

    describe('managerMenu', () => {
      it('should generate manager menu', () => {
        const message = MessageTemplates.managerMenu('Jane');
        expect(message).toContain('Jane');
        expect(message).toContain('Gerente');
        expect(message).toContain('1️⃣');
        expect(message).toContain('Ver Todos os Horários');
      });
    });

    describe('supervisorMenu', () => {
      it('should generate supervisor menu', () => {
        const message = MessageTemplates.supervisorMenu('Bob');
        expect(message).toContain('Bob');
        expect(message).toContain('Supervisor');
        expect(message).toContain('Equipe');
      });
    });

    describe('userHistory', () => {
      it('should display empty history', () => {
        const message = MessageTemplates.userHistory([]);
        expect(message).toContain('Histórico');
        expect(message).toContain('Nenhum registro');
      });

      it('should display history with records', () => {
        const records = [
          { id: 1, type: 'checkin', timestamp: '2024-01-15T08:00:00', location: null },
          { id: 2, type: 'break', timestamp: '2024-01-15T12:00:00', location: 'Office' }
        ];
        const message = MessageTemplates.userHistory(records);
        expect(message).toContain('Histórico');
        expect(message).toContain('checkin');
        expect(message).toContain('break');
        expect(message).toContain('Office');
      });
    });

    describe('searchResults', () => {
      it('should display empty search results', () => {
        const message = MessageTemplates.searchResults([]);
        expect(message).toContain('Busca');
        expect(message).toContain('Nenhum usuário');
      });

      it('should display search results with users', () => {
        const users = [
          { id: 1, name: 'John Doe', phone: '+15551234567', role: 'staff', active: 1 },
          { id: 2, name: 'Jane Smith', phone: '+15559999999', role: 'manager', active: 1 }
        ];
        const message = MessageTemplates.searchResults(users);
        expect(message).toContain('John Doe');
        expect(message).toContain('Jane Smith');
        expect(message).toContain('staff');
        expect(message).toContain('manager');
      });
    });

    describe('allSchedules', () => {
      it('should display empty schedules', () => {
        const message = MessageTemplates.allSchedules([]);
        expect(message).toContain('Horários');
        expect(message).toContain('Sem dados');
      });

      it('should display schedules with data', () => {
        const groups = [
          {
            user: { id: 1, name: 'John', role: 'staff' },
            checkins: [
              { id: 1, type: 'checkin', timestamp: '2024-01-15T08:00:00', location: null }
            ]
          }
        ];
        const message = MessageTemplates.allSchedules(groups);
        expect(message).toContain('John');
        expect(message).toContain('checkin');
      });
    });

    describe('teamActive', () => {
      it('should display empty team', () => {
        const message = MessageTemplates.teamActive([]);
        expect(message).toContain('Equipe');
        expect(message).toContain('Nenhum membro');
      });

      it('should display active team members', () => {
        const members = [
          { name: 'John', type: 'checkin', last_action: '2024-01-15T08:00:00' },
          { name: 'Jane', type: 'break', last_action: '2024-01-15T12:00:00' }
        ];
        const message = MessageTemplates.teamActive(members);
        expect(message).toContain('John');
        expect(message).toContain('Jane');
        expect(message).toContain('Ativo');
        expect(message).toContain('Em Pausa');
      });
    });

    describe('teamHistory', () => {
      it('should display empty team history', () => {
        const message = MessageTemplates.teamHistory([]);
        expect(message).toContain('Histórico da Equipe');
        expect(message).toContain('Nenhum registro');
      });

      it('should display team history records', () => {
        const records = [
          { name: 'John', type: 'checkin', timestamp: '2024-01-15T08:00:00', location: 'Office' },
          { name: 'Jane', type: 'checkout', timestamp: '2024-01-15T17:00:00', location: null }
        ];
        const message = MessageTemplates.teamHistory(records);
        expect(message).toContain('John');
        expect(message).toContain('Jane');
        expect(message).toContain('Office');
      });
    });

    describe('errors', () => {
      it('should generate noPhone error', () => {
        const message = MessageTemplates.errors.noPhone();
        expect(message).toContain('Erro');
        expect(message).toContain('número');
      });

      it('should generate invalidRole error', () => {
        const message = MessageTemplates.errors.invalidRole();
        expect(message).toContain('Role Inválido');
      });

      it('should generate wrongPassword error', () => {
        const message = MessageTemplates.errors.wrongPassword();
        expect(message).toContain('Senha Incorreta');
      });

      it('should generate adminPasswordRequired error', () => {
        const message = MessageTemplates.errors.adminPasswordRequired();
        expect(message).toContain('Senha de Admin');
      });

      it('should generate unknownCommand error', () => {
        const message = MessageTemplates.errors.unknownCommand();
        expect(message).toContain('Comando Não Reconhecido');
      });

      it('should generate update success message', () => {
        const message = MessageTemplates.errors.updateSuccess(123);
        expect(message).toContain('Atualizado');
        expect(message).toContain('123');
      });

      it('should generate delete success message', () => {
        const message = MessageTemplates.errors.deleteSuccess(456);
        expect(message).toContain('Deletado');
        expect(message).toContain('456');
      });

      it('should generate add success message', () => {
        const message = MessageTemplates.errors.addSuccess(789);
        expect(message).toContain('Adicionado');
        expect(message).toContain('789');
      });
    });
  });

  describe('getMenuForRole', () => {
    it('should return staff menu for staff role', () => {
      const menu = getMenuForRole('staff', 'John');
      expect(menu).toContain('John');
      expect(menu).toContain('Check-in');
    });

    it('should return manager menu for manager role', () => {
      const menu = getMenuForRole('manager', 'Jane');
      expect(menu).toContain('Jane');
      expect(menu).toContain('Gerente');
    });

    it('should return supervisor menu for supervisor role', () => {
      const menu = getMenuForRole('supervisor', 'Bob');
      expect(menu).toContain('Bob');
      expect(menu).toContain('Supervisor');
    });

    it('should default to staff menu for unknown role', () => {
      const menu = getMenuForRole('unknown', 'Test');
      expect(menu).toContain('Test');
      expect(menu).toContain('Check-in');
    });
  });
});
