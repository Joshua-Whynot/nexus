import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Beer {
    @Field(() => Int)
    id: number;

    @Field()
    @Field(() => String)
    discordID: string;

    @Field(() => String, { nullable: true })
    discordUser?: string | null;

    @Field(() => Int)
    count: number;
}

@ObjectType()
export class BeerStats {
    @Field(() => Int)
    id: number;

    @Field(() => Int)
    total: number;

    @Field(() => String, { nullable: true })
    lastUpdated: string | null;
}
