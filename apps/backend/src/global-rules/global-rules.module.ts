import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GlobalRule, GlobalRuleSchema } from './global-rule.schema';
import { GlobalRulesService } from './global-rules.service';
import { GlobalRulesController } from './global-rules.controller';

@Global()  // Makes GlobalRulesService injectable everywhere without re-importing
@Module({
  imports: [MongooseModule.forFeature([{ name: GlobalRule.name, schema: GlobalRuleSchema }])],
  providers: [GlobalRulesService],
  controllers: [GlobalRulesController],
  exports: [GlobalRulesService],
})
export class GlobalRulesModule {}
