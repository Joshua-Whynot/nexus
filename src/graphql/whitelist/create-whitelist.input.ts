import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateWhitelistInput {
    @Field()
    @IsString()
    discordID!: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    discordUser?: string;

    @Field()
    @IsString()
    minecraftUser!: string;
}

export default CreateWhitelistInput;
