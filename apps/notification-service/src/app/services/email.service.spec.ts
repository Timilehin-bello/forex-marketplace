import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { LoggerService } from '@forex-marketplace/shared-utils';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let loggerService: jest.Mocked<LoggerService>;
  let mockTransporter: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = process.env;
    
    // Setup mock for nodemailer
    mockTransporter = {
      sendMail: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          messageId: 'mock-message-id',
          envelope: {},
          accepted: ['user@example.com'],
          rejected: [],
          pending: [],
          response: '250 Message accepted',
        });
      }),
    };

    // Mock createTransport to return our mock transporter
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // For development mode, mock the createTestAccount function
    (nodemailer.createTestAccount as jest.Mock).mockResolvedValue({
      user: 'test-user',
      pass: 'test-pass',
    });

    // Mock environment for testing
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      EMAIL_FROM: 'test@forex-platform.com',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send an email successfully', async () => {
      const to = 'user@example.com';
      const subject = 'Test Email';
      const html = '<p>Test Email Content</p>';

      await service.sendEmail(to, subject, html);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: expect.any(String),
        to,
        subject,
        html,
      });
      expect(loggerService.log).toHaveBeenCalled();
    });

    it('should handle errors when sending fails', async () => {
      const to = 'user@example.com';
      const subject = 'Test Email';
      const html = '<p>Test Email Content</p>';

      // Make the sendMail function throw an error
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('Failed to send email'));

      await expect(service.sendEmail(to, subject, html)).rejects.toThrow('Failed to send email');
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('createTransactionEmailContent', () => {
    it('should create deposit email content', () => {
      const content = service.createTransactionEmailContent('CREDIT', 1000, 'USD');
      
      // Instead of checking for exact text, check for patterns
      expect(content).toContain('Transaction Notification');
      expect(content).toContain('1000');
      expect(content).toContain('USD');
      expect(content).toContain('received');
    });

    it('should create withdrawal email content', () => {
      const content = service.createTransactionEmailContent('DEBIT', 500, 'EUR');
      
      // Instead of checking for exact text, check for patterns
      expect(content).toContain('Transaction Notification');
      expect(content).toContain('500');
      expect(content).toContain('EUR');
      expect(content).toContain('sent');
    });
  });

  describe('createOrderEmailContent', () => {
    it('should create buy order email content', () => {
      const content = service.createOrderEmailContent(
        'BUY',
        'COMPLETED',
        'USD',
        'EUR',
        1000,
        850
      );
      
      expect(content).toContain('Order Notification');
      expect(content).toContain('BUY');
      expect(content).toContain('1000');
      expect(content).toContain('USD');
      expect(content).toContain('850');
      expect(content).toContain('EUR');
      expect(content).toContain('completed');
    });

    it('should create sell order email content', () => {
      const content = service.createOrderEmailContent(
        'SELL',
        'COMPLETED',
        'EUR',
        'USD',
        850,
        1000
      );
      
      expect(content).toContain('Order Notification');
      expect(content).toContain('SELL');
      expect(content).toContain('850');
      expect(content).toContain('EUR');
      expect(content).toContain('1000');
      expect(content).toContain('USD');
      expect(content).toContain('completed');
    });

    it('should indicate order status in content', () => {
      const content = service.createOrderEmailContent(
        'BUY',
        'PENDING',
        'USD',
        'EUR',
        1000,
        850
      );
      
      expect(content).toContain('Order Notification');
      expect(content).toContain('BUY');
      expect(content).toContain('pending');
    });
  });

  describe('createWalletEmailContent', () => {
    it('should create wallet creation email content', () => {
      const content = service.createWalletEmailContent('USD', 'CREATED');
      
      expect(content).toContain('Wallet Notification');
      expect(content).toContain('USD');
      expect(content).toContain('created');
    });

    it('should create wallet update email content', () => {
      const content = service.createWalletEmailContent('EUR', 'UPDATED');
      
      expect(content).toContain('Wallet Notification');
      expect(content).toContain('EUR');
      expect(content).toContain('updated');
    });
  });

  describe('initializeTransporter', () => {
    it('should initialize production transporter with SMTP settings', async () => {
      // Set production environment and SMTP settings
      process.env.NODE_ENV = 'production';
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASSWORD = 'password';

      // Reset nodemailer mock to track new calls
      (nodemailer.createTransport as jest.Mock).mockClear();
      
      // Create a new instance which should call initializeTransporter
      const newModule: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: LoggerService,
            useValue: { log: jest.fn(), error: jest.fn() },
          },
        ],
      }).compile();
      
      const newService = newModule.get<EmailService>(EmailService);
      
      // Check if createTransport was called with production settings
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'user',
          pass: 'password',
        },
      });
    });

    it('should initialize development transporter with ethereal', async () => {
      // Set development environment
      process.env.NODE_ENV = 'development';

      // Reset mocks
      (nodemailer.createTransport as jest.Mock).mockClear();
      (nodemailer.createTestAccount as jest.Mock).mockClear();
      
      // Create a new instance which should call initializeTransporter
      const newModule: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: LoggerService,
            useValue: { log: jest.fn(), error: jest.fn() },
          },
        ],
      }).compile();
      
      const newService = newModule.get<EmailService>(EmailService);
      
      // Check if createTestAccount was called for development
      expect(nodemailer.createTestAccount).toHaveBeenCalled();
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: expect.any(Object),
      });
    });
  });
}); 