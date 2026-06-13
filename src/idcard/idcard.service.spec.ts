import { Test, TestingModule } from '@nestjs/testing';
import { IdcardService } from './idcard.service';

describe('IdcardService', () => {
  let service: IdcardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdcardService],
    }).compile();

    service = module.get<IdcardService>(IdcardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
