import { Test, TestingModule } from '@nestjs/testing';
import { delay } from 'rxjs/operators';

import { ACOptions } from '../src/ac-options.interface';
import { AccessControlModule } from '../src/access-control.module';
import { RULES_BUILDER_TOKEN } from '../src/constants';
import { GrantsController } from '../src/controller/grants.controller';
import { RulesBuilder } from '../src/rules-builder.class';

describe('forRootAsync', () => {
  it('Can create instance with provider method', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AccessControlModule.forRootAsync({
          useFactory: (): RulesBuilder => new RulesBuilder(),
        }),
      ],
    }).compile();

    const rules = module.get(RULES_BUILDER_TOKEN);

    expect(rules).toBeInstanceOf(RulesBuilder);
  });

  it('Can create instance with async provider method', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AccessControlModule.forRootAsync({
          useFactory: async (): Promise<RulesBuilder> => {
            delay(100);
            return new RulesBuilder();
          },
        }),
      ],
    }).compile();

    const rules = module.get(RULES_BUILDER_TOKEN);

    expect(rules).toBeInstanceOf(RulesBuilder);
  });
});

describe('forRoles', () => {
  it('Expose <grantsEndpoint> when options is provided', async () => {
    const rules: RulesBuilder = new RulesBuilder();
    const options: ACOptions = { grantsEndpoint: 'grants' };

    const module: TestingModule = await Test.createTestingModule({
      imports: [AccessControlModule.forRules(rules, options)],
    }).compile();

    const controller = module.get<GrantsController>(GrantsController);

    expect(controller).toBeDefined();
    expect(Reflect.getMetadata('path', GrantsController)).toBe(options.grantsEndpoint);
  });

  it('Do not expose <grantsEndpoint> when options with no <grantsEndpoint> provided', async () => {
    const rules: RulesBuilder = new RulesBuilder();
    const options: ACOptions = {};

    const module: TestingModule = await Test.createTestingModule({
      imports: [AccessControlModule.forRules(rules, options)],
    }).compile();

    expect(() => {
      module.get<GrantsController>(GrantsController);
    }).toThrowError();
  });

  it('Do not expose <grantsEndpoint> when options is not provided', async () => {
    const rules: RulesBuilder = new RulesBuilder();

    const module: TestingModule = await Test.createTestingModule({
      imports: [AccessControlModule.forRules(rules)],
    }).compile();

    expect(() => {
      module.get<GrantsController>(GrantsController);
    }).toThrowError();
  });
});
