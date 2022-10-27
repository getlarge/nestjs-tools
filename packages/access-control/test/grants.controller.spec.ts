import { PATH_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';

import { RULES_BUILDER_TOKEN } from '../src/constants';
import { GrantsController } from '../src/controller/grants.controller';
import { RulesBuilder } from '../src/rules-builder.class';

describe('Grants Controller #getGrants', () => {
  let controller: GrantsController;
  const roles: RulesBuilder = new RulesBuilder();

  beforeEach(async () => {
    Reflect.defineMetadata(PATH_METADATA, 'grants', GrantsController);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GrantsController],
      providers: [
        {
          provide: RULES_BUILDER_TOKEN,
          useValue: roles,
        },
      ],
    }).compile();

    controller = module.get<GrantsController>(GrantsController);
  });

  it('should return grants provided', () => {
    expect(controller.getGrants()).toBe(roles.getGrants());
  });
});
