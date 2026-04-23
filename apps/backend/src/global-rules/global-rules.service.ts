import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GlobalRule, GlobalRuleDocument } from './global-rule.schema';

@Injectable()
export class GlobalRulesService implements OnModuleInit {
  private readonly logger = new Logger(GlobalRulesService.name);
  private cache: GlobalRuleDocument | null = null;

  constructor(
    @InjectModel(GlobalRule.name) private ruleModel: Model<GlobalRuleDocument>,
  ) {}

  async onModuleInit() {
    // Ensure singleton exists
    let doc = await this.ruleModel.findOne({ key: 'singleton' });
    if (!doc) {
      doc = await this.ruleModel.create({ key: 'singleton' });
      this.logger.log('Global rules document created with defaults');
    }
    this.cache = doc;
    this.logger.log('Global rules loaded into cache');
  }

  async get(): Promise<GlobalRuleDocument> {
    if (!this.cache) {
      this.cache = await this.ruleModel.findOne({ key: 'singleton' });
    }
    return this.cache!;
  }

  async getOne<T = any>(key: string): Promise<T> {
    const rules = await this.get();
    return (rules as any)[key];
  }

  async update(updates: Partial<GlobalRule>): Promise<GlobalRuleDocument> {
    const doc = await this.ruleModel.findOneAndUpdate(
      { key: 'singleton' },
      { $set: updates },
      { returnDocument: 'after', upsert: true },
    );
    this.cache = doc;
    this.logger.log(`Global rules updated: ${Object.keys(updates).join(', ')}`);
    return doc;
  }
}
