import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WhitelistEntry {
    @Field(() => Int)
    id!: number;

    @Field(() => String)
    discordID!: string;

    @Field(() => String, { nullable: true })
    discordUser?: string | null;

    @Field(() => String)
    minecraftUser!: string;
}
