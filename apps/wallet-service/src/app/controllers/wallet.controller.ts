import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { WalletService } from '../services/wallet.service';
import { CreateWalletDto } from '../dtos/create-wallet.dto';
import { WalletTransactionDto } from '../dtos/transaction.dto';
import { JwtAuthGuard } from '@forex-marketplace/auth';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
    return this.walletService.createWallet(createWalletDto);
  }

  @Get(':id')
  async getWalletById(@Param('id') id: string) {
    return this.walletService.getWalletById(id);
  }

  @Get('user/:userId')
  async getWalletsByUserId(@Param('userId') userId: string) {
    return this.walletService.getWalletsByUserId(userId);
  }

  @Get('user/:userId/currency/:currency')
  async getWalletByUserIdAndCurrency(
    @Param('userId') userId: string,
    @Param('currency') currency: string
  ) {
    return this.walletService.getWalletByUserIdAndCurrency(userId, currency);
  }

  @Post('transaction')
  async processTransaction(@Body() transactionDto: WalletTransactionDto) {
    return this.walletService.processTransaction(transactionDto);
  }

  @Get(':walletId/transactions')
  async getTransactionsByWalletId(@Param('walletId') walletId: string) {
    return this.walletService.getTransactionsByWalletId(walletId);
  }
}
