const checkinService = require('../../src/services/checkin.service');

// Mock dependencies
jest.mock('../../src/services/database.service', () => ({
  UserDB: {
    findById: jest.fn()
  },
  CheckinDB: {
    create: jest.fn(),
    getUserHistory: jest.fn(),
    updateTimestamp: jest.fn(),
    delete: jest.fn(),
    createManual: jest.fn()
  }
}));

jest.mock('../../src/services/whatsapp.service', () => ({
  sendWhatsAppMessage: jest.fn(),
  MessageTemplates: {
    supervisorNotification: jest.fn((name, action, time, loc) =>
      `Notification: ${name} ${action} at ${time}`)
  }
}));

const { UserDB, CheckinDB } = require('../../src/services/database.service');
const { sendWhatsAppMessage } = require('../../src/services/whatsapp.service');

describe('Checkin Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordCheckin', () => {
    it('should record checkin without supervisor notification', async () => {
      const user = { id: 1, name: 'John', supervisor_id: null };
      CheckinDB.create.mockReturnValue(123);

      const result = await checkinService.recordCheckin(user, 'checkin', null);

      expect(result).toBe(123);
      expect(CheckinDB.create).toHaveBeenCalledWith(1, 'checkin', null);
      expect(UserDB.findById).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it('should record checkin with location', async () => {
      const user = { id: 1, name: 'John', supervisor_id: null };
      CheckinDB.create.mockReturnValue(124);

      const result = await checkinService.recordCheckin(user, 'break', 'Office');

      expect(result).toBe(124);
      expect(CheckinDB.create).toHaveBeenCalledWith(1, 'break', 'Office');
    });

    it('should notify supervisor when present', async () => {
      const user = { id: 1, name: 'John', supervisor_id: 2 };
      const supervisor = { id: 2, name: 'Jane', phone: '+15559999999' };

      CheckinDB.create.mockReturnValue(125);
      UserDB.findById.mockReturnValue(supervisor);

      const result = await checkinService.recordCheckin(user, 'checkin', 'Downtown');

      expect(result).toBe(125);
      expect(UserDB.findById).toHaveBeenCalledWith(2);
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(
        '+15559999999',
        expect.stringContaining('John')
      );
    });

    it('should not notify if supervisor not found', async () => {
      const user = { id: 1, name: 'John', supervisor_id: 2 };

      CheckinDB.create.mockReturnValue(126);
      UserDB.findById.mockReturnValue(null);

      const result = await checkinService.recordCheckin(user, 'checkout', null);

      expect(result).toBe(126);
      expect(UserDB.findById).toHaveBeenCalledWith(2);
      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    });
  });

  describe('getUserHistory', () => {
    it('should get user history with default limit', () => {
      const mockHistory = [
        { id: 1, type: 'checkin', timestamp: '2024-01-15T08:00:00' },
        { id: 2, type: 'checkout', timestamp: '2024-01-15T17:00:00' }
      ];
      CheckinDB.getUserHistory.mockReturnValue(mockHistory);

      const result = checkinService.getUserHistory(1);

      expect(result).toEqual(mockHistory);
      expect(CheckinDB.getUserHistory).toHaveBeenCalledWith(1, 10);
    });

    it('should get user history with custom limit', () => {
      CheckinDB.getUserHistory.mockReturnValue([]);

      const result = checkinService.getUserHistory(1, 20);

      expect(result).toEqual([]);
      expect(CheckinDB.getUserHistory).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('updateCheckinTime', () => {
    it('should update checkin timestamp successfully', () => {
      CheckinDB.updateTimestamp.mockReturnValue({ changes: 1 });

      const result = checkinService.updateCheckinTime(123, '2024-01-15T09:00:00');

      expect(result.success).toBe(true);
      expect(CheckinDB.updateTimestamp).toHaveBeenCalledWith(123, '2024-01-15T09:00:00');
    });

    it('should return failure when checkin not found', () => {
      CheckinDB.updateTimestamp.mockReturnValue({ changes: 0 });

      const result = checkinService.updateCheckinTime(999, '2024-01-15T09:00:00');

      expect(result.success).toBe(false);
    });

    it('should handle errors gracefully', () => {
      CheckinDB.updateTimestamp.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = checkinService.updateCheckinTime(123, 'invalid-date');

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_FORMAT');
    });
  });

  describe('deleteCheckin', () => {
    it('should delete checkin successfully', () => {
      CheckinDB.delete.mockReturnValue({ changes: 1 });

      const result = checkinService.deleteCheckin(123);

      expect(result.success).toBe(true);
      expect(CheckinDB.delete).toHaveBeenCalledWith(123);
    });

    it('should return failure when checkin not found', () => {
      CheckinDB.delete.mockReturnValue({ changes: 0 });

      const result = checkinService.deleteCheckin(999);

      expect(result.success).toBe(false);
    });
  });

  describe('addManualCheckin', () => {
    it('should add manual checkin successfully', () => {
      CheckinDB.createManual.mockReturnValue({ lastInsertRowid: 200 });

      const result = checkinService.addManualCheckin(
        1,
        'checkin',
        '2024-01-15T08:00:00',
        'Office'
      );

      expect(result.success).toBe(true);
      expect(CheckinDB.createManual).toHaveBeenCalledWith(
        1,
        'checkin',
        '2024-01-15T08:00:00',
        'Office'
      );
    });

    it('should handle errors when adding manual checkin', () => {
      CheckinDB.createManual.mockImplementation(() => {
        throw new Error('Invalid data');
      });

      const result = checkinService.addManualCheckin(
        1,
        'invalid',
        'bad-date',
        null
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_DATA');
    });
  });
});
