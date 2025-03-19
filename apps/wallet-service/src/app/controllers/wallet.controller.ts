import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { WalletService } from '../services/wallet.service';
import { CreateWalletDto } from '../dtos/create-wallet.dto';
import { WalletTransactionDto } from '../dtos/transaction.dto';
import {
  JwtAuthGuard,
  CurrentUser,
  AuthorizationService,
} from '@forex-marketplace/auth';
import { v4 as uuidv4 } from 'uuid';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly authService: AuthorizationService
  ) {}

  @Post()
  async createWallet(
    @Body() createWalletDto: CreateWalletDto,
    @CurrentUser() user
  ) {
    // Ensure wallet is created for the current user only
    createWalletDto.userId = user.id;
    return this.walletService.createWallet(createWalletDto);
  }

  @Get(':id')
  async getWalletById(@Param('id') id: string, @CurrentUser() user) {
    const wallet = await this.walletService.getWalletById(id);

    // Check if the wallet belongs to the current user
    if (wallet) {
      this.authService.ensureOwnerOrAdmin(
        wallet.userId,
        user,
        'You are not authorized to access this wallet'
      );
    }

    return wallet;
  }

  @Get('user/:userId')
  async getWalletsByUserId(
    @Param('userId') userId: string,
    @CurrentUser() user,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    // Only allow users to access their own wallets unless they're an admin
    this.authService.ensureOwnerOrAdmin(
      userId,
      user,
      'You are not authorized to access wallets for this user'
    );

    return this.walletService.getWalletsByUserId(
      userId,
      page ? parseInt(String(page)) : 1,
      limit ? parseInt(String(limit)) : 10
    );
  }

  @Get('user/:userId/currency/:currency')
  async getWalletByUserIdAndCurrency(
    @Param('userId') userId: string,
    @Param('currency') currency: string,
    @CurrentUser() user
  ) {
    // Only allow users to access their own wallets unless they're an admin
    this.authService.ensureOwnerOrAdmin(
      userId,
      user,
      'You are not authorized to access wallets for this user'
    );

    return this.walletService.getWalletByUserIdAndCurrency(userId, currency);
  }

  @Post('transaction')
  async processTransaction(
    @Body() transactionDto: WalletTransactionDto,
    @CurrentUser() user
  ) {
    // First verify the wallet belongs to the current user
    const wallet = await this.walletService.getWalletById(
      transactionDto.walletId
    );

    if (wallet) {
      this.authService.ensureOwnerOrAdmin(
        wallet.userId,
        user,
        'You are not authorized to perform transactions on this wallet'
      );
    }

    // Generate referenceId if not provided
    if (!transactionDto.referenceId) {
      if (transactionDto.type === 'CREDIT') {
        transactionDto.referenceId = `DEP-${uuidv4()}`;
      } else if (transactionDto.type === 'DEBIT') {
        transactionDto.referenceId = `WDR-${uuidv4()}`;
      }
    }

    return this.walletService.processTransaction(transactionDto);
  }

  @Get(':walletId/transactions')
  async getTransactionsByWalletId(
    @Param('walletId') walletId: string,
    @CurrentUser() user,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    // First verify the wallet belongs to the current user
    const wallet = await this.walletService.getWalletById(walletId);

    if (wallet) {
      this.authService.ensureOwnerOrAdmin(
        wallet.userId,
        user,
        'You are not authorized to access transactions for this wallet'
      );
    }

    return this.walletService.getTransactionsByWalletId(
      walletId,
      page ? parseInt(String(page)) : 1,
      limit ? parseInt(String(limit)) : 10
    );
  }
}
