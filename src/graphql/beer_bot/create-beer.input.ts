import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateBeerInput {
    @Field()
    @IsString()
    discordID: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    discordUser?: string;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    count?: number;
}

export default CreateBeerInput;
