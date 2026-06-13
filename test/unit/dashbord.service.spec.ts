import { describe } from "node:test";
import { DashbordService } from "../../src/dashbord/dashbord.service";
import { RequestRepository } from "../../src/database/Repos/requests.repo";
import { TranscribeRepository } from "../../src/database/Repos/transcribe.repo";

describe("DashbordService", () => {
    let service: DashbordService;
    let requestRepository: jest.Mocked<RequestRepository>;
    let transcribeRepository: jest.Mocked<TranscribeRepository>;

    beforeEach(() => {
        requestRepository = {
            getTodayCostByUserId: jest.fn(),
            getTodayRequestsCountByUserId: jest.fn(),
        } as unknown as jest.Mocked<RequestRepository>; 
        transcribeRepository = {
            getTodayDurationByUserId: jest.fn(),
        } as unknown as jest.Mocked<TranscribeRepository>;

        service = new DashbordService(
            requestRepository,
            transcribeRepository,
        );
    });

    describe("todayInfo", () => {
        it("should return today's info for a user", async () => {
            const userId = "user-1";
            requestRepository.getTodayCostByUserId.mockResolvedValue(100);
            requestRepository.getTodayRequestsCountByUserId.mockResolvedValue(5);
            transcribeRepository.getTodayDurationByUserId.mockResolvedValue(300);

            const result = await service.todayInfo(userId);

            expect(result).toEqual({
                costs: 100,
                time: "5 min",
                requests: 5,
            });
        });
    });
});