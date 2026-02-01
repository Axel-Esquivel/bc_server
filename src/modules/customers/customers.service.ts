import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { ConfigureCreditDto } from './dto/configure-credit.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreditLine, CreditStatus } from './entities/credit-line.entity';
import { CustomerBalance } from './entities/customer-balance.entity';
import { Customer } from './entities/customer.entity';
import { CustomerTransaction, CustomerTransactionType } from './entities/customer-transaction.entity';

export interface CustomerRecord extends Customer {
  id: string;
}

export interface CreditLineRecord extends CreditLine {
  id: string;
}

export interface CustomerTransactionRecord extends CustomerTransaction {
  id: string;
}

export interface CustomerBalanceRecord extends CustomerBalance {
  id: string;
}

interface CustomersState {
  customers: CustomerRecord[];
  creditLines: CreditLineRecord[];
  transactions: CustomerTransactionRecord[];
  balances: CustomerBalanceRecord[];
}

@Injectable()
export class CustomersService implements OnModuleInit {
  private readonly logger = new Logger(CustomersService.name);
  private readonly stateKey = 'module:customers';
  private customers: CustomerRecord[] = [];
  private creditLines: CreditLineRecord[] = [];
  private transactions: CustomerTransactionRecord[] = [];
  private balances: Map<string, CustomerBalanceRecord> = new Map();

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<CustomersState>(this.stateKey, {
      customers: [],
      creditLines: [],
      transactions: [],
      balances: [],
    });
    this.customers = state.customers ?? [];
    this.creditLines = state.creditLines ?? [];
    this.transactions = state.transactions ?? [];
    this.balances = new Map((state.balances ?? []).map((balance) => [balance.customerId, balance]));
  }

  create(dto: CreateCustomerDto): CustomerRecord {
    const customer: CustomerRecord = {
      id: uuid(),
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      active: dto.active ?? true,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
    };

    this.customers.push(customer);
    this.initializeCredit(customer, dto.companyId, dto.OrganizationId);
    this.persistState();
    return customer;
  }

  findAll(): CustomerRecord[] {
    return [...this.customers];
  }

  findOne(id: string): CustomerRecord {
    const customer = this.customers.find((item) => item.id === id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  update(id: string, dto: UpdateCustomerDto): CustomerRecord {
    const customer = this.findOne(id);
    Object.assign(customer, {
      name: dto.name ?? customer.name,
      email: dto.email ?? customer.email,
      phone: dto.phone ?? customer.phone,
      active: dto.active ?? customer.active,
      OrganizationId: dto.OrganizationId ?? customer.OrganizationId,
      companyId: dto.companyId ?? customer.companyId,
    });
    this.persistState();
    return customer;
  }

  remove(id: string): void {
    const index = this.customers.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('Customer not found');
    }
    this.customers.splice(index, 1);
    this.creditLines.splice(
      0,
      this.creditLines.length,
      ...this.creditLines.filter((line) => line.customerId !== id),
    );
    this.transactions.splice(
      0,
      this.transactions.length,
      ...this.transactions.filter((txn) => txn.customerId !== id),
    );
    this.balances.delete(id);
    this.persistState();
  }

  configureCredit(customerId: string, dto: ConfigureCreditDto): CreditLineRecord {
    const customer = this.findOne(customerId);
    this.ensureTenant(customer.OrganizationId, customer.companyId, dto.OrganizationId, dto.companyId);

    let creditLine = this.creditLines.find((line) => line.customerId === customerId);
    if (!creditLine) {
      creditLine = {
        id: uuid(),
        customerId,
        creditLimit: dto.creditLimit,
        currency: dto.currency ?? 'USD',
        status: dto.status ?? CreditStatus.ACTIVE,
        OrganizationId: dto.OrganizationId,
        companyId: dto.companyId,
      };
      this.creditLines.push(creditLine);
    } else {
      creditLine.creditLimit = dto.creditLimit;
      creditLine.currency = dto.currency ?? creditLine.currency;
      creditLine.status = dto.status ?? creditLine.status;
      creditLine.OrganizationId = dto.OrganizationId;
      creditLine.companyId = dto.companyId;
    }

    this.recalculateBalance(customerId);
    this.persistState();
    return creditLine;
  }

  recordTransaction(customerId: string, dto: CreateTransactionDto): CustomerBalanceRecord {
    const customer = this.findOne(customerId);
    this.ensureTenant(customer.OrganizationId, customer.companyId, dto.OrganizationId, dto.companyId);
    const creditLine = this.getOrCreateCreditLine(customer, dto.OrganizationId, dto.companyId);
    const balance = this.balances.get(customerId) ?? this.initializeCredit(customer, customer.companyId, customer.OrganizationId);

    const transaction: CustomerTransactionRecord = {
      id: uuid(),
      customerId,
      type: dto.type,
      amount: dto.amount,
      description: dto.description,
      reference: dto.reference,
      occurredAt: new Date(),
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
    };

    let newBalance = balance.balance;

    if (dto.type === CustomerTransactionType.CHARGE) {
      if (creditLine.status === CreditStatus.BLOCKED) {
        throw new BadRequestException('Customer credit is blocked');
      }
      newBalance += dto.amount;
      if (newBalance > creditLine.creditLimit) {
        throw new BadRequestException('Credit limit exceeded; sale cannot be completed');
      }
    }

    if (dto.type === CustomerTransactionType.PAYMENT) {
      newBalance -= dto.amount;
    }

    if (dto.type === CustomerTransactionType.ADJUSTMENT) {
      newBalance += dto.amount;
    }

    this.transactions.push(transaction);
    const updatedBalance = this.updateBalance(customerId, newBalance, creditLine);
    this.persistState();
    return updatedBalance;
  }

  listTransactions(customerId: string): CustomerTransactionRecord[] {
    return this.transactions.filter((txn) => txn.customerId === customerId);
  }

  getBalance(customerId: string): CustomerBalanceRecord {
    const balance = this.balances.get(customerId);
    if (!balance) {
      throw new NotFoundException('Customer balance not found');
    }
    return balance;
  }

  getStatement(customerId: string) {
    const customer = this.findOne(customerId);
    const balance = this.getBalance(customerId);
    const transactions = this.listTransactions(customerId);

    return { customer, balance, transactions };
  }

  private initializeCredit(customer: CustomerRecord, companyId: string, OrganizationId: string): CustomerBalanceRecord {
    const creditLine: CreditLineRecord = {
      id: uuid(),
      customerId: customer.id,
      creditLimit: 0,
      currency: 'USD',
      status: CreditStatus.ACTIVE,
      OrganizationId,
      companyId,
    };
    this.creditLines.push(creditLine);
    const balance = this.updateBalance(customer.id, 0, creditLine);
    return balance;
  }

  private recalculateBalance(customerId: string): CustomerBalanceRecord {
    const creditLine = this.creditLines.find((line) => line.customerId === customerId);
    if (!creditLine) {
      throw new NotFoundException('Credit line not found for customer');
    }

    const balance = this.transactions
      .filter((txn) => txn.customerId === customerId)
      .reduce((acc, txn) => {
        if (txn.type === CustomerTransactionType.CHARGE || txn.type === CustomerTransactionType.ADJUSTMENT) {
          return acc + txn.amount;
        }
        if (txn.type === CustomerTransactionType.PAYMENT) {
          return acc - txn.amount;
        }
        return acc;
      }, 0);

    return this.updateBalance(customerId, balance, creditLine);
  }

  private updateBalance(customerId: string, balance: number, creditLine: CreditLineRecord): CustomerBalanceRecord {
    const availableCredit = Math.max(0, creditLine.creditLimit - balance);
    const balanceRecord: CustomerBalanceRecord = {
      id: this.balances.get(customerId)?.id ?? uuid(),
      customerId,
      balance,
      creditLimit: creditLine.creditLimit,
      availableCredit,
      OrganizationId: creditLine.OrganizationId,
      companyId: creditLine.companyId,
    };
    this.balances.set(customerId, balanceRecord);
    return balanceRecord;
  }

  private getOrCreateCreditLine(customer: CustomerRecord, OrganizationId: string, companyId: string): CreditLineRecord {
    let creditLine = this.creditLines.find((line) => line.customerId === customer.id);
    if (!creditLine) {
      creditLine = {
        id: uuid(),
        customerId: customer.id,
        creditLimit: 0,
        currency: 'USD',
        status: CreditStatus.ACTIVE,
        OrganizationId,
        companyId,
      };
      this.creditLines.push(creditLine);
    }
    return creditLine;
  }

  private ensureTenant(existingOrganizationId: string, existingCompanyId: string, OrganizationId?: string, companyId?: string) {
    if (OrganizationId && OrganizationId !== existingOrganizationId) {
      throw new BadRequestException('Organization mismatch');
    }
    if (companyId && companyId !== existingCompanyId) {
      throw new BadRequestException('Company mismatch');
    }
  }

  private persistState() {
    void this.moduleState
      .saveState<CustomersState>(this.stateKey, {
        customers: this.customers,
        creditLines: this.creditLines,
        transactions: this.transactions,
        balances: Array.from(this.balances.values()),
      })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist customers state: ${message}`);
      });
  }
}
