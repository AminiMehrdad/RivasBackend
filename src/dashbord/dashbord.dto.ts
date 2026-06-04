import { ApiProperty } from "@nestjs/swagger";

export class TodayInfoResponseDto {
    @ApiProperty({ example: 1000})
    costs: number

    @ApiProperty({example: "60 min"})
    time: string

    @ApiProperty({ example: 100})
    requsts:number
}