import { Test, TestingModule } from '@nestjs/testing';
import { IdcardController } from './idcard.controller';
import { IdcardService } from './idcard.service';

describe('IdcardController', () => {
  let controller: IdcardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdcardController],
      providers: [IdcardService],
    }).compile();

    controller = module.get<IdcardController>(IdcardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
