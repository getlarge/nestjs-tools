import { ApiProperty } from '@nestjs/swagger';

export class ExampleDto {
  @ApiProperty({
    description: "example's name",
    required: true,
  })
  name: string;

  @ApiProperty({
    description: 'Example has been verified',
    required: true,
  })
  verified: boolean;
}
